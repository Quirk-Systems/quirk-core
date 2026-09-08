import { describe, expect, it } from "vitest";

import { evaluateBoundary } from "../src/boundary";
import {
  ADMISSION_EVIDENCE_API_VERSION,
  ADMISSION_EVIDENCE_CONTENT_TYPE,
  ADMISSION_EVIDENCE_KIND,
  BOUNDARY_API_VERSION,
  BOUNDARY_REQUEST_KIND,
  REQUIRED_ADMISSION_GATES,
  type AdmissionBoundaryRequest,
  type AdmissionEvidenceEnvelope,
  type AdmissionEvidencePayload,
  type AdmissionTrustStore,
  type TargetStatus,
} from "../src/contracts";

const SUBJECT_DIGEST = `sha256:${"a".repeat(64)}`;
const NOW = new Date("2026-08-11T12:00:00.000Z");

function requestFor(
  requestedStatus: TargetStatus,
  operation: "shadow_evaluate" | "request_admission",
): AdmissionBoundaryRequest {
  return {
    api_version: BOUNDARY_API_VERSION,
    kind: BOUNDARY_REQUEST_KIND,
    request_id: `request.${requestedStatus.toLowerCase()}`,
    subject_ref: "doctrine.classification.anti_limiting@0.1.0",
    subject_digest: SUBJECT_DIGEST,
    current_status: "Candidate",
    requested_status: requestedStatus,
    operation,
    resolution: "determinate",
  };
}

function payloadFor(
  request: AdmissionBoundaryRequest,
): AdmissionEvidencePayload {
  if (request.requested_status === "Candidate") {
    throw new Error("candidate status does not accept admission evidence");
  }

  return {
    api_version: ADMISSION_EVIDENCE_API_VERSION,
    kind: ADMISSION_EVIDENCE_KIND,
    decision: {
      decision_id: "admission.decision.alr-0.1.0",
      revision: 1,
      subject_ref: request.subject_ref,
      subject_digest: request.subject_digest,
      from_status: "Candidate",
      requested_status: request.requested_status,
      outcome: "approve",
      recorded_at: "2026-08-11T11:00:00.000Z",
      valid_from: "2026-08-11T11:00:00.000Z",
      expires_at: "2026-08-11T13:00:00.000Z",
      granting_authority_ref: "authority.quirk_admission_board",
      separation_of_authority_evidence_ref: "evidence.separation.001",
      admission_procedure_ref: "procedure.admission.v1",
      rollback_plan_ref: "rollback.alr.0.1.0",
    },
    gates: REQUIRED_ADMISSION_GATES.map((gateId) => ({
      gate_id: gateId,
      outcome: "pass",
      evidence_refs: [`evidence.${gateId}.001`],
      decided_by_authority_ref: `authority.gate.${gateId}`,
    })),
  };
}

function base64Url(value: Uint8Array): string {
  let binary = "";
  for (const byte of value) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/gu, "-").replace(/\//gu, "_").replace(/=+$/u, "");
}

function hex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function testSigner(): Promise<{
  privateKey: CryptoKey;
  publicJwk: JsonWebKey;
}> {
  const generated = await crypto.subtle.generateKey(
    { name: "Ed25519" },
    true,
    ["sign", "verify"],
  );
  if (!("privateKey" in generated) || !("publicKey" in generated)) {
    throw new Error("expected an asymmetric key pair");
  }

  const publicJwk = await crypto.subtle.exportKey("jwk", generated.publicKey);
  if (publicJwk instanceof ArrayBuffer) {
    throw new Error("expected a JWK export");
  }

  return {
    privateKey: generated.privateKey,
    publicJwk,
  };
}

async function signPayload(
  payload: AdmissionEvidencePayload,
  privateKey: CryptoKey,
): Promise<AdmissionEvidenceEnvelope> {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  const signature = await crypto.subtle.sign(
    { name: "Ed25519" },
    privateKey,
    bytes,
  );
  const digest = await crypto.subtle.digest("SHA-256", bytes);

  return {
    content_type: ADMISSION_EVIDENCE_CONTENT_TYPE,
    signed_payload_base64url: base64Url(bytes),
    signed_payload_sha256: `sha256:${hex(digest)}`,
    signature: {
      algorithm: "Ed25519",
      key_id: "key.test.admission",
      value_base64url: base64Url(new Uint8Array(signature)),
    },
  };
}

describe("candidate-only admission boundary", () => {
  it("permits shadow evaluation while granting no authority", async () => {
    const result = await evaluateBoundary(
      requestFor("Candidate", "shadow_evaluate"),
      {},
      NOW,
    );

    expect(result.http_status).toBe(200);
    expect(result.decision).toBe("permit_candidate_scope");
    expect(result.authority_granted).toBe(false);
    expect(result.operational_effects_permitted).toBe(false);
    expect(result.blocker_codes).toContain("CANDIDATE_HAS_NO_OPERATIONAL_AUTHORITY");
  });

  it("rejects Live activation without signed typed evidence", async () => {
    const result = await evaluateBoundary(
      requestFor("Live", "request_admission"),
      {},
      NOW,
    );

    expect(result.http_status).toBe(403);
    expect(result.decision).toBe("reject");
    expect(result.blocker_codes).toEqual(["SIGNED_TYPED_ADMISSION_EVIDENCE_REQUIRED"]);
  });

  it("routes explicit ambiguity to a typed Proposed Move", async () => {
    const request = requestFor("Canonical", "request_admission");
    request.resolution = "ambiguous";

    const result = await evaluateBoundary(request, {}, NOW);

    expect(result.http_status).toBe(409);
    expect(result.decision).toBe("abstain");
    expect(result.proposed_move?.kind).toBe("ProposedMove");
    expect(result.proposed_move?.spec.authority_required).toBe(true);
    expect(result.proposed_move?.spec.operational_effects_permitted).toBe(false);
  });

  it("rejects a signature from an unknown trust root", async () => {
    const request = requestFor("Canonical", "request_admission");
    const signer = await testSigner();
    request.admission_evidence = await signPayload(payloadFor(request), signer.privateKey);

    const result = await evaluateBoundary(request, {}, NOW);

    expect(result.http_status).toBe(403);
    expect(result.blocker_codes).toEqual(["SIGNING_KEY_NOT_TRUSTED"]);
    expect(result.authority_granted).toBe(false);
  });

  it("rejects a tampered signature", async () => {
    const request = requestFor("Canonical", "request_admission");
    const signer = await testSigner();
    const evidence = await signPayload(payloadFor(request), signer.privateKey);
    const first = evidence.signature.value_base64url[0];
    if (first === undefined) {
      throw new Error("signature unexpectedly empty");
    }
    evidence.signature.value_base64url =
      (first === "A" ? "B" : "A") + evidence.signature.value_base64url.slice(1);
    request.admission_evidence = evidence;
    const trust: AdmissionTrustStore = {
      "key.test.admission": signer.publicJwk,
    };

    const result = await evaluateBoundary(request, trust, NOW);

    expect(result.http_status).toBe(403);
    expect(result.blocker_codes).toEqual(["SIGNATURE_INVALID"]);
  });

  it("rejects signed evidence missing any required gate", async () => {
    const request = requestFor("Canonical", "request_admission");
    const signer = await testSigner();
    const payload = payloadFor(request);
    payload.gates = payload.gates.slice(1);
    request.admission_evidence = await signPayload(payload, signer.privateKey);
    const trust: AdmissionTrustStore = {
      "key.test.admission": signer.publicJwk,
    };

    const result = await evaluateBoundary(request, trust, NOW);

    expect(result.http_status).toBe(403);
    expect(result.blocker_codes).toEqual(["REQUIRED_ADMISSION_GATES_INCOMPLETE"]);
  });

  it("rejects signed evidence for a different subject", async () => {
    const request = requestFor("Canonical", "request_admission");
    const signer = await testSigner();
    const payload = payloadFor(request);
    payload.decision.subject_ref = "doctrine.someone.else@1.0.0";
    request.admission_evidence = await signPayload(payload, signer.privateKey);
    const trust: AdmissionTrustStore = {
      "key.test.admission": signer.publicJwk,
    };

    const result = await evaluateBoundary(request, trust, NOW);

    expect(result.http_status).toBe(403);
    expect(result.blocker_codes).toEqual(["SIGNED_DECISION_REQUEST_MISMATCH"]);
  });

  it("never promotes even fully typed, trusted, valid evidence", async () => {
    const request = requestFor("Canonical", "request_admission");
    const signer = await testSigner();
    request.admission_evidence = await signPayload(payloadFor(request), signer.privateKey);
    const trust: AdmissionTrustStore = {
      "key.test.admission": signer.publicJwk,
    };

    const result = await evaluateBoundary(request, trust, NOW);

    expect(result.http_status).toBe(409);
    expect(result.decision).toBe("abstain");
    expect(result.evidence_integrity_verified).toBe(true);
    expect(result.authority_granted).toBe(false);
    expect(result.operational_effects_permitted).toBe(false);
    expect(result.blocker_codes).toContain("SIGNED_EVIDENCE_IS_NOT_AUTHORITY");
    expect(result.proposed_move?.spec.reason_code).toBe(
      "submit_verified_evidence_to_authoritative_admission",
    );
  });
});

import {
  ADMISSION_EVIDENCE_API_VERSION,
  ADMISSION_EVIDENCE_CONTENT_TYPE,
  ADMISSION_EVIDENCE_KIND,
  BOUNDARY_API_VERSION,
  BOUNDARY_REQUEST_KIND,
  PROPOSED_MOVE_API_VERSION,
  PROPOSED_MOVE_KIND,
  REQUEST_RESOLUTIONS,
  REQUIRED_ADMISSION_GATES,
  TARGET_STATUSES,
  type AdmissionBoundaryRequest,
  type AdmissionDecisionEvidence,
  type AdmissionEvidenceEnvelope,
  type AdmissionEvidencePayload,
  type AdmissionGateEvidence,
  type AdmissionGateId,
  type AdmissionTrustStore,
  type BoundaryOperation,
  type BoundaryResponse,
  type EvidenceValidationResult,
  type ProposedMove,
  type RequestResolution,
  type TargetStatus,
} from "./contracts";

const REQUEST_KEYS = [
  "api_version",
  "kind",
  "request_id",
  "subject_ref",
  "subject_digest",
  "current_status",
  "requested_status",
  "operation",
  "resolution",
  "admission_evidence",
] as const;

const ENVELOPE_KEYS = [
  "content_type",
  "signed_payload_base64url",
  "signed_payload_sha256",
  "signature",
] as const;

const SIGNATURE_KEYS = ["algorithm", "key_id", "value_base64url"] as const;
const PAYLOAD_KEYS = ["api_version", "kind", "decision", "gates"] as const;

const DECISION_KEYS = [
  "decision_id",
  "revision",
  "subject_ref",
  "subject_digest",
  "from_status",
  "requested_status",
  "outcome",
  "recorded_at",
  "valid_from",
  "expires_at",
  "granting_authority_ref",
  "separation_of_authority_evidence_ref",
  "admission_procedure_ref",
  "rollback_plan_ref",
] as const;

const GATE_KEYS = [
  "gate_id",
  "outcome",
  "evidence_refs",
  "decided_by_authority_ref",
] as const;

const PROTECTED_STATUSES = new Set<TargetStatus>([
  "Approved",
  "Canonical",
  "Live",
  "Current",
  "Active",
  "Chooseable",
  "Useable",
]);

export const EMPTY_TRUST_STORE: AdmissionTrustStore = Object.freeze({});

type ParseResult<T> =
  | { ok: true; value: T }
  | { ok: false; blocker_codes: string[] };

function toRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return Object.fromEntries(Object.entries(value));
}

function hasOnlyKeys(
  record: Readonly<Record<string, unknown>>,
  allowedKeys: readonly string[],
): boolean {
  const allowed = new Set(allowedKeys);
  return Object.keys(record).every((key) => allowed.has(key));
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isReference(value: unknown): value is string {
  return (
    isNonEmptyString(value) &&
    value.length >= 3 &&
    value.length <= 512 &&
    !/\s/u.test(value)
  );
}

function isSha256(value: unknown): value is string {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function isIsoInstant(value: unknown): value is string {
  if (typeof value !== "string") {
    return false;
  }

  const epoch = Date.parse(value);
  return Number.isFinite(epoch) && value.includes("T");
}

function isTargetStatus(value: unknown): value is TargetStatus {
  return typeof value === "string" && TARGET_STATUSES.some((item) => item === value);
}

function isProtectedTargetStatus(
  value: TargetStatus,
): value is Exclude<TargetStatus, "Candidate"> {
  return PROTECTED_STATUSES.has(value);
}

function isResolution(value: unknown): value is RequestResolution {
  return (
    typeof value === "string" &&
    REQUEST_RESOLUTIONS.some((item) => item === value)
  );
}

function isOperation(value: unknown): value is BoundaryOperation {
  return value === "shadow_evaluate" || value === "request_admission";
}

function isAdmissionGateId(value: unknown): value is AdmissionGateId {
  return (
    typeof value === "string" &&
    REQUIRED_ADMISSION_GATES.some((item) => item === value)
  );
}

function parseRequest(value: unknown): ParseResult<AdmissionBoundaryRequest> {
  const record = toRecord(value);
  if (record === null || !hasOnlyKeys(record, REQUEST_KEYS)) {
    return { ok: false, blocker_codes: ["REQUEST_CONTRACT_INVALID"] };
  }

  if (
    record.api_version !== BOUNDARY_API_VERSION ||
    record.kind !== BOUNDARY_REQUEST_KIND ||
    !isReference(record.request_id) ||
    !isReference(record.subject_ref) ||
    !isSha256(record.subject_digest) ||
    record.current_status !== "Candidate" ||
    !isTargetStatus(record.requested_status) ||
    !isOperation(record.operation) ||
    !isResolution(record.resolution)
  ) {
    return { ok: false, blocker_codes: ["REQUEST_CONTRACT_INVALID"] };
  }

  const base = {
    api_version: record.api_version,
    kind: record.kind,
    request_id: record.request_id,
    subject_ref: record.subject_ref,
    subject_digest: record.subject_digest,
    current_status: record.current_status,
    requested_status: record.requested_status,
    operation: record.operation,
    resolution: record.resolution,
  } satisfies Omit<AdmissionBoundaryRequest, "admission_evidence">;

  if (record.admission_evidence === undefined) {
    return { ok: true, value: base };
  }

  const evidence = parseEnvelope(record.admission_evidence);
  if (!evidence.ok) {
    return {
      ok: true,
      value: {
        ...base,
        admission_evidence: record.admission_evidence,
      },
    };
  }

  return { ok: true, value: { ...base, admission_evidence: evidence.value } };
}

function parseEnvelope(value: unknown): ParseResult<AdmissionEvidenceEnvelope> {
  const record = toRecord(value);
  if (record === null || !hasOnlyKeys(record, ENVELOPE_KEYS)) {
    return { ok: false, blocker_codes: ["ADMISSION_EVIDENCE_CONTRACT_INVALID"] };
  }

  const signature = toRecord(record.signature);
  if (
    signature === null ||
    !hasOnlyKeys(signature, SIGNATURE_KEYS) ||
    record.content_type !== ADMISSION_EVIDENCE_CONTENT_TYPE ||
    !isNonEmptyString(record.signed_payload_base64url) ||
    !isSha256(record.signed_payload_sha256) ||
    signature.algorithm !== "Ed25519" ||
    !isReference(signature.key_id) ||
    !isNonEmptyString(signature.value_base64url)
  ) {
    return { ok: false, blocker_codes: ["ADMISSION_EVIDENCE_CONTRACT_INVALID"] };
  }

  return {
    ok: true,
    value: {
      content_type: record.content_type,
      signed_payload_base64url: record.signed_payload_base64url,
      signed_payload_sha256: record.signed_payload_sha256,
      signature: {
        algorithm: signature.algorithm,
        key_id: signature.key_id,
        value_base64url: signature.value_base64url,
      },
    },
  };
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0) {
    return null;
  }

  const output: string[] = [];
  for (const item of value) {
    if (!isReference(item) || output.includes(item)) {
      return null;
    }
    output.push(item);
  }

  return output;
}

function parseDecision(value: unknown): AdmissionDecisionEvidence | null {
  const record = toRecord(value);
  if (
    record === null ||
    !hasOnlyKeys(record, DECISION_KEYS) ||
    !isReference(record.decision_id) ||
    !Number.isInteger(record.revision) ||
    typeof record.revision !== "number" ||
    record.revision < 1 ||
    !isReference(record.subject_ref) ||
    !isSha256(record.subject_digest) ||
    record.from_status !== "Candidate" ||
    !isTargetStatus(record.requested_status) ||
    !isProtectedTargetStatus(record.requested_status) ||
    record.outcome !== "approve" ||
    !isIsoInstant(record.recorded_at) ||
    !isIsoInstant(record.valid_from) ||
    !isIsoInstant(record.expires_at) ||
    !isReference(record.granting_authority_ref) ||
    !isReference(record.separation_of_authority_evidence_ref) ||
    !isReference(record.admission_procedure_ref) ||
    !isReference(record.rollback_plan_ref)
  ) {
    return null;
  }

  return {
    decision_id: record.decision_id,
    revision: record.revision,
    subject_ref: record.subject_ref,
    subject_digest: record.subject_digest,
    from_status: record.from_status,
    requested_status: record.requested_status,
    outcome: record.outcome,
    recorded_at: record.recorded_at,
    valid_from: record.valid_from,
    expires_at: record.expires_at,
    granting_authority_ref: record.granting_authority_ref,
    separation_of_authority_evidence_ref:
      record.separation_of_authority_evidence_ref,
    admission_procedure_ref: record.admission_procedure_ref,
    rollback_plan_ref: record.rollback_plan_ref,
  };
}

function parseGate(value: unknown): AdmissionGateEvidence | null {
  const record = toRecord(value);
  if (
    record === null ||
    !hasOnlyKeys(record, GATE_KEYS) ||
    !isAdmissionGateId(record.gate_id) ||
    record.outcome !== "pass" ||
    !isReference(record.decided_by_authority_ref)
  ) {
    return null;
  }

  const evidenceRefs = parseStringArray(record.evidence_refs);
  if (evidenceRefs === null) {
    return null;
  }

  return {
    gate_id: record.gate_id,
    outcome: record.outcome,
    evidence_refs: evidenceRefs,
    decided_by_authority_ref: record.decided_by_authority_ref,
  };
}

function parsePayload(value: unknown): ParseResult<AdmissionEvidencePayload> {
  const record = toRecord(value);
  if (
    record === null ||
    !hasOnlyKeys(record, PAYLOAD_KEYS) ||
    record.api_version !== ADMISSION_EVIDENCE_API_VERSION ||
    record.kind !== ADMISSION_EVIDENCE_KIND ||
    !Array.isArray(record.gates)
  ) {
    return { ok: false, blocker_codes: ["SIGNED_PAYLOAD_CONTRACT_INVALID"] };
  }

  const decision = parseDecision(record.decision);
  if (decision === null) {
    return { ok: false, blocker_codes: ["SIGNED_DECISION_CONTRACT_INVALID"] };
  }

  const gates: AdmissionGateEvidence[] = [];
  for (const item of record.gates) {
    const gate = parseGate(item);
    if (gate === null || gates.some((existing) => existing.gate_id === gate.gate_id)) {
      return { ok: false, blocker_codes: ["SIGNED_GATE_CONTRACT_INVALID"] };
    }
    gates.push(gate);
  }

  const supplied = new Set(gates.map((gate) => gate.gate_id));
  if (
    supplied.size !== REQUIRED_ADMISSION_GATES.length ||
    REQUIRED_ADMISSION_GATES.some((gateId) => !supplied.has(gateId))
  ) {
    return { ok: false, blocker_codes: ["REQUIRED_ADMISSION_GATES_INCOMPLETE"] };
  }

  return {
    ok: true,
    value: {
      api_version: record.api_version,
      kind: record.kind,
      decision,
      gates,
    },
  };
}

function decodeBase64Url(value: string): Uint8Array | null {
  if (!/^[A-Za-z0-9_-]+$/u.test(value) || value.length % 4 === 1) {
    return null;
  }

  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = value.replace(/-/gu, "+").replace(/_/gu, "/") + padding;

  try {
    const binary = atob(base64);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    return null;
  }
}

function bytesToHex(value: ArrayBuffer): string {
  return Array.from(new Uint8Array(value), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

function isPublicEd25519Key(value: JsonWebKey): boolean {
  return (
    value.kty === "OKP" &&
    value.crv === "Ed25519" &&
    isNonEmptyString(value.x) &&
    value.d === undefined
  );
}

function evidenceInvalid(...blockerCodes: string[]): EvidenceValidationResult {
  return { valid: false, blocker_codes: blockerCodes };
}

export async function verifyAdmissionEvidence(
  evidenceValue: unknown,
  request: AdmissionBoundaryRequest,
  trustStore: AdmissionTrustStore,
  now: Date,
): Promise<EvidenceValidationResult> {
  const envelope = parseEnvelope(evidenceValue);
  if (!envelope.ok) {
    return evidenceInvalid(...envelope.blocker_codes);
  }

  const payloadBytes = decodeBase64Url(envelope.value.signed_payload_base64url);
  const signatureBytes = decodeBase64Url(envelope.value.signature.value_base64url);
  if (payloadBytes === null || signatureBytes === null) {
    return evidenceInvalid("ADMISSION_EVIDENCE_ENCODING_INVALID");
  }

  const digest = await crypto.subtle.digest("SHA-256", payloadBytes);
  const actualDigest = `sha256:${bytesToHex(digest)}`;
  if (actualDigest !== envelope.value.signed_payload_sha256) {
    return evidenceInvalid("SIGNED_PAYLOAD_DIGEST_MISMATCH");
  }

  let payloadValue: unknown;
  try {
    payloadValue = JSON.parse(
      new TextDecoder("utf-8", { fatal: true, ignoreBOM: false }).decode(
        payloadBytes,
      ),
    );
  } catch {
    return evidenceInvalid("SIGNED_PAYLOAD_JSON_INVALID");
  }

  const payload = parsePayload(payloadValue);
  if (!payload.ok) {
    return evidenceInvalid(...payload.blocker_codes);
  }

  const publicJwk = trustStore[envelope.value.signature.key_id];
  if (publicJwk === undefined || !isPublicEd25519Key(publicJwk)) {
    return evidenceInvalid("SIGNING_KEY_NOT_TRUSTED");
  }

  let signatureValid = false;
  try {
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      publicJwk,
      { name: "Ed25519" },
      false,
      ["verify"],
    );
    signatureValid = await crypto.subtle.verify(
      { name: "Ed25519" },
      publicKey,
      signatureBytes,
      payloadBytes,
    );
  } catch {
    return evidenceInvalid("SIGNATURE_VERIFICATION_ERROR");
  }

  if (!signatureValid) {
    return evidenceInvalid("SIGNATURE_INVALID");
  }

  const decision = payload.value.decision;
  if (
    decision.subject_ref !== request.subject_ref ||
    decision.subject_digest !== request.subject_digest ||
    decision.requested_status !== request.requested_status
  ) {
    return evidenceInvalid("SIGNED_DECISION_REQUEST_MISMATCH");
  }

  const nowEpoch = now.getTime();
  const recordedEpoch = Date.parse(decision.recorded_at);
  const validFromEpoch = Date.parse(decision.valid_from);
  const expiresEpoch = Date.parse(decision.expires_at);
  if (
    recordedEpoch > nowEpoch ||
    validFromEpoch > nowEpoch ||
    expiresEpoch <= nowEpoch ||
    validFromEpoch >= expiresEpoch
  ) {
    return evidenceInvalid("SIGNED_DECISION_OUTSIDE_VALIDITY_WINDOW");
  }

  return { valid: true, payload: payload.value };
}

function proposedMoveId(requestId: string): string {
  const normalized = requestId.toLowerCase().replace(/[^a-z0-9._-]/gu, "-");
  return `proposed_move.cloudflare.${normalized}`;
}

function createProposedMove(
  request: AdmissionBoundaryRequest,
  reasonCode: string,
  blockerCodes: string[],
): ProposedMove {
  return {
    api_version: PROPOSED_MOVE_API_VERSION,
    kind: PROPOSED_MOVE_KIND,
    metadata: {
      id: proposedMoveId(request.request_id),
      status: "candidate",
    },
    spec: {
      source_adapter: "adapter.cloudflare.candidate_admission_boundary",
      request_ref: request.request_id,
      subject_ref: request.subject_ref,
      requested_status: request.requested_status,
      reason_code: reasonCode,
      authority_required: true,
      operational_effects_permitted: false,
      required_next_contract: "contract.authoritative_admission_decision.v1",
      blocker_codes: blockerCodes,
    },
  };
}

function responseBase(
  request: AdmissionBoundaryRequest,
): Omit<
  BoundaryResponse,
  | "decision"
  | "evidence_integrity_verified"
  | "blocker_codes"
  | "http_status"
  | "proposed_move"
> {
  return {
    api_version: BOUNDARY_API_VERSION,
    kind: "AdmissionBoundaryResponse",
    request_id: request.request_id,
    subject_ref: request.subject_ref,
    requested_status: request.requested_status,
    authority_granted: false,
    operational_effects_permitted: false,
    candidate_scope_only: true,
  };
}

function invalidRequestResponse(blockerCodes: string[]): BoundaryResponse {
  return {
    api_version: BOUNDARY_API_VERSION,
    kind: "AdmissionBoundaryResponse",
    request_id: "unresolved.request",
    subject_ref: "unresolved.subject",
    requested_status: "unresolved",
    decision: "reject",
    authority_granted: false,
    operational_effects_permitted: false,
    candidate_scope_only: true,
    evidence_integrity_verified: false,
    blocker_codes: blockerCodes,
    http_status: 400,
  };
}

export async function evaluateBoundary(
  requestValue: unknown,
  trustStore: AdmissionTrustStore = EMPTY_TRUST_STORE,
  now: Date = new Date(),
): Promise<BoundaryResponse> {
  const parsed = parseRequest(requestValue);
  if (!parsed.ok) {
    return invalidRequestResponse(parsed.blocker_codes);
  }

  const request = parsed.value;

  if (request.resolution !== "determinate") {
    const blockers = ["AMBIGUOUS_REQUEST_REQUIRES_PROPOSED_MOVE"];
    return {
      ...responseBase(request),
      decision: "abstain",
      evidence_integrity_verified: false,
      blocker_codes: blockers,
      proposed_move: createProposedMove(
        request,
        "resolve_admission_request_ambiguity",
        blockers,
      ),
      http_status: 409,
    };
  }

  if (request.requested_status === "Candidate") {
    if (request.operation !== "shadow_evaluate") {
      return {
        ...responseBase(request),
        decision: "reject",
        evidence_integrity_verified: false,
        blocker_codes: ["CANDIDATE_OPERATION_OUTSIDE_SHADOW_SCOPE"],
        http_status: 403,
      };
    }

    return {
      ...responseBase(request),
      decision: "permit_candidate_scope",
      evidence_integrity_verified: false,
      blocker_codes: ["CANDIDATE_HAS_NO_OPERATIONAL_AUTHORITY"],
      http_status: 200,
    };
  }

  if (!isProtectedTargetStatus(request.requested_status)) {
    return invalidRequestResponse(["REQUESTED_STATUS_NOT_SUPPORTED"]);
  }

  if (request.operation !== "request_admission") {
    return {
      ...responseBase(request),
      decision: "reject",
      evidence_integrity_verified: false,
      blocker_codes: ["PROTECTED_STATUS_REQUIRES_ADMISSION_OPERATION"],
      http_status: 403,
    };
  }

  if (request.admission_evidence === undefined) {
    return {
      ...responseBase(request),
      decision: "reject",
      evidence_integrity_verified: false,
      blocker_codes: ["SIGNED_TYPED_ADMISSION_EVIDENCE_REQUIRED"],
      http_status: 403,
    };
  }

  const evidence = await verifyAdmissionEvidence(
    request.admission_evidence,
    request,
    trustStore,
    now,
  );
  if (!evidence.valid) {
    return {
      ...responseBase(request),
      decision: "reject",
      evidence_integrity_verified: false,
      blocker_codes: evidence.blocker_codes,
      http_status: 403,
    };
  }

  const blockers = [
    "SIGNED_EVIDENCE_IS_NOT_AUTHORITY",
    "AUTHORITATIVE_ADMISSION_DECISION_REQUIRED",
  ];
  return {
    ...responseBase(request),
    decision: "abstain",
    evidence_integrity_verified: true,
    blocker_codes: blockers,
    proposed_move: createProposedMove(
      request,
      "submit_verified_evidence_to_authoritative_admission",
      blockers,
    ),
    http_status: 409,
  };
}

import { describe, expect, it } from "vitest";

import worker from "../src/index";
import {
  BOUNDARY_API_VERSION,
  BOUNDARY_REQUEST_KIND,
  type AdmissionBoundaryRequest,
  type BoundaryResponse,
} from "../src/contracts";

function candidateRequest(): AdmissionBoundaryRequest {
  return {
    api_version: BOUNDARY_API_VERSION,
    kind: BOUNDARY_REQUEST_KIND,
    request_id: "request.worker.candidate",
    subject_ref: "doctrine.classification.anti_limiting@0.1.0",
    subject_digest: `sha256:${"b".repeat(64)}`,
    current_status: "Candidate",
    requested_status: "Candidate",
    operation: "shadow_evaluate",
    resolution: "determinate",
  };
}

async function post(value: unknown): Promise<Response> {
  return worker.fetch(
    new Request("https://candidate.invalid/v1/admission-boundary/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(value),
    }),
  );
}

describe("Worker HTTP boundary", () => {
  it("reports safe-off candidate health", async () => {
    const response = await worker.fetch(
      new Request("https://candidate.invalid/healthz"),
    );
    const body: unknown = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      status: "candidate_only",
      authority_granted: false,
      operational_effects_permitted: false,
      trust_store: "safe_off",
    });
  });

  it("evaluates candidate scope through the HTTP handler", async () => {
    const response = await post(candidateRequest());
    const body: BoundaryResponse = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("x-quirk-authority-granted")).toBe("false");
    expect(body.decision).toBe("permit_candidate_scope");
    expect(body.authority_granted).toBe(false);
  });

  it("rejects Canonical admission with no evidence", async () => {
    const request = candidateRequest();
    request.requested_status = "Canonical";
    request.operation = "request_admission";

    const response = await post(request);
    const body: BoundaryResponse = await response.json();

    expect(response.status).toBe(403);
    expect(body.blocker_codes).toEqual(["SIGNED_TYPED_ADMISSION_EVIDENCE_REQUIRED"]);
    expect(body.authority_granted).toBe(false);
  });

  it("rejects unbounded request bodies before JSON parsing", async () => {
    const response = await worker.fetch(
      new Request("https://candidate.invalid/v1/admission-boundary/evaluate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ padding: "x".repeat(70_000) }),
      }),
    );
    const body: BoundaryResponse = await response.json();

    expect(response.status).toBe(413);
    expect(body.blocker_codes).toEqual(["REQUEST_BODY_TOO_LARGE"]);
  });

  it("requires JSON content type", async () => {
    const response = await worker.fetch(
      new Request("https://candidate.invalid/v1/admission-boundary/evaluate", {
        method: "POST",
        headers: { "content-type": "text/plain" },
        body: "not-json",
      }),
    );

    expect(response.status).toBe(415);
  });
});


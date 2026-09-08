import { evaluateBoundary, EMPTY_TRUST_STORE } from "./boundary";
import { BOUNDARY_API_VERSION, type BoundaryResponse } from "./contracts";

const EVALUATE_PATH = "/v1/admission-boundary/evaluate";
const MAX_REQUEST_BYTES = 65_536;

class RequestProblem extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string) {
    super(code);
    this.name = "RequestProblem";
    this.status = status;
    this.code = code;
  }
}

function jsonResponse(value: unknown, status: number): Response {
  return Response.json(value, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "application/json; charset=utf-8",
      "x-quirk-authority-granted": "false",
      "x-quirk-candidate-only": "true",
    },
  });
}

async function readBoundedJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get("content-length");
  if (contentLength !== null) {
    if (!/^\d+$/u.test(contentLength)) {
      throw new RequestProblem(400, "CONTENT_LENGTH_INVALID");
    }
    if (Number(contentLength) > MAX_REQUEST_BYTES) {
      throw new RequestProblem(413, "REQUEST_BODY_TOO_LARGE");
    }
  }

  if (request.body === null) {
    throw new RequestProblem(400, "REQUEST_BODY_REQUIRED");
  }

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  while (true) {
    const result = await reader.read();
    if (result.done) {
      break;
    }

    totalBytes += result.value.byteLength;
    if (totalBytes > MAX_REQUEST_BYTES) {
      await reader.cancel("request body exceeded boundary limit");
      throw new RequestProblem(413, "REQUEST_BODY_TOO_LARGE");
    }
    chunks.push(result.value);
  }

  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }

  let text: string;
  try {
    text = new TextDecoder("utf-8", {
      fatal: true,
      ignoreBOM: false,
    }).decode(body);
  } catch {
    throw new RequestProblem(400, "REQUEST_BODY_NOT_UTF8");
  }

  try {
    const value: unknown = JSON.parse(text);
    return value;
  } catch {
    throw new RequestProblem(400, "REQUEST_BODY_JSON_INVALID");
  }
}

function problemResponse(problem: RequestProblem): Response {
  const body: BoundaryResponse = {
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
    blocker_codes: [problem.code],
    http_status: problem.status,
  };
  return jsonResponse(body, problem.status);
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/healthz" && request.method === "GET") {
      return jsonResponse(
        {
          status: "candidate_only",
          authority_granted: false,
          operational_effects_permitted: false,
          trust_store: "safe_off",
        },
        200,
      );
    }

    if (url.pathname !== EVALUATE_PATH) {
      return jsonResponse({ error: "NOT_FOUND" }, 404);
    }

    if (request.method !== "POST") {
      return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), {
        status: 405,
        headers: {
          allow: "POST",
          "cache-control": "no-store",
          "content-type": "application/json; charset=utf-8",
          "x-quirk-authority-granted": "false",
          "x-quirk-candidate-only": "true",
        },
      });
    }

    const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
    if (!contentType.startsWith("application/json")) {
      return problemResponse(new RequestProblem(415, "JSON_CONTENT_TYPE_REQUIRED"));
    }

    try {
      const body = await readBoundedJson(request);
      // The deployable example intentionally has no trust roots. Signature
      // verification is exercised through the injected trust store in tests,
      // but this candidate Worker cannot treat any signer as authoritative.
      const result = await evaluateBoundary(body, EMPTY_TRUST_STORE);

      console.log(
        JSON.stringify({
          event: "quirk_candidate_admission_boundary",
          request_id: result.request_id,
          subject_ref: result.subject_ref,
          requested_status: result.requested_status,
          decision: result.decision,
          authority_granted: result.authority_granted,
          blocker_codes: result.blocker_codes,
        }),
      );

      return jsonResponse(result, result.http_status);
    } catch (error) {
      if (error instanceof RequestProblem) {
        return problemResponse(error);
      }

      console.error(
        JSON.stringify({
          event: "quirk_candidate_admission_boundary_error",
          path: url.pathname,
          error: error instanceof Error ? error.message : "unknown_error",
          authority_granted: false,
        }),
      );
      return problemResponse(new RequestProblem(500, "BOUNDARY_FAILURE_FAIL_CLOSED"));
    }
  },
} satisfies ExportedHandler;

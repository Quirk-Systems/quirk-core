export const BOUNDARY_API_VERSION =
  "quirk.systems/cloudflare-admission-boundary/v1alpha1" as const;
export const BOUNDARY_REQUEST_KIND = "AdmissionBoundaryRequest" as const;

export const ADMISSION_EVIDENCE_API_VERSION =
  "quirk.systems/admission-evidence/v1alpha1" as const;
export const ADMISSION_EVIDENCE_KIND = "AdmissionEvidence" as const;
export const ADMISSION_EVIDENCE_CONTENT_TYPE =
  "application/vnd.quirk.admission-evidence+json;version=1" as const;

export const PROPOSED_MOVE_API_VERSION =
  "quirk.systems/proposed-moves/v1alpha1" as const;
export const PROPOSED_MOVE_KIND = "ProposedMove" as const;

export const REQUIRED_ADMISSION_GATES = [
  "quirk_approval",
  "procedures",
  "processes",
  "profiling",
  "interoperability",
  "security",
  "statistical",
  "lexical",
  "quirk_pedantry",
  "ship_it_without_bryan",
  "separation_of_authority",
  "migration_and_rollback",
] as const;

export type AdmissionGateId = (typeof REQUIRED_ADMISSION_GATES)[number];

export const TARGET_STATUSES = [
  "Candidate",
  "Approved",
  "Canonical",
  "Live",
  "Current",
  "Active",
  "Chooseable",
  "Useable",
] as const;

export type TargetStatus = (typeof TARGET_STATUSES)[number];

export const REQUEST_RESOLUTIONS = [
  "determinate",
  "ambiguous",
  "unknown",
  "conflicting",
  "novel",
] as const;

export type RequestResolution = (typeof REQUEST_RESOLUTIONS)[number];
export type BoundaryOperation = "shadow_evaluate" | "request_admission";

export interface AdmissionBoundaryRequest {
  api_version: typeof BOUNDARY_API_VERSION;
  kind: typeof BOUNDARY_REQUEST_KIND;
  request_id: string;
  subject_ref: string;
  subject_digest: string;
  current_status: "Candidate";
  requested_status: TargetStatus;
  operation: BoundaryOperation;
  resolution: RequestResolution;
  admission_evidence?: unknown;
}

export interface AdmissionGateEvidence {
  gate_id: AdmissionGateId;
  outcome: "pass";
  evidence_refs: string[];
  decided_by_authority_ref: string;
}

export interface AdmissionDecisionEvidence {
  decision_id: string;
  revision: number;
  subject_ref: string;
  subject_digest: string;
  from_status: "Candidate";
  requested_status: Exclude<TargetStatus, "Candidate">;
  outcome: "approve";
  recorded_at: string;
  valid_from: string;
  expires_at: string;
  granting_authority_ref: string;
  separation_of_authority_evidence_ref: string;
  admission_procedure_ref: string;
  rollback_plan_ref: string;
}

export interface AdmissionEvidencePayload {
  api_version: typeof ADMISSION_EVIDENCE_API_VERSION;
  kind: typeof ADMISSION_EVIDENCE_KIND;
  decision: AdmissionDecisionEvidence;
  gates: AdmissionGateEvidence[];
}

export interface AdmissionEvidenceEnvelope {
  content_type: typeof ADMISSION_EVIDENCE_CONTENT_TYPE;
  signed_payload_base64url: string;
  signed_payload_sha256: string;
  signature: {
    algorithm: "Ed25519";
    key_id: string;
    value_base64url: string;
  };
}

export interface AdmissionTrustStore {
  readonly [keyId: string]: JsonWebKey | undefined;
}

export interface ProposedMove {
  api_version: typeof PROPOSED_MOVE_API_VERSION;
  kind: typeof PROPOSED_MOVE_KIND;
  metadata: {
    id: string;
    status: "candidate";
  };
  spec: {
    source_adapter: "adapter.cloudflare.candidate_admission_boundary";
    request_ref: string;
    subject_ref: string;
    requested_status: string;
    reason_code: string;
    authority_required: true;
    operational_effects_permitted: false;
    required_next_contract: string;
    blocker_codes: string[];
  };
}

export type BoundaryDecision = "permit_candidate_scope" | "reject" | "abstain";

export interface BoundaryResponse {
  api_version: typeof BOUNDARY_API_VERSION;
  kind: "AdmissionBoundaryResponse";
  request_id: string;
  subject_ref: string;
  requested_status: string;
  decision: BoundaryDecision;
  authority_granted: false;
  operational_effects_permitted: false;
  candidate_scope_only: true;
  evidence_integrity_verified: boolean;
  blocker_codes: string[];
  proposed_move?: ProposedMove;
  http_status: number;
}

export type EvidenceValidationResult =
  | {
      valid: true;
      payload: AdmissionEvidencePayload;
    }
  | {
      valid: false;
      blocker_codes: string[];
    };

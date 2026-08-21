#!/usr/bin/env python3
"""Validate the candidate Preference Graph evidence wedge without dependencies."""

import argparse
import hashlib
import json
import re
import sys
from datetime import datetime
from pathlib import Path


MAX_BYTES = 256 * 1024
SCHEMA_ID = "https://github.com/Quirk-Systems/quirk-core/blob/main/schemas/preference-evidence-wedge.v1.schema.json"
ROOT_VERSION = "preference-evidence-wedge.v1"
HASH_RE = re.compile(r"^sha256:[0-9a-f]{64}$")
SUBJECT_RE = re.compile(r"^user:[a-z0-9][a-z0-9._-]{0,63}$")
SESSION_RE = re.compile(r"^authn:[A-Za-z0-9._:-]{1,128}$")
TIME_RE = re.compile(r"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])T([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$")
VALUES = {"concise", "balanced", "detailed"}
SCOPE = {
    "project": "Quirk-Systems/project-scaffold",
    "purpose": "repository-audit-reporting",
    "context": "project-scaffold-reference",
    "surface": "repository-audit-report",
    "task": "render-repository-audit-report",
}


class ContractError(ValueError):
    pass


def _fail(path, message):
    raise ContractError(f"{path}: {message}")


def _pairs(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise ContractError(f"duplicate JSON key: {key}")
        value[key] = item
    return value


def _number(raw):
    raise ContractError(f"JSON numeric primitives are forbidden: {raw}")


def load_document(path):
    path = Path(path)
    raw = path.read_bytes()
    if len(raw) > MAX_BYTES:
        raise ContractError(f"{path}: file exceeds {MAX_BYTES} bytes")
    try:
        text = raw.decode("utf-8", errors="strict")
    except UnicodeDecodeError as error:
        raise ContractError(f"{path}: invalid UTF-8") from error
    try:
        return json.loads(
            text, object_pairs_hook=_pairs, parse_int=_number,
            parse_float=_number, parse_constant=_number,
        )
    except json.JSONDecodeError as error:
        raise ContractError(f"{path}: invalid JSON: {error.msg}") from error


def canonical_sha256(value):
    try:
        encoded = json.dumps(
            value, sort_keys=True, separators=(",", ":"),
            ensure_ascii=False, allow_nan=False,
        ).encode("utf-8")
    except (TypeError, ValueError) as error:
        raise ContractError(f"cannot canonicalize value: {error}") from error
    return "sha256:" + hashlib.sha256(encoded).hexdigest()


def _object(value, keys, path):
    if not isinstance(value, dict):
        _fail(path, "must be an object")
    actual = set(value)
    expected = set(keys)
    if actual != expected:
        missing = sorted(expected - actual)
        unknown = sorted(actual - expected)
        _fail(path, f"exact keys required; missing={missing}, unknown={unknown}")


def _string(value, path):
    if not isinstance(value, str) or not value:
        _fail(path, "must be a non-empty string")


def _constant(value, expected, path):
    if value != expected or type(value) is not type(expected):
        _fail(path, f"must equal {expected!r}")


def _timestamp(value, path):
    if not isinstance(value, str) or not TIME_RE.fullmatch(value):
        _fail(path, "must be strict UTC YYYY-MM-DDTHH:MM:SSZ")
    try:
        return datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ")
    except ValueError as error:
        raise ContractError(f"{path}: invalid calendar timestamp") from error


def _scope(value, path):
    _object(value, SCOPE, path)
    if value != SCOPE:
        _fail(path, "must equal the fixed v1 scope")


def _ref(value, target, path):
    _object(value, {"id", "content_sha256"}, path)
    expected = {"id": target["id"], "content_sha256": target["content_sha256"]}
    if value != expected:
        _fail(path, "does not match the addressed target")


def _addressed(value, kind, version, path):
    _constant(value["object_version"], version, path + ".object_version")
    digest = canonical_sha256({k: v for k, v in value.items() if k not in {"id", "content_sha256"}})
    _constant(value["content_sha256"], digest, path + ".content_sha256")
    _constant(value["id"], f"{kind}:{digest}", path + ".id")


def _actor(value, subject_id, path):
    _object(value, {"actor_type", "actor_id", "subject_relation", "authentication"}, path)
    _constant(value["actor_type"], "human", path + ".actor_type")
    _constant(value["actor_id"], subject_id, path + ".actor_id")
    _constant(value["subject_relation"], "self", path + ".subject_relation")
    auth = value["authentication"]
    _object(auth, {"status", "session_ref"}, path + ".authentication")
    _constant(auth["status"], "authenticated", path + ".authentication.status")
    if not isinstance(auth["session_ref"], str) or not SESSION_RE.fullmatch(auth["session_ref"]):
        _fail(path + ".authentication.session_ref", "must be a safe non-empty authn reference")


def _validate_candidate(value):
    keys = {
        "object_version", "id", "content_sha256", "predicate", "value", "subject",
        "scope", "evidence", "authority", "validity", "system_default",
    }
    _object(value, keys, "candidate")
    _constant(value["predicate"], "presentation.response_density", "candidate.predicate")
    if value["value"] not in VALUES:
        _fail("candidate.value", "must be concise, balanced, or detailed")
    _object(value["subject"], {"kind", "subject_id"}, "candidate.subject")
    _constant(value["subject"]["kind"], "authenticated_self", "candidate.subject.kind")
    subject_id = value["subject"]["subject_id"]
    if not isinstance(subject_id, str) or not SUBJECT_RE.fullmatch(subject_id):
        _fail("candidate.subject.subject_id", "must be user:<ASCII slug>")
    _scope(value["scope"], "candidate.scope")
    evidence = value["evidence"]
    _object(evidence, {"type", "sensitivity", "statement", "statement_sha256", "captured_at", "actor"}, "candidate.evidence")
    _constant(evidence["type"], "explicit_user_statement", "candidate.evidence.type")
    _constant(evidence["sensitivity"], "non_sensitive", "candidate.evidence.sensitivity")
    expected_statement = f"For repository audit reports in this project, use {value['value']} response density."
    _constant(evidence["statement"], expected_statement, "candidate.evidence.statement")
    expected_digest = "sha256:" + hashlib.sha256(expected_statement.encode("utf-8")).hexdigest()
    _constant(evidence["statement_sha256"], expected_digest, "candidate.evidence.statement_sha256")
    captured = _timestamp(evidence["captured_at"], "candidate.evidence.captured_at")
    _actor(evidence["actor"], subject_id, "candidate.evidence.actor")
    _object(value["authority"], {"kind", "effect", "runtime_authority"}, "candidate.authority")
    _constant(value["authority"]["kind"], "human_self_statement", "candidate.authority.kind")
    _constant(value["authority"]["effect"], "evidence_only", "candidate.authority.effect")
    _constant(value["authority"]["runtime_authority"], "none", "candidate.authority.runtime_authority")
    _object(value["validity"], {"not_before", "expires_at"}, "candidate.validity")
    not_before = _timestamp(value["validity"]["not_before"], "candidate.validity.not_before")
    expires = _timestamp(value["validity"]["expires_at"], "candidate.validity.expires_at")
    if not (not_before <= captured < expires):
        _fail("candidate.validity", "must satisfy not_before <= captured_at < expires_at")
    _constant(value["system_default"], False, "candidate.system_default")
    _addressed(value, "candidate", "preference-candidate.v1", "candidate")
    return subject_id, captured, expires


def _validate_proposal(value, candidate, captured):
    _object(value, {"object_version", "id", "content_sha256", "candidate_ref", "requested_effect", "scope", "proposed_at", "runtime_authority"}, "proposal")
    _ref(value["candidate_ref"], candidate, "proposal.candidate_ref")
    _constant(value["requested_effect"], "project_only", "proposal.requested_effect")
    _scope(value["scope"], "proposal.scope")
    proposed = _timestamp(value["proposed_at"], "proposal.proposed_at")
    if proposed < captured:
        _fail("proposal.proposed_at", "must be at or after capture")
    _constant(value["runtime_authority"], "none", "proposal.runtime_authority")
    _addressed(value, "proposal", "preference-proposal.v1", "proposal")
    return proposed


def _validate_decision(value, proposal, candidate, proposed, candidate_expires):
    keys = {"object_version", "id", "content_sha256", "proposal_ref", "outcome", "actor", "explicit", "scope", "decided_at", "expires_at", "approved_effects", "runtime_authority"}
    _object(value, keys, "decision")
    _ref(value["proposal_ref"], proposal, "decision.proposal_ref")
    if value["outcome"] not in {"approved", "rejected"}:
        _fail("decision.outcome", "must be approved or rejected")
    _actor(value["actor"], candidate["subject"]["subject_id"], "decision.actor")
    if value["actor"] != candidate["evidence"]["actor"]:
        _fail("decision.actor", "must equal the candidate actor assertion")
    _constant(value["explicit"], True, "decision.explicit")
    _scope(value["scope"], "decision.scope")
    decided = _timestamp(value["decided_at"], "decision.decided_at")
    expires = _timestamp(value["expires_at"], "decision.expires_at")
    if not (proposed <= decided < expires <= candidate_expires):
        _fail("decision", "must satisfy proposed_at <= decided_at < expires_at <= candidate expiry")
    expected_effects = ["project_only"] if value["outcome"] == "approved" else []
    _constant(value["approved_effects"], expected_effects, "decision.approved_effects")
    _constant(value["runtime_authority"], "none", "decision.runtime_authority")
    _addressed(value, "decision", "preference-decision.v1", "decision")
    return decided, expires


def _validate_projection(value, decision, candidate, decided, decision_expires, candidate_expires):
    keys = {"object_version", "id", "content_sha256", "decision_ref", "mode", "effect", "scope", "result", "result_sha256", "simulated_at", "applied", "consumer_authority", "runtime_authority"}
    _object(value, keys, "projection")
    _ref(value["decision_ref"], decision, "projection.decision_ref")
    _constant(value["mode"], "deterministic_simulation", "projection.mode")
    _constant(value["effect"], "project_only", "projection.effect")
    _scope(value["scope"], "projection.scope")
    _object(value["result"], {"predicate", "value"}, "projection.result")
    _constant(value["result"]["predicate"], candidate["predicate"], "projection.result.predicate")
    _constant(value["result"]["value"], candidate["value"], "projection.result.value")
    _constant(value["result_sha256"], canonical_sha256(value["result"]), "projection.result_sha256")
    simulated = _timestamp(value["simulated_at"], "projection.simulated_at")
    if not (decided <= simulated < decision_expires and simulated < candidate_expires):
        _fail("projection.simulated_at", "must fall within decision and candidate validity")
    _constant(value["applied"], False, "projection.applied")
    _constant(value["consumer_authority"], "none", "projection.consumer_authority")
    _constant(value["runtime_authority"], "none", "projection.runtime_authority")
    _addressed(value, "projection", "preference-projection.v1", "projection")
    return simulated


def _validate_receipt(value, candidate, proposal, decision, projection, simulated):
    keys = {"object_version", "id", "content_sha256", "candidate_ref", "proposal_ref", "decision_ref", "projection_ref", "candidate_statement_sha256", "projection_result_sha256", "effect", "recorded_at", "applied", "authority_effect"}
    _object(value, keys, "receipt")
    for name, target in (("candidate", candidate), ("proposal", proposal), ("decision", decision), ("projection", projection)):
        _ref(value[f"{name}_ref"], target, f"receipt.{name}_ref")
    _constant(value["candidate_statement_sha256"], candidate["evidence"]["statement_sha256"], "receipt.candidate_statement_sha256")
    _constant(value["projection_result_sha256"], projection["result_sha256"], "receipt.projection_result_sha256")
    _constant(value["effect"], "project_only", "receipt.effect")
    recorded = _timestamp(value["recorded_at"], "receipt.recorded_at")
    if recorded < simulated:
        _fail("receipt.recorded_at", "must be at or after simulation")
    _constant(value["applied"], False, "receipt.applied")
    _constant(value["authority_effect"], "none", "receipt.authority_effect")
    _addressed(value, "receipt", "preference-projection-receipt.v1", "receipt")
    return recorded


def _validate_confirmation(value, receipt, candidate, recorded, candidate_expires):
    keys = {"object_version", "id", "content_sha256", "receipt_ref", "effect", "actor", "explicit", "predicate", "value", "scope", "confirmed_at", "expires_at", "runtime_authority"}
    _object(value, keys, "edge_confirmation")
    _ref(value["receipt_ref"], receipt, "edge_confirmation.receipt_ref")
    _constant(value["effect"], "create_edge", "edge_confirmation.effect")
    _actor(value["actor"], candidate["subject"]["subject_id"], "edge_confirmation.actor")
    if value["actor"] != candidate["evidence"]["actor"]:
        _fail("edge_confirmation.actor", "must equal the candidate actor assertion")
    _constant(value["explicit"], True, "edge_confirmation.explicit")
    _constant(value["predicate"], candidate["predicate"], "edge_confirmation.predicate")
    _constant(value["value"], candidate["value"], "edge_confirmation.value")
    _scope(value["scope"], "edge_confirmation.scope")
    confirmed = _timestamp(value["confirmed_at"], "edge_confirmation.confirmed_at")
    expires = _timestamp(value["expires_at"], "edge_confirmation.expires_at")
    if not (recorded <= confirmed < expires <= candidate_expires):
        _fail("edge_confirmation", "must satisfy recorded_at <= confirmed_at < expires_at <= candidate expiry")
    _constant(value["runtime_authority"], "none", "edge_confirmation.runtime_authority")
    _addressed(value, "edge-confirmation", "preference-edge-confirmation.v1", "edge_confirmation")
    return confirmed, expires


def _validate_edge(value, confirmation, receipt, candidate, confirmed, expires):
    keys = {"object_version", "id", "content_sha256", "subject", "predicate", "value", "scope", "validity", "reference", "receipt_ref", "confirmation_ref", "authority", "system_default", "state", "applied", "consumer_authority", "runtime_authority"}
    _object(value, keys, "learned_edge")
    _constant(value["subject"], candidate["subject"], "learned_edge.subject")
    _constant(value["predicate"], candidate["predicate"], "learned_edge.predicate")
    _constant(value["value"], candidate["value"], "learned_edge.value")
    _scope(value["scope"], "learned_edge.scope")
    _object(value["validity"], {"not_before", "expires_at"}, "learned_edge.validity")
    _constant(value["validity"]["not_before"], confirmation["confirmed_at"], "learned_edge.validity.not_before")
    _constant(value["validity"]["expires_at"], confirmation["expires_at"], "learned_edge.validity.expires_at")
    _object(value["reference"], {"type", "candidate_ref"}, "learned_edge.reference")
    _constant(value["reference"]["type"], "explicit_user_statement", "learned_edge.reference.type")
    _ref(value["reference"]["candidate_ref"], candidate, "learned_edge.reference.candidate_ref")
    _ref(value["receipt_ref"], receipt, "learned_edge.receipt_ref")
    _ref(value["confirmation_ref"], confirmation, "learned_edge.confirmation_ref")
    _object(value["authority"], {"kind", "runtime_authority"}, "learned_edge.authority")
    _constant(value["authority"]["kind"], "explicit_human_confirmation", "learned_edge.authority.kind")
    _constant(value["authority"]["runtime_authority"], "none", "learned_edge.authority.runtime_authority")
    _constant(value["system_default"], False, "learned_edge.system_default")
    _constant(value["state"], "recorded", "learned_edge.state")
    _constant(value["applied"], False, "learned_edge.applied")
    _constant(value["consumer_authority"], "none", "learned_edge.consumer_authority")
    _constant(value["runtime_authority"], "none", "learned_edge.runtime_authority")
    _addressed(value, "edge", "preference-edge.v1", "learned_edge")


def validate_document(document):
    top = {"schema_version", "contract_status", "admission_effect", "runtime_authority", "candidate", "proposal", "decision", "projection", "receipt", "edge_confirmation", "learned_edge"}
    _object(document, top, "root")
    _constant(document["schema_version"], ROOT_VERSION, "schema_version")
    _constant(document["contract_status"], "candidate", "contract_status")
    _constant(document["admission_effect"], "none", "admission_effect")
    _constant(document["runtime_authority"], "none", "runtime_authority")
    _, captured, candidate_expires = _validate_candidate(document["candidate"])
    proposed = _validate_proposal(document["proposal"], document["candidate"], captured)
    decided, decision_expires = _validate_decision(document["decision"], document["proposal"], document["candidate"], proposed, candidate_expires)
    approved = document["decision"]["outcome"] == "approved"
    if not approved:
        for name in ("projection", "receipt", "edge_confirmation", "learned_edge"):
            if document[name] is not None:
                _fail(name, "must be null after rejection")
        return
    if document["projection"] is None or document["receipt"] is None:
        _fail("root", "approval requires projection and receipt")
    simulated = _validate_projection(document["projection"], document["decision"], document["candidate"], decided, decision_expires, candidate_expires)
    recorded = _validate_receipt(document["receipt"], document["candidate"], document["proposal"], document["decision"], document["projection"], simulated)
    confirmation, edge = document["edge_confirmation"], document["learned_edge"]
    if (confirmation is None) != (edge is None):
        _fail("root", "edge_confirmation and learned_edge must be present together")
    if confirmation is not None:
        confirmed, expires = _validate_confirmation(confirmation, document["receipt"], document["candidate"], recorded, candidate_expires)
        _validate_edge(edge, confirmation, document["receipt"], document["candidate"], confirmed, expires)


def validate_schema(schema):
    _object(schema, {"$schema", "$id", "title", "description", "type", "additionalProperties", "required", "properties", "oneOf", "$defs"}, "schema")
    _constant(schema["$id"], SCHEMA_ID, "schema.$id")
    try:
        root_constant = schema["properties"]["schema_version"]["const"]
    except (KeyError, TypeError) as error:
        raise ContractError("schema: missing root schema_version const") from error
    _constant(root_constant, ROOT_VERSION, "schema.properties.schema_version.const")


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--schema", required=True)
    parser.add_argument("documents", nargs="+")
    args = parser.parse_args(argv)
    try:
        validate_schema(load_document(args.schema))
        for path in args.documents:
            validate_document(load_document(path))
            print(f"valid: {path}")
    except (OSError, ContractError) as error:
        parser.error(str(error))
    return 0


if __name__ == "__main__":
    sys.exit(main())

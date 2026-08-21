import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from scripts.validate_preference_wedge import ContractError, canonical_sha256, load_document, validate_document


ROOT = Path(__file__).resolve().parents[1]
EXAMPLES = ROOT / "examples" / "preference-evidence-wedge"


def load_example(name):
    return load_document(EXAMPLES / name)


def address(kind, value):
    digest = canonical_sha256({key: item for key, item in value.items() if key not in {"id", "content_sha256"}})
    value["content_sha256"] = digest
    value["id"] = f"{kind}:{digest}"


def ref(value):
    return {"id": value["id"], "content_sha256": value["content_sha256"]}


def readdress(doc):
    candidate = doc["candidate"]
    candidate["evidence"]["statement_sha256"] = "sha256:" + hashlib.sha256(
        candidate["evidence"]["statement"].encode("utf-8")
    ).hexdigest()
    address("candidate", candidate)
    proposal = doc["proposal"]
    proposal["candidate_ref"] = ref(candidate)
    address("proposal", proposal)
    decision = doc["decision"]
    decision["proposal_ref"] = ref(proposal)
    address("decision", decision)
    if doc["projection"] is None:
        return doc
    projection = doc["projection"]
    projection["decision_ref"] = ref(decision)
    projection["result_sha256"] = canonical_sha256(projection["result"])
    address("projection", projection)
    receipt = doc["receipt"]
    receipt.update({
        "candidate_ref": ref(candidate), "proposal_ref": ref(proposal),
        "decision_ref": ref(decision), "projection_ref": ref(projection),
        "candidate_statement_sha256": candidate["evidence"]["statement_sha256"],
        "projection_result_sha256": projection["result_sha256"],
    })
    address("receipt", receipt)
    confirmation = doc["edge_confirmation"]
    edge = doc["learned_edge"]
    if confirmation is not None:
        confirmation["receipt_ref"] = ref(receipt)
        address("edge-confirmation", confirmation)
    if edge is not None and confirmation is not None:
        edge["reference"]["candidate_ref"] = ref(candidate)
        edge["receipt_ref"] = ref(receipt)
        edge["confirmation_ref"] = ref(confirmation)
        address("edge", edge)
    return doc


def explicit_rejection_document():
    """Construct the rejection branch from the planned project-only example."""
    doc = load_example("project-only.json")
    doc["decision"]["outcome"] = "rejected"
    doc["decision"]["approved_effects"] = []
    doc["projection"] = None
    doc["receipt"] = None
    doc["edge_confirmation"] = None
    doc["learned_edge"] = None
    return readdress(doc)


class PreferenceWedgeContractTests(unittest.TestCase):
    def assert_invalid(self, doc, message=None):
        with self.assertRaises(ContractError, msg=message):
            validate_document(doc)

    def test_valid_examples_and_constructed_rejection(self):
        for name in ("project-only.json", "edge-opt-in.json"):
            validate_document(load_example(name))
        validate_document(explicit_rejection_document())

    def test_reordered_keys_do_not_change_hash(self):
        candidate = load_example("project-only.json")["candidate"]
        body = {k: v for k, v in candidate.items() if k not in {"id", "content_sha256"}}
        self.assertEqual(canonical_sha256(body), canonical_sha256(dict(reversed(list(body.items())))))

    def test_loader_rejects_duplicate_keys_invalid_utf8_oversize_and_numbers(self):
        cases = [
            b'{"schema_version":"x","schema_version":"y"}',
            b'\xff',
            b'{"n":1}',
            b'{"n":1.2}',
            b'{' + b' ' * (256 * 1024) + b'}',
        ]
        for raw in cases:
            with self.subTest(size=len(raw)), tempfile.NamedTemporaryFile() as handle:
                handle.write(raw); handle.flush()
                with self.assertRaises(ContractError):
                    load_document(Path(handle.name))

    def test_unknown_field_fails_at_each_object_depth(self):
        paths = [
            (), ("candidate",), ("candidate", "subject"), ("candidate", "scope"),
            ("candidate", "evidence"), ("candidate", "evidence", "actor"),
            ("candidate", "evidence", "actor", "authentication"), ("candidate", "authority"),
            ("candidate", "validity"), ("proposal",), ("decision",), ("projection",),
            ("projection", "result"), ("receipt",),
            ("decision", "actor", "authentication"),
        ]
        for path in paths:
            doc = load_example("project-only.json")
            target = doc
            for part in path: target = target[part]
            target["unexpected"] = "x"
            self.assert_invalid(readdress(doc), str(path))

        doc = load_example("project-only.json")
        doc["proposal"]["candidate_ref"]["unexpected"] = "x"
        self.assert_invalid(doc, "proposal candidate ref")

        for location in (("edge_confirmation",),
                         ("learned_edge",), ("learned_edge", "validity"),
                         ("learned_edge", "reference"), ("learned_edge", "authority")):
            doc = load_example("edge-opt-in.json")
            target = doc
            for part in location: target = target[part]
            target["unexpected"] = "x"
            self.assert_invalid(readdress(doc), str(location))
        doc = load_example("edge-opt-in.json")
        doc["edge_confirmation"]["receipt_ref"]["unexpected"] = "x"
        self.assert_invalid(doc, "confirmation receipt ref")

    def test_candidate_evidence_and_actor_guards(self):
        mutations = [
            lambda d: d["candidate"].__setitem__("predicate", "other"),
            lambda d: d["candidate"].__setitem__("value", "verbose"),
            lambda d: d["candidate"]["evidence"].__setitem__("statement", ""),
            lambda d: d["candidate"]["evidence"].__setitem__("type", "inferred"),
            lambda d: d["candidate"]["evidence"].__setitem__("sensitivity", "sensitive"),
            lambda d: d["candidate"]["evidence"].__setitem__("confidence", "high"),
            lambda d: d["candidate"]["subject"].__setitem__("kind", "anonymous"),
            lambda d: d["candidate"]["evidence"]["actor"].__setitem__("actor_type", "service"),
            lambda d: d["candidate"]["evidence"]["actor"].__setitem__("subject_relation", "other"),
            lambda d: d["candidate"]["evidence"]["actor"].__setitem__("actor_id", "user:other"),
            lambda d: d["candidate"]["evidence"]["actor"].pop("authentication"),
            lambda d: d["candidate"]["evidence"]["actor"]["authentication"].__setitem__("status", "anonymous"),
            lambda d: d["candidate"]["evidence"]["actor"]["authentication"].__setitem__("session_ref", ""),
            lambda d: d["candidate"].__setitem__("system_default", True),
        ]
        for mutate in mutations:
            doc = load_example("project-only.json"); mutate(doc)
            self.assert_invalid(readdress(doc))

    def test_scope_must_be_exact_at_every_stage(self):
        locations = [
            ("candidate", "scope"), ("proposal", "scope"), ("decision", "scope"),
            ("projection", "scope"), ("edge_confirmation", "scope"), ("learned_edge", "scope"),
        ]
        for location in locations:
            doc = load_example("edge-opt-in.json")
            doc[location[0]][location[1]]["project"] = "*"
            self.assert_invalid(readdress(doc), str(location))

    def test_time_intervals_and_order_fail_closed(self):
        mutations = [
            lambda d: d["candidate"]["validity"].__setitem__("not_before", "2026-08-22T00:00:00Z"),
            lambda d: d["proposal"].__setitem__("proposed_at", "2026-08-20T00:00:00Z"),
            lambda d: d["decision"].__setitem__("decided_at", "2026-08-20T00:00:00Z"),
            lambda d: d["decision"].__setitem__("expires_at", "2027-01-02T00:00:00Z"),
            lambda d: d["projection"].__setitem__("simulated_at", d["decision"]["expires_at"]),
            lambda d: d["receipt"].__setitem__("recorded_at", "2026-08-20T00:00:00Z"),
        ]
        for mutate in mutations:
            doc = load_example("project-only.json"); mutate(doc)
            self.assert_invalid(readdress(doc))
        doc = load_example("edge-opt-in.json")
        doc["edge_confirmation"]["confirmed_at"] = doc["candidate"]["validity"]["expires_at"]
        self.assert_invalid(readdress(doc))

    def test_effects_and_rejection_cannot_expand(self):
        mutations = [
            lambda d: d["proposal"].__setitem__("requested_effect", "create_edge"),
            lambda d: d["decision"].__setitem__("approved_effects", ["project_only", "create_edge"]),
            lambda d: d["projection"].__setitem__("effect", "create_edge"),
        ]
        for mutate in mutations:
            doc = load_example("project-only.json"); mutate(doc)
            self.assert_invalid(readdress(doc))
        rejected = explicit_rejection_document()
        approved = load_example("project-only.json")
        rejected["projection"] = approved["projection"]
        rejected["receipt"] = approved["receipt"]
        self.assert_invalid(readdress(rejected))

        rejected = explicit_rejection_document()
        rejected["edge_confirmation"] = load_example("edge-opt-in.json")["edge_confirmation"]
        rejected["learned_edge"] = load_example("edge-opt-in.json")["learned_edge"]
        self.assert_invalid(readdress(rejected))

    def test_edge_requires_paired_confirmation_and_same_human(self):
        doc = load_example("edge-opt-in.json"); doc["learned_edge"] = None
        self.assert_invalid(readdress(doc))
        doc = load_example("edge-opt-in.json"); doc["edge_confirmation"]["actor"]["actor_id"] = "user:other"
        self.assert_invalid(readdress(doc))
        doc = load_example("edge-opt-in.json"); doc["learned_edge"]["value"] = "detailed"
        self.assert_invalid(readdress(doc))

    def test_authority_runtime_application_and_basis_fields_are_forbidden(self):
        mutations = [
            lambda d: d.__setitem__("runtime_authority", "runtime"),
            lambda d: d.__setitem__("admission_effect", "admitted"),
            lambda d: d["candidate"]["authority"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["proposal"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["decision"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["decision"].__setitem__("explicit", False),
            lambda d: d["projection"].__setitem__("mode", "runtime"),
            lambda d: d["projection"].__setitem__("applied", True),
            lambda d: d["projection"].__setitem__("consumer_authority", "service"),
            lambda d: d["projection"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["receipt"].__setitem__("authority_effect", "verified"),
            lambda d: d["receipt"].__setitem__("applied", True),
            lambda d: d["edge_confirmation"].__setitem__("explicit", False),
            lambda d: d["edge_confirmation"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["learned_edge"].__setitem__("state", "active"),
            lambda d: d["learned_edge"].__setitem__("state", "current"),
            lambda d: d["learned_edge"].__setitem__("applied", True),
            lambda d: d["learned_edge"].__setitem__("system_default", True),
            lambda d: d["learned_edge"].__setitem__("consumer_authority", "service"),
            lambda d: d["learned_edge"].__setitem__("runtime_authority", "runtime"),
            lambda d: d["learned_edge"].__setitem__("PreferenceBasis", {}),
            lambda d: d["learned_edge"].__setitem__("preference_basis", {}),
        ]
        for mutate in mutations:
            doc = load_example("edge-opt-in.json"); mutate(doc)
            self.assert_invalid(readdress(doc))

    def test_hashes_digests_and_refs_are_bound(self):
        mutations = [
            lambda d: d["candidate"].__setitem__("content_sha256", "sha256:" + "0" * 64),
            lambda d: d["candidate"].__setitem__("id", "candidate:sha256:" + "0" * 64),
            lambda d: d["proposal"]["candidate_ref"].__setitem__("id", "candidate:sha256:" + "0" * 64),
            lambda d: d["receipt"].__setitem__("candidate_statement_sha256", "sha256:" + "0" * 64),
            lambda d: d["projection"].__setitem__("result_sha256", "sha256:" + "0" * 64),
            lambda d: d["receipt"].__setitem__("projection_result_sha256", "sha256:" + "0" * 64),
        ]
        for mutate in mutations:
            doc = load_example("project-only.json"); mutate(doc)
            self.assert_invalid(doc)

    def test_stale_swapped_and_cross_object_semantics_fail(self):
        ref_mutations = [
            lambda d: d["proposal"].__setitem__("candidate_ref", d["decision"]["proposal_ref"]),
            lambda d: d["receipt"].__setitem__("proposal_ref", d["receipt"]["decision_ref"]),
        ]
        for mutate in ref_mutations:
            doc = load_example("edge-opt-in.json"); mutate(doc)
            self.assert_invalid(doc)
        mutations = [
            lambda d: d["projection"]["result"].__setitem__("predicate", "other"),
            lambda d: d["projection"]["result"].__setitem__("value", "detailed"),
            lambda d: d["edge_confirmation"].__setitem__("predicate", "other"),
            lambda d: d["edge_confirmation"].__setitem__("value", "detailed"),
            lambda d: d["learned_edge"]["subject"].__setitem__("subject_id", "user:other"),
            lambda d: d["learned_edge"]["validity"].__setitem__("not_before", "2026-08-21T10:06:00Z"),
            lambda d: d["learned_edge"]["reference"].__setitem__("type", "inferred"),
        ]
        for mutate in mutations:
            doc = load_example("edge-opt-in.json"); mutate(doc)
            self.assert_invalid(readdress(doc))

    def test_confirmation_time_bounds_are_strict(self):
        mutations = [
            lambda d: d["edge_confirmation"].__setitem__("confirmed_at", "2026-08-21T10:03:00Z"),
            lambda d: d["edge_confirmation"].__setitem__("expires_at", d["edge_confirmation"]["confirmed_at"]),
            lambda d: d["edge_confirmation"].__setitem__("expires_at", "2027-01-02T00:00:00Z"),
        ]
        for mutate in mutations:
            doc = load_example("edge-opt-in.json"); mutate(doc)
            self.assert_invalid(readdress(doc))

    def test_schema_identity_and_root_version_are_checked(self):
        schema = load_document(ROOT / "schemas" / "preference-evidence-wedge.v1.schema.json")
        from scripts.validate_preference_wedge import validate_schema
        validate_schema(schema)
        changed = copy.deepcopy(schema); changed["$id"] = "https://example.invalid/schema"
        with self.assertRaises(ContractError): validate_schema(changed)
        changed = copy.deepcopy(schema)
        changed["properties"]["schema_version"]["const"] = "preference-evidence-wedge.v2"
        with self.assertRaises(ContractError): validate_schema(changed)


if __name__ == "__main__":
    unittest.main()

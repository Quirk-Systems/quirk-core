import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import YAML from "yaml";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const RULE_IDS = Array.from({ length: 11 }, (_, index) => `ALR-${String(index + 1).padStart(3, "0")}`);
const GATES = [
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
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"));
}

function readYaml(relativePath) {
  return YAML.parse(fs.readFileSync(path.join(ROOT, relativePath), "utf8"), { uniqueKeys: true });
}

function fail(disposition, ...findings) {
  return { result: "fail", disposition, findings };
}

function pass() {
  return { result: "pass", disposition: "accept", findings: [] };
}

const adapters = {
  classification_document(fixture) {
    if (fixture.classification_path && fixture.path_semantics?.length > 1) {
      return fail("reject", "five_axes_not_independently_authoritative");
    }
    if (fixture.identity_label && Object.keys(fixture.implicit_semantics ?? {}).length > 1) {
      return fail("reject", "cross_axis_compound_encoding");
    }
    if (fixture.resolution === "other") {
      return fail("reject_classification", "other_used_as_resolution");
    }
    if (fixture.revision >= 2 && fixture.history?.supersedes_decision_refs?.length === 0) {
      return fail("reject", "version_increment_without_lineage");
    }
    return pass();
  },
  effect_record(fixture) {
    if (fixture.kind === "intended_and_observed") {
      const findings = ["intent_observation_conflated"];
      if (!fixture.evidence_refs?.length) findings.push("observation_without_evidence");
      return fail("reject_claim", ...findings);
    }
    return pass();
  },
  result_claim(fixture) {
    if (fixture.claim_kind === "causally_attributed" && !fixture.causal_basis_refs?.length) {
      return fail("reject_claim", "causal_attribution_unsupported");
    }
    return pass();
  },
  subtype_proposal(fixture) {
    if (fixture.claimed_basis?.startsWith("label_") && !fixture.governed_facet_ref && !fixture.policy_fact_ref) {
      return fail("reject", "tag_laundered_as_type", "missing_middle_contract");
    }
    if (fixture.only_difference?.style_facet && !fixture.invariant_refs?.length) {
      return fail("convert_to_facet_proposal", "subtype_without_durable_invariant");
    }
    return pass();
  },
  ontology_projection(fixture) {
    if (fixture.semantic_basis?.source_kind === "code" && !fixture.language_neutral_definition_ref) {
      return fail("reject", "code_inheritance_is_only_semantic_basis");
    }
    return pass();
  },
  migration_event(fixture) {
    if (fixture.code_event?.kind === "class_renamed" && fixture.ontology_mutation?.operation === "rename" && !fixture.ontology_mutation.governance_decision_ref) {
      return fail("block_projection", "implementation_refactor_mutates_ontology");
    }
    return pass();
  },
  import_admission(fixture) {
    if (fixture.external_concept && fixture.declared_origin === "native" && !fixture.semantic_source_ref) {
      return fail("quarantine_import", "conceptual_import_laundering");
    }
    if (fixture.target_status === "canonical") {
      const findings = [];
      if (!fixture.provenance_refs?.length) findings.push("import_provenance_missing");
      if (!fixture.mapping) findings.push("import_mapping_missing");
      if (findings.length) return fail("quarantine_import", ...findings);
    }
    return pass();
  },
  disposition_event(fixture) {
    if (fixture.operation === "hard_delete" && !fixture.decision_record_ref) {
      return fail("block_disposition", "decision_history_erased");
    }
    if (fixture.operation === "authorized_erasure" && fixture.payload_deleted && !fixture.decision_tombstone_preserved && !fixture.law_prohibits_tombstone) {
      return fail("block_disposition", "minimum_lawful_history_not_preserved");
    }
    return pass();
  },
  normalization_pipeline(fixture) {
    const outputs = Object.values(fixture.normalization ?? {});
    if (outputs.length > 1 && new Set(outputs).size < outputs.length) {
      return fail("quarantine", "resolution_states_do_not_round_trip");
    }
    return pass();
  },
  exclusivity_policy(fixture) {
    if (fixture.mode === "exclusive" && (!fixture.invariant_kind || !fixture.prevented_harm || !fixture.authority_ref || !fixture.evidence_refs?.length)) {
      return fail("reject", "exclusivity_without_safety_or_integrity_basis");
    }
    return pass();
  },
  interface_trace(fixture) {
    const before = fixture.before?.purposes ?? [];
    const after = fixture.after?.purposes ?? [];
    if (fixture.interaction?.control === "radio" && after.length < before.length && !fixture.exclusivity_policy_ref) {
      return fail("block_release", "interface_silently_collapses_cardinality");
    }
    return pass();
  },
  policy_ast(fixture) {
    if (fixture.condition?.operator === "tag_contains") return fail("fail_closed", "tag_controls_permission");
    return pass();
  },
  release_workflow(fixture) {
    if (fixture.git_ref?.startsWith("refs/tags/") && fixture.action?.startsWith("deploy_") && (!fixture.release_policy_refs?.length || !fixture.authority_decision_ref)) {
      return fail("block_release", "git_reference_substitutes_for_release_authority");
    }
    return pass();
  },
  persistence_event(fixture) {
    if (fixture.operation === "patch" && fixture.revision && !fixture.new_revision) {
      return fail("reject_mutation", "historical_assertion_overwritten");
    }
    return pass();
  },
  runtime_resolution(fixture) {
    if (fixture.resolver_ref === "person.bryan" || fixture.fallback === "ask_bryan_what_he_meant" || !fixture.input_contract_ref) {
      return fail("block_release", "implicit_human_context_dependency");
    }
    return pass();
  },
  runtime_trace(fixture) {
    if (fixture.hidden_context_source && fixture.input_resolution === "ambiguous" && fixture.output?.resolution === "classified") {
      return fail("fail_closed_and_propose_move", "hidden_context_reconstruction", "unsafe_ambiguity_promotion");
    }
    return pass();
  },
  admission_attempt(fixture) {
    if (fixture.requested_status === "canonical" && fixture.requesting_capability_ref === fixture.granting_authority_ref && !fixture.independent_decision_ref) {
      return fail("fail_closed", "capability_substitutes_for_authority", "candidate_attempts_self_admission");
    }
    return pass();
  },
  exception_activation(fixture) {
    if (fixture.activation_source?.kind === "tag") return fail("fail_closed", "tag_activates_exception");
    return pass();
  },
  proposed_move(fixture) {
    const findings = [];
    if (!/^proposed_move\.[a-z0-9][a-z0-9._-]*@[0-9]+\.[0-9]+\.[0-9]+$/.test(fixture.proposed_move_ref ?? "")) findings.push("proposed_move_untyped");
    if (fixture.operational_authority !== "none_until_separately_granted") findings.push("proposed_move_claims_authority");
    return findings.length ? fail("reject", ...findings) : pass();
  },
};

function validateSemantics(decision) {
  const findings = [];
  const { valid_from: from, valid_until: until } = decision.effective_time;
  if (until !== null && until !== undefined && Date.parse(until) < Date.parse(from)) findings.push("effective_time_inverted");
  return findings;
}

function baselineClassification() {
  const axis = (name, value) => ({
    axis: name,
    resolution: "classified",
    values: [value],
    candidate_values: [],
    evidence_refs: ["evidence.axis"],
    rationale: "Supported by recorded evidence.",
    vocabulary_ref: "vocabulary.quirk_core@1.0.0",
  });
  return {
    schema_version: "0.2.0",
    decision_id: "classification.decision.fixture",
    object_ref: { object_id: "object.fixture", object_version: "1" },
    classification_version: "1.0.0",
    revision: 1,
    change_mode: "initial",
    recorded_at: "2026-08-11T00:00:00Z",
    effective_time: { valid_from: "2026-08-11T00:00:00Z", valid_until: null },
    axes: {
      identity: axis("identity", "type.agent"),
      purpose: axis("purpose", "purpose.validate"),
      style: axis("style", "style.precise"),
      state: axis("state", "state.candidate"),
      authority: axis("authority", "authority.none"),
    },
    intended_effects: [],
    result_claims: [],
    provenance: [{
      provenance_id: "provenance.fixture",
      origin: "generated",
      source_ref: "source.fixture",
      captured_at: "2026-08-11T00:00:00Z",
      digest: `sha256:${"0".repeat(64)}`,
      actor_ref: "capability.candidate_validator",
      authority_ref: "authority.quirk_core.candidate_review",
    }],
    controls: { permissions: [], routing: [], retention: [], release: [] },
    tags: ["candidate"],
    interpretation_basis: { schema_refs: ["schema.classification@0.2.0"] },
    history: {
      record_mode: "append_only",
      supersedes_decision_refs: [],
      decision_log_ref: "decision_log.classification",
      retention_policy_ref: "policy.retention.classification@1.0.0",
    },
  };
}

function clone(value) {
  return structuredClone(value);
}

function assertInvalid(validate, value, name) {
  assert.equal(validate(value), false, `${name} unexpectedly passed schema validation`);
}

export function runValidation() {
  const ajv = new Ajv2020({ strict: true, allErrors: true });
  addFormats(ajv);

  const schemas = {
    manifest: readJson("schemas/doctrine-candidate.schema.json"),
    suite: readJson("schemas/adversarial-evaluation-suite.schema.json"),
    proposedMove: readJson("schemas/proposed-move.schema.json"),
    admissionDecision: readJson("schemas/admission-decision.schema.json"),
    classification: readJson("schemas/classification-decision.v0.2.0.schema.json"),
  };
  const validators = Object.fromEntries(Object.entries(schemas).map(([key, schema]) => [key, ajv.compile(schema)]));

  const manifest = readYaml("registry/candidates/doctrine.classification.anti_limiting.v0.2.0.yaml");
  const suite = readYaml("evals/classification/anti-limiting-rules.v0.2.0.yaml");
  const decision = readYaml("decisions/admission/doctrine.classification.anti_limiting.revise.0001.yaml");
  assert.equal(validators.manifest(manifest), true, JSON.stringify(validators.manifest.errors));
  assert.equal(validators.suite(suite), true, JSON.stringify(validators.suite.errors));
  assert.equal(validators.admissionDecision(decision), true, JSON.stringify(validators.admissionDecision.errors));

  assert.deepEqual(manifest.spec.rules.map((rule) => rule.id), RULE_IDS);
  for (const rule of manifest.spec.rules) {
    const digest = createHash("sha256").update(rule.source_text, "utf8").digest("hex");
    assert.equal(digest, rule.source_sha256, `${rule.id} source hash mismatch`);
  }

  const ruleCounts = new Map(RULE_IDS.map((id) => [id, 0]));
  for (const fixture of suite.spec.rule_cases) ruleCounts.set(fixture.rule_id, ruleCounts.get(fixture.rule_id) + 1);
  assert.deepEqual([...ruleCounts.values()], Array(11).fill(2), "each rule must have exactly two adversarial fixtures");
  const positiveCounts = new Map(RULE_IDS.map((id) => [id, 0]));
  for (const fixture of suite.spec.positive_controls) positiveCounts.set(fixture.rule_id, positiveCounts.get(fixture.rule_id) + 1);
  assert.deepEqual([...positiveCounts.values()], Array(11).fill(1), "each rule must have one positive control");

  const allCases = [...suite.spec.rule_cases, ...suite.spec.cross_cutting_cases, ...suite.spec.positive_controls];
  assert.equal(new Set(allCases.map((fixture) => fixture.id)).size, allCases.length, "fixture IDs must be unique");
  const results = allCases.map((fixture) => {
    assert.ok(adapters[fixture.adapter], `missing adapter ${fixture.adapter}`);
    const actual = adapters[fixture.adapter](fixture.fixture);
    assert.deepEqual({ ...actual, findings: [...actual.findings].sort() }, { ...fixture.expect, findings: [...fixture.expect.findings].sort() }, `${fixture.id} mismatch`);
    return { id: fixture.id, adapter: fixture.adapter, result: actual.result, disposition: actual.disposition, findings: actual.findings };
  });

  const base = baselineClassification();
  assert.equal(validators.classification(base), true, JSON.stringify(validators.classification.errors));
  const emptyBasis = clone(base);
  emptyBasis.interpretation_basis.schema_refs = [];
  assertInvalid(validators.classification, emptyBasis, "empty interpretation basis");
  const tagControl = clone(base);
  tagControl.controls.permissions = ["tag:admin"];
  assertInvalid(validators.classification, tagControl, "tag control");
  const arbitraryMove = clone(base);
  arbitraryMove.proposed_move_ref = "xxx";
  assertInvalid(validators.classification, arbitraryMove, "untyped Proposed Move");
  const multipleIdentity = clone(base);
  multipleIdentity.axes.identity.values.push("type.operator");
  assertInvalid(validators.classification, multipleIdentity, "multiple primary identities");
  const incompleteDisposition = clone(base);
  incompleteDisposition.change_mode = "disposition";
  assertInvalid(validators.classification, incompleteDisposition, "disposition without record");
  const unstewardedImport = clone(base);
  unstewardedImport.provenance[0].origin = "imported";
  assertInvalid(validators.classification, unstewardedImport, "import without mapping and steward");
  const invertedTime = clone(base);
  invertedTime.effective_time.valid_from = "2026-08-12T00:00:00Z";
  invertedTime.effective_time.valid_until = "2026-08-11T00:00:00Z";
  assert.equal(validators.classification(invertedTime), true, "time ordering belongs to the semantic validator");
  assert.deepEqual(validateSemantics(invertedTime), ["effective_time_inverted"]);

  assert.deepEqual([...new Set(decision.gate_results.map((result) => result.gate))].sort(), [...GATES].sort());
  assert.equal(decision.self_authorized, false);
  assert.equal(manifest.spec.normative_authority, "none_until_admitted");
  assert.equal(manifest.spec.enforcement_mode, "shadow_only");

  return {
    subject: suite.spec.subject_ref,
    schemas: { compiled_strict: Object.keys(validators).length, valid_documents: 3 },
    source_integrity: { exact_sha256: `${manifest.spec.rules.length}/${RULE_IDS.length}` },
    fixtures: {
      adversarial: { executed: suite.spec.rule_cases.length, exact_matches: results.filter((result) => result.id.startsWith("E-ALR-")).length },
      cross_cutting: { executed: suite.spec.cross_cutting_cases.length, exact_matches: results.filter((result) => /^E-(AUTH|TAG|MOVE)-/.test(result.id)).length },
      positive_controls: { executed: suite.spec.positive_controls.length, exact_matches: results.filter((result) => result.id.startsWith("P-ALR-")).length },
    },
    semantic_probes: { loopholes_closed: 6, time_order_fail_closed: 1 },
    admission: { prior_candidate: decision.subject_ref, decision: decision.outcome, confidence: decision.confidence, next_candidate: decision.next_candidate_ref },
    results,
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  console.log(JSON.stringify(runValidation(), null, 2));
}

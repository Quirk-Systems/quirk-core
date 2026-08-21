# Preference evidence wedge v1

This is a narrow, executable **candidate contract** for one end-to-end preference/evidence path. It proves that a closed, content-addressed document can represent explicit non-sensitive self evidence, a separately explicit decision, a deterministic project-only projection, a recorded receipt, and an optional separately confirmed edge. It proves no deployment or runtime use.

## Fixed boundary

- Predicate: `presentation.response_density`
- Values: `concise`, `balanced`, `detailed`
- Project: `Quirk-Systems/project-scaffold`
- Purpose: `repository-audit-reporting`
- Context: `project-scaffold-reference`
- Surface: `repository-audit-report`
- Task: `render-repository-audit-report`
- Runtime and consumer authority: `none`
- Application state: `false`
- Admission effect: `none`

Wildcards, inferred evidence, sensitive evidence, anonymous or service actors, missing authentication assertions, system defaults, runtime modes, active state, and authority expansion all fail closed.

## Lifecycle branches

1. A candidate binds the fixed predicate/value/scope to an exact human self statement and expiry.
2. A proposal asks only for `project_only` simulation.
3. An authenticated-human assertion explicitly approves or rejects that exact proposal.
4. Approval produces a deterministic, unapplied projection and a **recorded** projection receipt. This receipt is not “verified” and is not the Git evidence receipt.
5. Rejection produces no projection or receipt.
6. A learned edge exists only with a later, separately explicit `create_edge` confirmation. Both remain recorded and unapplied.

The project-only decision cannot acquire `create_edge` by implication. The wedge emits no `PreferenceBasis`.

## Content addressing

Each lifecycle object hashes the exact object with `id` and `content_sha256` omitted. Serialization is UTF-8 JSON with sorted keys, separators `(',', ':')`, `ensure_ascii=False`, and `allow_nan=False`. The digest is `sha256:<lowercase hex>` and the ID is `<kind>:<digest>`.

References contain only the target ID and digest. The validator recomputes every object, evidence statement, projection result, and reference. Reordered object keys are stable. Duplicate JSON keys, invalid UTF-8, numeric JSON primitives, unknown fields, and files larger than 256 KiB are rejected.

## Validation

Run:

```bash
python scripts/validate_preference_wedge.py \
  --schema schemas/preference-evidence-wedge.v1.schema.json \
  examples/preference-evidence-wedge/*.json
python -m unittest discover -s tests -v
```

The JSON Schema mirrors the closed structure and lifecycle branches. The dependency-free Python validator enforces cross-object references, exact copied semantics, content hashes, and temporal ordering; it does not claim to be a general JSON Schema implementation.

The two checked-in examples show project-only approval and separate edge opt-in. The test suite constructs and fully re-addresses an explicit-rejection document from the project-only example, then exercises both its valid path and forbidden post-rejection projection/edge mutations. Actor authentication fields are upstream assertions supplied to the portable contract, not identity-provider verification.

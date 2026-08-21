# Quirk Preference Language

Status: **CANDIDATE DOCTRINE — NOT ADMITTED**

Owner: **Open**

Applying runtime: **None**

Deployment evidence: **None**

The `docs/canon` directory is historical naming. Its path does not confer governance authority, admission, ownership, deployment, or runtime effect. Repository authority remains `Quirk-Systems/.github`; admission remains an open human governance decision.

## Proposed vocabulary

- **Quirk Preference**: a proposed bounded system for capturing, governing, and applying contextual preference evidence.
- **Preference Graph**: a proposed relationship model connecting subjects, scope, evidence, decisions, validity, and outcomes.
- **Preference Reference**: proposed provenance evidence that may support or qualify a preference candidate.
- **Preference Edge**: a proposed contextual relation recorded only after the contract's separate explicit human confirmation.
- **Preference Basis**: a historical concept for a runtime decision receipt. The v1 portable wedge emits no `PreferenceBasis` and no equivalent runtime authority object.

The useful conceptual distinction remains:

```text
Reference != Signal != Preference != Rule
```

That distinction is doctrine under evaluation, not proof of an implementing runtime.

## Candidate pipeline

The proposed pipeline is evidence-first:

```text
explicit statement -> candidate -> proposal -> human decision
                   -> deterministic projection -> recorded receipt
                   -> optional separate confirmation -> recorded edge
```

The portable v1 contract fixes one non-sensitive predicate and one project scope. Its projection is a deterministic simulation with `applied: false`. It grants no consumer or runtime authority. A project-only approval does not silently authorize edge creation.

## Historical database artifacts

The checked-in SQL migrations are historical candidate artifacts. There is no evidence here that they were deployed. They must not be described as a final enforcement boundary.

The SQL has weaker semantics than the portable v1 validator:

- it has no update/delete trigger that proves immutable rows;
- its JSONB checks accept shapes beyond typed, non-empty objects;
- any satisfying foreign-key reference passes its weaker provenance rule;
- it does not enforce explicit non-sensitive self evidence, authentication assertion shape, exact scope, expiry, separate confirmation, or the candidate lifecycle;
- its legacy `system_default = true` escape hatch is forbidden by this wedge.

Migration history is not rewritten by this cut. For the candidate v1 contract, `scripts/validate_preference_wedge.py` is the portable fail-closed boundary.

## Authority boundary

The contract records upstream human/authentication assertions but does not claim to be an identity provider. It does not authenticate a person, deploy a service, persist production state, personalize a consumer, admit doctrine, or select an owner. Missing or expanded semantics fail closed.

Changes to these candidate meanings require review through the repository authority. They do not become canon merely because they are merged into this candidate repository.

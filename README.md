# Quirk Core

Quirk Core holds the constitutional definitions, cross-system contracts, and
governance candidates that every Quirk implementation can reference without
inventing local meanings.

## Operating doctrine

**Open ontology. Closed operational admission.**

Any object type may exist as a candidate. No candidate becomes Live, Current,
Active, Chooseable, or Useable until it passes Quirk Approval and every
applicable procedure, process, profiling, interoperability, security,
statistical, lexical, and Quirk Pedantry gate.

Candidate status is permission to investigate. It is not authority to govern a
runtime.

## Repository contract

- `docs/candidates/` contains readable proposals that have not earned canon.
- `registry/candidates/` contains machine-readable candidate declarations.
- `schemas/` contains language-neutral data contracts.
- `evals/` contains adversarial fixtures used to test admission claims.

Canonical definitions, runtime enforcement, and database projections remain
separate products. Implementations may project Core contracts into code or
storage, but those projections do not become the ontology.

## Current candidate

[Eleven Anti-Limiting Rules](docs/candidates/anti-limiting-classification-doctrine.md)
protect Quirk classification from collapsed hierarchies, adjective inflation,
source-term drift, erased history, tag-based authority, and invisible human
context.

Its machine contract and proof fixtures live beside it:

- `registry/candidates/doctrine.classification.anti_limiting.v0.1.0.yaml`
- `schemas/classification-decision.schema.json`
- `evals/classification/anti-limiting-rules.v0.1.0.yaml`

## Status language

| Status | Meaning |
| --- | --- |
| Candidate | May be discussed, modeled, and tested; has no runtime authority. |
| Approved | Passed a named admission decision with evidence and an accountable authority. |
| Canonical | The approved definition of record for its declared scope and version. |
| Superseded | Preserved historical definition replaced by an explicit successor. |
| Rejected | Preserved proposal that failed or was declined, with its decision record intact. |

## License

No license has been declared yet. Do not infer permissions from repository
visibility.

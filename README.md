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

## Current candidate lineage

[Eleven Anti-Limiting Rules v0.1.0](docs/candidates/anti-limiting-classification-doctrine.md)
was reviewed as a candidate and received an explicit **REVISE** decision. It
remains non-operative and preserved for decision history. The evidence-backed
[v0.2.0 revision](docs/candidates/anti-limiting-classification-doctrine.v0.2.0.md)
is also a candidate; passing its local proof does not admit it to canon.

The revision adds strict machine contracts, positive controls, cross-cutting
authority tests, and deterministic adapters:

- `registry/candidates/doctrine.classification.anti_limiting.v0.2.0.yaml`
- `schemas/classification-decision.v0.2.0.schema.json`
- `evals/classification/anti-limiting-rules.v0.2.0.yaml`
- `decisions/admission/doctrine.classification.anti_limiting.revise.0001.yaml`

Run the candidate proof with Node.js 22:

```sh
npm ci --ignore-scripts
npm test
npm run validate:candidate
```

The validator compiles all candidate schemas in strict Draft 2020-12 mode,
checks all eleven source hashes, executes all 22 adversarial fixtures with
exact result/disposition/finding matching, runs three cross-cutting authority
fixtures and eleven positive controls, and probes the closed schema loopholes.
The GitHub workflow reports proof status only; it has no admission, release, or
deployment authority.

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

# Quirk Core

Quirk Core holds shared meanings, contracts, and invariants. Quirk OS composes and operates capabilities; connected workspaces and runtime stores do not become alternate constitutional authorities merely by containing copies.

## Start here

- [Frozen constitutional and quality contracts v0.2](contracts/v0.2/README.md)
- [Contract governance and required repository enforcement](docs/contracts/governance.md)
- [September 10 working-intent reconciliation](docs/working-intent-2026-09-10.md)

The reconciliation is a **review candidate**, not a contract amendment, deployment receipt, or claim of complete synchronization.

## State must be attributable

Distinguish intended choices, repository content, observed settings, verified behavior, and authorized effects. A document title, folder name, green check, merged commit, or connected app does not prove all five.

At the September 10, 2026 inspection, `main` was `c2e2e3fc62e75b7e23eeed4d22b53b967ed7def9`. GitHub reported `protected: false`, required-check enforcement `off`, and no repository or inherited rulesets. [Issue #4](https://github.com/Quirk-Systems/quirk-core/issues/4) remains the enforcement dependency. A workflow running is not the same as a check being required.

## Open preference work

[PR #2](https://github.com/Quirk-Systems/quirk-core/pull/2) contains the candidate preference-evidence contract and a proposed correction to the legacy [preference-language document](docs/canon/preference-language.md). The main-branch document and the proposed correction disagree about admission and deployment claims. Neither this README nor its merge resolves that disagreement or admits the candidate.

[PR #1](https://github.com/Quirk-Systems/quirk-core/pull/1) remains a separate classification-doctrine candidate. Its evidence and authority must be reviewed independently.

## Verify before reporting completion

The existing conformance command is:

```sh
python contracts/v0.2/check-contract-tranche.py
```

Run it in the repository environment with the dependency declared by the conformance workflow. It checks the frozen digest and expected fixture outcomes; it does not verify repository-policy enforcement, deployed databases, user usefulness, or synchronization across applications.

Do not alter the frozen tranche, fixture expectations, digest, or workflow as an incidental synchronization edit. Follow the existing governance process for amendments.

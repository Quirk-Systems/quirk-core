# Quirk Contracts Governance

## Canonical tranche

`contracts/v0.2/` is the frozen constitutional + quality contract tranche for Quirk Core.

## Required merge gate

The GitHub status check `frozen-contracts-v0.2` must be registered as a required check for `main` in the repository ruleset or branch protection policy.

The workflow intentionally runs on every pull request. Do not add path filters to a required workflow: skipped required workflows can leave pull requests permanently waiting for a status that will never report.

## Change policy

A frozen contract change is not a normal edit. Any amendment must:

1. identify the affected contract and invariant;
2. explain why the current frozen behavior is insufficient;
3. include migration and compatibility analysis;
4. update positive, negative, adversarial, and exemplar fixtures where behavior changes;
5. update the frozen digest intentionally;
6. preserve historical versions rather than rewriting released history;
7. pass `frozen-contracts-v0.2` before merge.

## Human gate

CODEOWNERS identifies the human owner for this tranche. Repository rules should require code-owner review for changes under `contracts/v0.2/` and for the conformance workflow itself.

## Pass condition

The tranche is fully enforced only when all of the following are true:

- `frozen-contracts-v0.2` is required on `main`;
- pull requests are required before merging to `main`;
- code-owner review is required for protected contract paths;
- direct pushes that bypass the ruleset are disallowed except for explicitly authorized emergency administrators;
- the conformance workflow remains green for all 36 fixture outcomes and the frozen digest.

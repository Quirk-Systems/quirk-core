# Enforcement Status

The v0.2 tranche is repository-canonical and validated by the `frozen-contracts-v0.2` GitHub Actions check.

## Enforced in repository content

- Frozen tranche manifest and digest
- Nine machine-readable schemas
- Positive, negative, adversarial, and exemplar fixtures for Contracts 000 and 005–012
- Semantic + structural conformance validator
- Workflow execution on every pull request and every push to `main`
- CODEOWNERS assignment for the tranche and its workflow

## Repository-setting dependency

GitHub repository rules must separately register `frozen-contracts-v0.2` as required for `main`. This file does not claim that repository setting is active until verified through repository rules or branch protection state.

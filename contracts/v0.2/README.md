# Quirk Contracts v0.2 — Canonical Tranche

This directory is the repository-canonical source for the frozen Constitutional + Quality tranche:

- 000 Contract Contract
- 005 Execution Receipt
- 006 Capability
- 007 Action
- 008 Output
- 009 Requirement Trace
- 010 Completion
- 011 Evaluation
- 012 Quality Profile

`TRANCHE.json` declares the frozen contract set, fixture expectations, invariants, and frozen digest.

`fixtures.json` contains positive, negative, adversarial, and exemplar fixtures for every frozen contract.

`check-contract-tranche.py` enforces both the frozen digest and the 36-case conformance matrix. A PR fails when a fixture outcome flips or the frozen payload changes without an explicit tranche update.

The `frozen-contracts-v0.2` GitHub Actions job is the single merge gate for this tranche.

Breaking changes require a versioned amendment rather than silent mutation.

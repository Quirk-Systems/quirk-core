# Exact-digest publishing rule — candidate v0.1.0

Status: **REVIEW CANDIDATE**  
Owning system: **Quirk-Systems/quirk-core**  
Date: **2026-09-12**

This document proposes a composition rule and proof obligations. Its publication records a design candidate. It does not amend the frozen contract tranche, install enforcement, establish a runtime HumanGrant, or report executed security tests. Admission remains subject to [contract governance](../governance.md).

## Purpose

Publish one exact artifact payload only when current evaluation evidence and an independent human grant both permit the same operation.

The central invariant is: **evaluation cannot create, broaden, or substitute for Human Approval**.

## Minimal subject and rule

```text
subject = (
    artifact_id,
    payload_digest,
    operation = "publish",
    destination_id,
    policy_digest
)

on PublishRequested(subject):
    require Policy.is_current(subject.policy_digest)
    require Evaluation.current_pass(subject)
    require HumanAuthority.valid_grant(subject)
    require Payload.matches_immutable_snapshot(subject.payload_digest)

    Publisher.commit_and_dispatch(subject, verified_snapshot)
```

The policy digest makes the policy revision explicit. Destination identity includes the target account or namespace and intended audience. The payload digest identifies the complete final bytes to be published, with the algorithm and serialization specified. A multi-file publication may use an immutable manifest that binds every included file.

A filename, branch, "latest" pointer, destination alias, or policy label is insufficient. A transformation after approval produces a new payload subject requiring its own evidence and grant.

## Independent responsibilities

| Concern | Permitted responsibility | Required boundary |
|---|---|---|
| Evaluating | Record observations and evaluation results. | Cannot issue, alter, or revoke human grants. |
| Human authorizer | Issue a grant from an explicit authenticated human decision for the complete subject. | Validates the human's authority and the decision's scope through an independently controlled authorization path. |
| Composing | Request publication using existing evidence and permission. | Cannot manufacture either record or weaken their acceptance rules. |
| Publishing | Enforce the guard and dispatch the verified payload to the bound destination. | All publication routes cross this boundary. |

An agent-written `approved: true`, a human name in an evaluation, or possession of credentials does not establish an explicit human approval decision. Grant authenticity must come from the trusted authorization path, such as protected records or a verifiable attestation whose issuing authority the evaluator cannot access.

The evaluator and composer must have no capability to modify the grant store, authorizer, publishing guard, or applicable policy, and no alternative publishing credential or bypass route. Distinct field names alone do not establish this separation.

## Predicate meanings

**Current pass:** the authorized evaluation mechanism resolves every result required by the pinned policy as passing. Historical, incomplete, conflicting, unknown, superseded, or invalidated results cannot satisfy this predicate. A previous PASS followed by an authoritative failure is retained as history but is no longer sufficient.

**Valid grant:** a grant authentic to the independent human authorization path binds the complete subject; its human decision and issuer meet authority policy; and it remains effective, unrevoked, unexpired where expiry applies, and within its permitted uses. A grant for artifact A, destination X, or policy P cannot be reused for a different subject.

**Matching immutable snapshot:** the publisher verifies and dispatches the same final payload. It never verifies a digest and later resolves a mutable source that could yield different bytes.

## Authorization commit and revocation

The publishing boundary must define the authorization commit: the ordered point at which it releases the bounded publication request. Policy, authoritative evaluation, grant validity, and payload identity must all be enforced there. A composer checking them earlier is insufficient.

Revocation or invalidation ordered before this commit prevents dispatch. A change ordered afterward affects future uses and does not promise cancellation of a request already released. A queued request must satisfy the guard at dispatch; enqueueing is not permanent permission.

An implementation must demonstrate the ordering between concurrent revocation, invalidation, policy changes, and authorization commit. This document does not claim an atomic transaction across an external publishing service.

Authorization commit, publication attempt, and confirmed publication are separate events. A timeout or lost response produces an unknown outcome. Retry handling must respect the grant's permitted uses and reconcile an uncertain prior attempt before risking a duplicate.

## Why evaluation cannot manufacture approval

Start with a state containing no valid human grant for the subject. Every evaluator transition leaves the grant store and its authority rules unchanged. Therefore any sequence of evaluator transitions, including repeated PASS results, still leaves the publication guard unsatisfied.

This argument depends on the stated capability boundaries and complete mediation of publication. It is a design invariant to prove in an implementation.

## Required proof cases

These are **expected outcomes, not executed test results**.

| Case | Setup or attempted action | Expected outcome |
|---|---|---|
| 1. Matching subject | Current PASS, independent valid grant, matching immutable payload. | Permit only the bound publication. |
| 2. Evaluation-only attack | Repeated PASS results; no human grant; evaluator supplies approval fields. | Block; grant store remains unchanged. |
| 3. One-byte mutation | A passes and receives approval; B changes one byte. | Block B; retain A's evidence and decision. |
| 4. Scope substitution | Change artifact identity, destination, audience, operation, or policy revision. | Block unless that complete subject independently qualifies. |
| 5. Stale evidence | Prior PASS is followed by authoritative FAIL or invalidation. | Block; retain the earlier result as history. |
| 6. Revocation ordering | Revoke before commit; separately test revocation after commit. | Before: block dispatch. After: prevent future unauthorized use without claiming reversal. |
| 7. Boundary bypass | Evaluator or composer tries to mint a grant, alter the guard, or publish directly. | Deny each capability attempt. |
| 8. Payload swap | Replace a mutable source between verification and dispatch. | Publish only the verified snapshot, or block. |
| 9. Ambiguous response | Destination may have accepted the request but confirmation is lost. | Record unknown outcome; reconcile before a duplicate-risk retry. |

## Evidence receipt and admission

A publication receipt identifies the complete subject, authoritative evaluation records, human grant, authorization commit, attempt identifier, destination response, and resulting external identifier when confirmed. Preserve grants, revocations, evaluations, invalidations, attempts, and confirmations without rewriting their history.

The next earned step is review of this candidate. Any claim of enforcement requires independent evidence that the implementation satisfies the guard, capability boundaries, and proof cases above. Existing frozen-tranche conformance checks have their existing scope; passing them does not prove this proposed rule.

## Design source

[Making Software Meaningful](https://arxiv.org/html/2606.11051v1), Eagon Meng, Abutalib Namazov, Carmel Schare, Alcino Cunha, and Daniel Jackson, June 9, 2026, particularly sections 4 and 5.3, motivated separating behavioral concerns and composing them through explicit rules. The exact-digest grant boundary and proof cases here are a Quirk candidate design derived in this conversation, not a claim made or verified by that paper.


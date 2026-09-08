---
id: doctrine.classification.anti_limiting
object_type: CandidateDoctrine
version: 0.1.0
status: candidate
operational_authority: none
proposed_on: 2026-08-11
proposed_by: Bryan
owner: Quirk Core
scope: all classification-bearing Quirk objects, schemas, imports, APIs, agents, interfaces, and projections
supersedes: []
source_kind: direct_human_proposal
---

# Eleven Anti-Limiting Rules

**Candidate classification doctrine for Quirk Core**

> Open ontology. Closed operational admission. Preserve expressive range
> without allowing ambiguity to impersonate authority.

## Admission posture

This document is a **candidate**, not operational canon. It may be referenced
for design, modeling, and evaluation. It must not control Live, Current,
Active, Chooseable, or Useable behavior until it passes Quirk Approval and all
applicable procedure, process, profiling, interoperability, security,
statistical, lexical, and Quirk Pedantry gates.

The rules are intentionally anti-limiting, not anti-structure. They prohibit
semantic shortcuts that make a system appear tidy by hiding important
differences. They do not prohibit hierarchies, subtypes, tags, exclusive sets,
imports, corrections, or human authority when those mechanisms are explicit,
versioned, evidenced, and constrained to the job they actually perform.

## Purpose

Classification is where flexible systems quietly become brittle. A single
tree starts carrying five unrelated meanings. A tag becomes a permission. An
intended result gets reported as evidence. A rejected concept disappears, then
returns six months later wearing a fake mustache.

These rules establish a shared classification contract across Quirk. They keep
invention open while making operational admission conservative, inspectable,
and reversible.

## Normative language

- **MUST** and **MUST NOT** identify admission-blocking requirements.
- **SHOULD** and **SHOULD NOT** identify strong defaults that require a recorded
  exception.
- **MAY** identifies a compatible option.

The eleven source statements are immutable within this candidate lineage.
Interpretations, schemas, examples, and tests may evolve through versioning;
clarification must never silently rewrite the source sentence it explains.

## Required separation model

Every classification-bearing object must expose five independent axes. An
implementation may connect them through typed relationships, but it may not
collapse them into one hierarchy or infer one axis from another.

| Axis | Question answered | Default cardinality | Control consequence |
| --- | --- | --- | --- |
| Identity | What is this object? | One primary kind; zero or more explicit roles | None by itself |
| Purpose | What job is it intended to perform? | Multi-valued | May inform policy; never proves effect |
| Style | How does it express or behave? | Multi-valued facets | Discovery and presentation only unless a typed policy says otherwise |
| State | What lifecycle or operational condition is it in? | One or more declared state dimensions | May affect runtime only through an explicit state policy |
| Authority | Who or what may decide, change, release, or operate it? | Multi-valued policy and principal references | Enforced only by typed authority policy |

Three additional records remain separate from those axes:

- **Effect records** distinguish intended effects from observed effects.
- **Control records** own permissions, routing, retention, and release.
- **Decision records** own provenance, versioning, rejection, and supersession.

## Source rules — preserved verbatim

1. Never make one hierarchy carry identity, purpose, style, state, and authority.
2. Do not treat intended effect as observed effect.
3. Do not turn every useful adjective into a subtype.
4. Do not let code inheritance define the ontology.
5. Do not promote imported terminology into canon without mappings and provenance.
6. Do not erase rejected or superseded objects; preserve their decision history.
7. Do not use other where unknown, unclassified, novel, or not_applicable is more truthful.
8. Do not assume categories are mutually exclusive unless operational safety requires exclusivity.
9. Do not let tags control permissions, routing, retention, or release.
10. Do not mutate historical classifications without versioning or supersession records.
11. Do not require Bryan’s invisible interpretation to resolve a classification at runtime.

## Operational interpretation

### ALR-001 — Keep classification axes independent

**Source rule.** Never make one hierarchy carry identity, purpose, style,
state, and authority.

**Operational reading.** Identity, purpose, style, state, and authority are
separate typed fields or relationships with separate validation. This applies
to hierarchies, graphs, tables, names, folders, prompts, derived fields, and any
other authoritative structure. The source rule's five-part list is not
permission to collapse two, three, or four axes. A UI may present a combined
view, but the combined display is never the source of truth.

**Violation.** `AdminPublishedExperimentalSong` is used as a type and silently
encodes authority, state, style, and identity in one inheritance path.

**Compliant pattern.** `identity.kind = song`, `style = [experimental]`,
`state = published`, and `authority.policy_refs = [policy.release.music]` are
stored independently and connected by an explicit classification decision.

**Ship gate.** Reject any schema or mapping that cannot change one axis without
renaming or reclassifying the others.

### ALR-002 — Separate promises from proof

**Source rule.** Do not treat intended effect as observed effect.

**Operational reading.** An intended effect is a claim about purpose. An
observed effect is an evidence-backed result with an observation time,
measurement method, and evidence reference. The two may be compared but never
coerced into one field.

**Violation.** A capability intended to improve recall is labeled
`improves_recall = true` before any evaluation has observed that result.

**Compliant pattern.** Store `intended_effects = [improve_recall]`; record
`observed_effects` only after an evaluation produces evidence, including null,
negative, contradictory, or context-limited findings.

**Ship gate.** Every observed-effect assertion must resolve to at least one
evidence record. Missing evidence makes the observation invalid, not merely
low confidence.

Result claims must also declare their epistemic kind: `predicted`, `simulated`,
`reported`, `measured`, `inferred`, or `causally_attributed`. Measurement does
not become causal attribution through confident wording.

### ALR-003 — Make subtypes earn their rent

**Source rule.** Do not turn every useful adjective into a subtype.

**Operational reading.** An adjective becomes a subtype only when it introduces
a durable semantic contract: different invariants, required fields, lifecycle,
validation, or interoperable behavior across multiple instances. Descriptive,
temporary, evaluative, tonal, or contextual qualities remain facets.

**Violation.** `beautiful`, `urgent`, `premium`, `experimental`, and `Minnesota`
become nested classes because they are useful filters.

**Compliant pattern.** Keep those qualities as typed facets with provenance,
scope, and validity. Promote one to a subtype only through an explicit subtype
proposal that demonstrates a contract the parent type cannot safely express.

A governed facet is the required middle layer between subtype and free tag. If
the quality changes operational behavior, represent that behavior as a typed
policy fact rather than laundering the tag into a differently named label.

**Ship gate.** A subtype proposal without a distinct invariant or interface is
reclassified as a facet proposal.

### ALR-004 — Keep implementation ancestry subordinate to meaning

**Source rule.** Do not let code inheritance define the ontology.

**Operational reading.** Ontology is declared in language-neutral contracts.
Classes, interfaces, database tables, generated SDKs, and UI components are
projections of that contract. Refactoring implementation inheritance cannot
silently change object meaning.

**Violation.** A TypeScript class extends `Asset`, so every instance is declared
an ontological Asset even though the class was chosen only to reuse storage
methods.

**Compliant pattern.** The object references a versioned type declaration.
Implementations publish explicit mappings from that declaration to code and may
use composition, inheritance, or another mechanism without redefining canon.

**Ship gate.** At least one non-code representation must completely state the
type contract, and projection tests must detect semantic drift.

### ALR-005 — Quarantine imported meaning until it is mapped

**Source rule.** Do not promote imported terminology into canon without
mappings and provenance.

**Operational reading.** Imported terms remain source terms until a mapping
record identifies the source, source version, original definition, Quirk target
or proposed target, transformation, confidence, collisions, and accountable
decision.

Import status follows semantic origin, not spelling. Renaming or paraphrasing
an external concept does not make it native.

**Violation.** An external framework calls an object an `agent`, so Quirk adopts
that label while inheriting unstated assumptions about autonomy and authority.

**Compliant pattern.** Preserve the raw source term, register its provenance,
map it to one or more Quirk concepts, and keep the mapping reversible. A mapping
may explicitly conclude `no_equivalent`.

**Ship gate.** Imported language cannot become Canonical until its mapping is
reviewed and the original source remains traceable.

### ALR-006 — Preserve the argument, not necessarily forbidden payloads

**Source rule.** Do not erase rejected or superseded objects; preserve their
decision history.

**Operational reading.** Rejection and supersession create durable decision
records. The record preserves what was decided, why, by whom or what authority,
against which evidence, and what replaced it. It does not guarantee indefinite
retention of sensitive, copyrighted, unsafe, or legally erasable payloads.

**Violation.** A rejected type is deleted, causing the same proposal to be
reintroduced later with no access to the earlier findings.

**Compliant pattern.** Retain a tombstone and non-sensitive decision record.
When payload deletion is required, record the deletion basis and preserve only
the minimum lawful metadata needed to explain the historical decision.

**Ship gate.** No rejection or supersession operation may complete without a
decision record or an explicit, higher-authority erasure record.

### ALR-007 — Name uncertainty honestly

**Source rule.** Do not use other where unknown, unclassified, novel, or
not_applicable is more truthful.

**Operational reading.** Every classification axis uses an explicit resolution
state:

- `unknown`: a relevant value exists, but available evidence cannot identify it.
- `unclassified`: the axis has not yet been assessed.
- `novel`: evidence suggests a meaningful value that the current vocabulary
  cannot represent.
- `not_applicable`: the axis does not apply to this object in the declared scope.

`other` is not a default escape bucket. It is permitted only when faithfully
preserving an external source value or when a bounded closed vocabulary defines
an explicit residual class; the raw value and vocabulary reference must remain
attached.

The resolution vocabulary may also distinguish `withheld`, `redacted`,
`not_collected`, `unavailable`, `invalid`, `ambiguous`, `conflicting`, and
`error`. These are not synonyms for `unknown`; each names a materially different
reason the value cannot be supplied.

**Ship gate.** A validator must reject unqualified `other`, empty strings,
sentinel zeros, and nulls used to hide a known uncertainty state.

### ALR-008 — Default to overlap; require proof for exclusion

**Source rule.** Do not assume categories are mutually exclusive unless
operational safety requires exclusivity.

**Operational reading.** Categories and facets are multi-valued by default.
Exclusivity is a versioned policy with a scope, safety rationale, authority,
conflict behavior, and test evidence. Convenience, UI simplicity, and database
shape are not safety rationales.

**Violation.** An object must be either `educational` or `entertaining` because
a dropdown component accepts one value.

**Compliant pattern.** Store both classifications. If two runtime states truly
cannot coexist, reference an exclusive-set policy and reject or queue the
conflict through a declared behavior.

**Ship gate.** Every exclusive set must name the harm prevented and demonstrate
that a less restrictive representation cannot prevent it.

### ALR-009 — Keep folksonomy out of the control plane

**Source rule.** Do not let tags control permissions, routing, retention, or
release.

**Operational reading.** Tags are descriptive annotations for discovery,
grouping, and exploration. Control decisions use typed, authenticated,
versioned policy inputs. A tag may trigger a proposal for a control change, but
it cannot enact that change.

Here, `tag` means any unmanaged descriptive marker regardless of its local
name: tag, label, annotation, folder, badge, topic, or color. A Git tag or other
signed reference may address a release candidate, but the reference itself
cannot authorize promotion.

**Violation.** Adding `public`, `delete-after-30-days`, or `admin` changes who
can read an object, how it is routed, when it is removed, or whether it ships.

**Compliant pattern.** Control fields reference release, retention, routing, and
authorization policies. Identically named tags have no control effect.

**Ship gate.** Mutation tests add hostile control-shaped tags and verify that
permissions, routing, retention, and release remain unchanged.

### ALR-010 — Make classification history append-only

**Source rule.** Do not mutate historical classifications without versioning or
supersession records.

**Operational reading.** A changed classification creates a new immutable
assertion with effective time, reason, authority, provenance, and a
`supersedes` reference. Historical reads can reconstruct what the system knew
and enforced at any relevant time.

Effective time and recorded time remain distinct. Incrementing a version number
without preserving an immutable predecessor and explicit lineage is fake
compliance.

**Violation.** A record changes from `draft` to `approved` in place, destroying
the prior classification and the basis for decisions made while it was draft.

**Compliant pattern.** Close the prior assertion's validity interval, append a
new assertion, and link the two. Corrections use the same mechanism; they do not
rewrite history.

**Ship gate.** Update and delete operations against historical assertions fail
closed unless an explicit erasure policy authorizes a privacy or legal remedy.

### ALR-011 — Ship the interpretation, not the interpreter

**Source rule.** Do not require Bryan’s invisible interpretation to resolve a
classification at runtime.

**Operational reading.** Runtime behavior must resolve from inspectable schemas,
definitions, mappings, policies, decision records, defaults, and conflict
rules. Bryan or another human authority may decide; the decision must be typed,
recorded, and sufficient for a competent operator or agent without personal
context.

`Bryan` is the named sentinel for any irreplaceable hidden-human context. The
rule applies equally when the hidden interpreter is a founder, expert, operator,
maintainer, resident, or model with private conversation memory.

**Violation.** A classifier returns `needs Bryan` because the distinction lives
only in conversation, taste, or remembered intent.

**Compliant pattern.** Ambiguity fails closed, records the unresolved fields and
evidence, and creates a typed Proposed Move. Once approved, the resulting
decision record—not the private explanation—becomes the runtime input.

**Ship gate.** Run the `Ship It Without Bryan` tribunal against novel,
conflicting, incomplete, imported, and adversarial cases. Hidden-context
dependency is a blocker, not a documentation nit.

## Classification decision contract

A runtime classification decision is valid only when it provides:

1. An immutable decision ID, schema version, object reference, and assertion
   time.
2. Separate identity, purpose, style, state, and authority axis records.
3. An explicit resolution state for every axis.
4. Separate intended-effect and observed-effect collections.
5. Evidence references for every observed effect.
6. Provenance for direct, derived, generated, and imported assertions.
7. Typed control-policy references separate from tags.
8. An initial or supersession change mode with required history links.
9. Inspectable interpretation inputs sufficient to reproduce the decision.
10. A Proposed Move reference whenever novelty or unresolved conflict blocks
    safe resolution.

The JSON Schema in `schemas/classification-decision.schema.json` defines the
candidate transport contract. Runtime implementations may add fields but may
not weaken these invariants without a versioned doctrine decision.

Resolution states must round-trip without loss. `unknown`, `unclassified`,
`novel`, `not_applicable`, `withheld`, `redacted`, `not_collected`,
`unavailable`, `invalid`, `ambiguous`, `conflicting`, and `error` remain
distinct; `other` is represented only as a qualified external or closed-set
value, never as a resolution state.

## Explicit exception records

Exceptions are narrow policy objects, not footnotes or conversational favors.
An exception must declare its rule, scope, authority, reason, start and end
conditions, evidence, review date, and fallback behavior.

Three exceptions require first-class treatment:

- **Mandated erasure:** ALR-006 and ALR-010 preserve lawful, non-sensitive
  decision history only to the extent permitted. A higher-authority privacy or
  legal erasure policy may remove payloads or assertions and must leave the
  minimum lawful audit signal, or no signal when even that is prohibited.
- **External `other`:** ALR-007 permits lossless import of a source system's
  literal `other`; Quirk preserves it as a raw external value and does not
  silently treat it as an internal resolution state.
- **Safety exclusivity:** ALR-008 permits mutually exclusive values only through
  an explicit policy that identifies the prevented harm and passes adversarial
  tests.

No exception may grant authority merely because a system is capable of
performing the restricted action.

## Admission gates

| Gate | Required proof before approval |
| --- | --- |
| Quirk Approval | Named decision authority, recorded vote or decision, scope, version, and outcome |
| Procedures | Repeatable authoring, review, exception, rejection, supersession, and erasure procedures |
| Processes | Defined lifecycle, owners, queues, service expectations, and escalation behavior |
| Profiling | Representative object profiles across systems, object types, and uncertainty states |
| Interoperability | Round-trip mappings across at least two implementation stacks without semantic loss |
| Security | Threat model covering tag injection, authority confusion, import poisoning, and history tampering |
| Statistical | Measurement plan for classifier error, abstention, drift, disagreement, and evidence quality |
| Lexical | Definitions, collisions, aliases, prohibited shortcuts, and import mappings reviewed |
| Quirk Pedantry | Edge cases, literal readings, contradictions, naming seams, and hidden-context dependency tested |

## Minimum adversarial suite

The doctrine does not earn operational status until the eval suite proves all
of the following:

- Changing style does not change identity, state, or authority.
- An intended effect cannot satisfy an observed-effect query.
- Descriptive adjectives do not create types without contracts.
- Refactoring implementation inheritance does not change ontology.
- Imported terms remain non-canonical without mapping records.
- Rejection and supersession preserve lawful decision history.
- `other` cannot hide unknown, unclassified, novel, or not-applicable states.
- Multi-label classifications survive round trips unless a safety policy forbids
  overlap.
- Hostile tags cannot change control outcomes.
- Historical classifications cannot be rewritten in place.
- A runtime with no access to Bryan's private context either resolves from
  explicit records or fails closed into a Proposed Move.

The candidate eval file supplies at least two fixtures per rule: one direct
violation and one deceptively plausible case designed to catch superficial
validators.

## Acceptance criteria

| ID | Criterion | Required proof |
| --- | --- | --- |
| AC-01 | The eleven source statements remain verbatim and individually hashed. | Source-integrity check and reviewed semantic diff |
| AC-02 | The five axes are independently authoritative in every supported representation. | Schema validation and cross-axis mutation tests |
| AC-03 | Intent, observation, inference, and causal attribution remain distinct. | Evidence and claim-kind tests |
| AC-04 | Subtypes require durable invariants; governed facets and policy facts cover the middle. | Subtype necessity review and counterexamples |
| AC-05 | Ontology survives code-inheritance refactoring without semantic change. | Projection mapping and refactor test |
| AC-06 | Conceptual imports remain namespaced and traceable even after renaming. | Provenance, license or use-basis, and mapping fixtures |
| AC-07 | Rejection, supersession, and authorized erasure produce lawful decision records. | History lookup, tombstone, and erasure tests |
| AC-08 | Every uncertainty and absence reason round-trips distinctly. | Resolution-state matrix |
| AC-09 | Overlap is preserved unless a typed exclusivity policy proves necessity. | Multi-label and exclusive-set adversarial tests |
| AC-10 | No descriptive marker directly or transitively changes protected control behavior. | Tag, label, annotation, folder, and Git-ref mutation tests |
| AC-11 | Historical assertions are append-only, bitemporal, and linked. | Supersession and time-travel reconstruction tests |
| AC-12 | Clean-context operators resolve or abstain without invisible human context. | `Ship It Without Bryan` tribunal |
| AC-13 | Capability cannot admit the doctrine or grant its own exception. | Separation-of-authority self-promotion test |
| AC-14 | Migration and rollback behavior exist before enforcement. | Dry run, semantic diff, and rollback proof |

## Failure behavior

When a classification cannot satisfy this doctrine, the runtime must not guess.
It must:

1. Preserve the raw input and provenance allowed by policy.
2. Identify the unresolved axes, rules, and evidence gaps.
3. Prevent unsafe control or release consequences.
4. Emit a typed Proposed Move with a stable ID and accountable queue.
5. Resume only from an explicit decision, policy, or approved default.

Abstention is a valid classification outcome. Ambiguity with undeclared side
effects is not.

## Decision record

| Field | Value |
| --- | --- |
| Candidate ID | `doctrine.classification.anti_limiting` |
| Version | `0.1.0` |
| Provenance | Direct human proposal supplied by Bryan on 2026-08-11 |
| Status | Candidate; non-operative |
| Canonical successor | None |
| Supersedes | None |
| Runtime effect | None until admission |
| Required next decision | Run the full admission gates and record approve, revise, reject, or supersede |

## Release criterion

This candidate ships only when another capable operator or agent can classify
the adversarial suite, explain every decision from inspectable records, and
reach the same control outcome without access to Bryan's unrecorded intent.

Bryan may decide. Runtime must carry the decision—not reconstruct Bryan.


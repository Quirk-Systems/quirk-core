# Quirk Preference Language

Status: **CANON**  
Owner: **Quirk Preference**  
Effective: 2026-08-11

## Canonical vocabulary

### Quirk Preference
The bounded technical system responsible for capturing, interpreting, governing, resolving, and applying contextual preference intelligence.

### Quirk Preferences
A derived, authorized, purpose-specific projection of the Preference Graph. `Preferences` is a view or collection surface, never the canonical store.

### Quirk Preference Graph
The canonical relationship model connecting subjects, options, attributes, objectives, contexts, evidence, decisions, outcomes, exceptions, contradictions, permissions, and change over time.

### Preference Reference
An immutable, addressable provenance object containing evidence that may support, oppose, qualify, or contextualize a preference conclusion.

### Quirk Preference References
The evidence collection / registry. It is not a second preference system.

### Preference Edge
A contextual, reversible graph relation representing a preference conclusion derived from evidence or explicitly declared as a system default.

### Preference Basis
The immutable decision receipt identifying the exact preference edges and references selected to govern one preference-sensitive Move, including exclusions, contradictions, authority resolution, and policy version.

## Foundational distinction

```text
Reference != Signal != Preference != Rule
```

A Reference records evidence. A Signal is an interpretation of evidence. A Preference Edge is a contextual directional conclusion. A Rule is a binding constraint and must never be silently downgraded into weighted preference evidence.

## PreferenceEdge validation invariant

**CANON: validation is fail-closed.**

No `PreferenceEdge` may validate, persist, become Active/Current/Chooseable/Useable, or participate in a `PreferenceBasis` unless all of the following are explicitly present and non-empty:

1. `purpose`
2. `context`
3. `authority`
4. `validity`
5. provenance satisfying at least one of:
   - `reference_id` points to a valid `PreferenceReference`; or
   - `system_default = true` is explicitly declared.

Formally:

```text
VALID(edge) :=
  nonempty(edge.purpose)
  AND nonempty(edge.context)
  AND nonempty(edge.authority)
  AND nonempty(edge.validity)
  AND (edge.reference_id != null OR edge.system_default == true)
```

Absence is not neutrality. Missing semantics or provenance makes the edge invalid.

## Provenance rule

`system_default` is an explicit provenance class, not an implicit fallback. It defaults to `false`. An edge without a `reference_id` is invalid unless its producer deliberately sets `system_default = true`.

This prevents inferred, accidental, legacy, or model-generated state from acquiring preference authority merely because provenance was omitted.

## Runtime projection

```text
Preference Reference
        -> Preference Signal / Event
        -> Preference Edge
        -> Preference Graph
        -> Preference Basis
        -> Preference-sensitive Move
        -> Observed Outcome
        -> New Reference
```

Canonical records must preserve enough lineage to reconstruct why an edge existed and why it affected a Move.

## Storage contract

The current Supabase projection uses:

- `public.preference_references`
- `public.preference_edges`

Database constraints enforce the canonical `PreferenceEdge` invariant independently of application validation.

`preference_edges_required_semantics_check` rejects empty `purpose`, `context`, `authority`, or `validity`.

`preference_edges_provenance_check` rejects any edge lacking both a `reference_id` and explicit `system_default = true`.

The reference foreign key uses `ON DELETE RESTRICT`: provenance supporting a persisted edge cannot disappear underneath that edge.

The preference tables are private-by-default: RLS is enabled and `anon` / `authenticated` table privileges are revoked until Quirk Preference access policies are separately designed, approved, and canonized.

## Architectural rule

Application schemas may make the invariant stricter but never weaker. TypeScript, API, agent-skill, import, migration, and UI validators must reproduce or strengthen the database invariant. The database remains the final fail-closed enforcement boundary.

## Product vocabulary mapping

| Technical vocabulary | Quirk product language |
| --- | --- |
| Quirk Preference | Quirk Gravity |
| Preference Graph | Gravity Graph |
| Context partition | Gravity Field |
| Preference runtime | Gravity Engine |
| Preference References + Preference Basis | Gravity Trace |
| Preference change event | Gravity Shift |
| Portable preference projection | Gravity Print |
| Human authority interface | Gravity Controls |

Technical vocabulary is canonical for schemas, APIs, contracts, interoperability, tests, and migrations. Product vocabulary may be used on human-facing surfaces without changing the underlying object semantics.

## Acceptance tests

A compliant implementation MUST prove all of these:

- reference-backed edge with all required semantics: ACCEPT
- explicit system-default edge with all required semantics: ACCEPT
- edge with neither reference nor explicit system default: REJECT
- edge with empty purpose: REJECT
- edge with empty context: REJECT
- edge with empty authority: REJECT
- edge with empty validity: REJECT
- deletion of a referenced provenance row while an edge depends on it: REJECT
- application validator cannot bypass database enforcement: REJECT

## Change control

Changes to these meanings or validation requirements are governance changes, not ordinary refactors. Any weakening of the invariant requires an explicit Proposed Move, evidence, compatibility analysis, migration plan, and Quirk Approval before admission.
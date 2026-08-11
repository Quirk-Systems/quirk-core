# Supabase Candidate Projection — Quirk Core PR #1

**Posture:** proposal only · candidate only · no live database change

This pack projects evidence about
`doctrine.classification.anti_limiting@0.1.0` into PostgreSQL without making the
projection canonical, operational, or authoritative. It is designed for a
local Supabase stack or disposable database branch before any consideration of
`quirk-os-alpha`.

## Boundary contract

| Layer | Source of truth | Allowed responsibility | Explicitly prohibited |
| --- | --- | --- | --- |
| Canonical | Git-backed, admitted Quirk Core definitions and signed decision records | Define versioned meaning and governance contracts | Reading projection rows as canon |
| Runtime | Separately admitted authority and policy engine | Authenticate actors, resolve authority, execute admitted policy, issue typed abstentions | Treating capability, role membership, a tag, or a database grant as governance authority |
| Projection | `quirk_core_private` tables in this pack | Preserve immutable evidence, fixture executions, Proposed Moves, and externally authorized decision projections | Canonizing a candidate, changing runtime status, granting authority, or editing history |

The migration repeats `projection_posture = 'candidate_only'` and
`operational_effect = 'none'` as database constraints. Even a projected
`approve` decision cannot change canon or runtime state.

## What the migration creates

- `quirk_core_private.gate_evidence` — one immutable result for each named gate
  in an evaluation run.
- `quirk_core_private.fixture_results` — executable results for the exact 22
  adversarial fixtures. An executed result requires adapter, runner, evidence,
  disposition, finding codes, timestamps, and SHA-256-shaped digests. Fixture
  IDs, adapters, expected dispositions, and expected finding codes are fixed to
  the candidate manifest so an ingestion capability cannot rewrite the test.
- `quirk_core_private.proposed_moves` — typed, versioned abstentions and repair
  requests. Revisions use explicit predecessor foreign keys.
- `quirk_core_private.admission_decisions` — immutable projections of decisions
  made by an external authority source.
- Three dormant `NOLOGIN`, `NOINHERIT`, `NOBYPASSRLS` roles. The migration
  grants no membership to any login or Supabase API role.
- Forced RLS, narrow grants, explicit policies, restrictive foreign keys, and
  mutation-rejecting triggers on all four ledgers.

This v0.1 review projection deliberately rejects every `approve` row. Its exact
22-fixture ledger preserves the evidence gap, but the original suite contains
only expected failures and therefore cannot disprove a reject-everything
validator. Approval remains unrepresentable until a later, separately reviewed
projection models the v0.2 positive controls and cross-cutting authority tests.
`revise`, `reject`, and `supersede` decisions can be mirrored with their
blockers and minimum changes.

## Capability is not authority

| Dormant role | May do | Cannot do |
| --- | --- | --- |
| `quirk_projection_ingest` | Append gate evidence, fixture results, and Proposed Moves | Insert admission decisions; update or delete history |
| `quirk_admission_mirror` | Read the proof set and append a decision projection | Manufacture gate evidence or fixture results; authorize itself; mutate history |
| `quirk_projection_reader` | Read the private projection | Write anything or gain operational authority |

Technical role membership is still only a database capability. A future
runtime must validate the referenced external decision, digest, actor, scope,
and current authority before it may `SET ROLE quirk_admission_mirror`. This pack
does not grant that membership and cannot prove that an arbitrary
`authority.*` reference is legitimate.

## Supabase posture and current project findings

The following were supplied as the current `quirk-os-alpha` findings for this
review and were not changed by this work:

- application tables currently live in `public`;
- 13 tables are reported as RLS-enabled with no policies;
- the `vector` extension is installed in `public`.

This proposal deliberately does **not** repair those 13 notices, change the
Data API exposed-schema list, relocate `vector`, modify `public`, or touch live
data. Those are independent security/migration decisions and remain blockers
for a production rollout assessment.

Supabase currently treats grants and RLS as separate security layers. New
projects default to opt-in Data API grants as of May 30, 2026, with the same
behavior scheduled for existing projects on October 30, 2026. This pack avoids
the ambiguity by using a private schema, explicitly revoking
`anon`/`authenticated`/`service_role`, enabling and forcing RLS, and granting
only dormant internal roles. See the official guidance:

- <https://supabase.com/docs/guides/api/securing-your-api>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>
- <https://supabase.com/changelog/45329-breaking-change-tables-not-exposed-to-data-and-graphql-api-automatically>

The migration does not create or alter any extension. Supabase also deprecated
pinning extension versions on August 5, 2026, so any later extension migration
must use the platform default version and be reviewed separately.

## Verification

Apply only to a disposable local database or Supabase branch, then run:

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f projections/supabase/migrations/20260811183747_candidate_admission_projection.sql

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 \
  -f projections/supabase/tests/001_candidate_projection_verification.sql
```

Before adoption, also run the current Supabase database and security advisors,
inspect the branch's exposed schemas and grants, and record their outputs as
gate evidence. The SQL verification rolls back all test rows.

## Migration and rollback posture

This file lives under `projections/supabase/` because it is a proposal, not an
adopted Supabase migration. The local CLI could not create a migration in this
workspace because its configuration directory is read-only. Before adoption,
generate the real migration filename with the current
`supabase migration new` command and copy the reviewed SQL into that generated
file.

Rollback is intentionally not a generic `DROP SCHEMA ... CASCADE` script:

1. Before any evidence is written, an isolated branch may discard the branch.
2. After any evidence or decision exists, preserve it. Revoke newly assigned
   runtime memberships, append a superseding migration/decision, and retain the
   lawful audit record.
3. Never use rollback to erase a rejected or superseded candidate's decision
   history.

## Open proof blockers

- No live or branch database was mutated or queried by this pack.
- The migration has not been executed against the target Postgres version.
- Supabase advisors have not been run against the proposed schema.
- Authority-reference authenticity and revocation require an external runtime
  contract; a regex is typing, not authorization.
- The projection records the v0.1 review only and cannot represent approval;
  v0.2 positive-control and authority evidence needs a separately reviewed
  schema revision.
- The 13 existing RLS/no-policy notices and the public `vector` extension need
  separately scoped decisions before production deployment.

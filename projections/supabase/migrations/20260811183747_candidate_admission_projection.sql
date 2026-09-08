-- Quirk Core PR #1 — candidate-only Supabase projection proposal.
--
-- DO NOT APPLY TO quirk-os-alpha until this migration, its source doctrine,
-- and its runtime authority contract have independently passed admission.
-- This proposal intentionally does not touch public tables, existing policies,
-- exposed schemas, or the vector extension currently installed in public.
--
-- A row in this schema is evidence or a projection. It cannot canonize a
-- candidate, grant operational status, or turn a capability into authority.

begin;

create schema quirk_core_private;

comment on schema quirk_core_private is
  'Private, candidate-only projection for Quirk Core admission evidence. Not canon and not a runtime authority source.';

revoke all privileges on schema quirk_core_private
  from public, anon, authenticated, service_role;

alter default privileges in schema quirk_core_private
  revoke all privileges on tables from public, anon, authenticated, service_role;
alter default privileges in schema quirk_core_private
  revoke all privileges on sequences from public, anon, authenticated, service_role;
alter default privileges in schema quirk_core_private
  revoke execute on functions from public, anon, authenticated, service_role;

-- These roles are deliberately NOLOGIN and receive no membership in this
-- migration. A later, separately admitted runtime may SET ROLE only after it
-- authenticates the external capability or authority decision.
-- Role-name collisions fail the transaction. Reusing a pre-existing role could
-- silently inherit memberships or attributes that this proposal never admitted.
create role quirk_projection_ingest
  nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
create role quirk_projection_reader
  nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;
create role quirk_admission_mirror
  nologin nosuperuser nocreatedb nocreaterole noinherit noreplication nobypassrls;

comment on role quirk_projection_ingest is
  'Dormant capability role: append gate evidence, fixture results, and Proposed Moves; cannot record admission decisions.';
comment on role quirk_projection_reader is
  'Dormant read role for the private candidate projection; reading projection data grants no authority.';
comment on role quirk_admission_mirror is
  'Dormant mirror role: append externally authorized admission decisions after proof checks; not itself governance authority.';

create table quirk_core_private.gate_evidence (
  evidence_ref text primary key,
  subject_ref text not null default 'doctrine.classification.anti_limiting',
  subject_version text not null default '0.1.0',
  evaluation_run_ref text not null,
  gate_id text not null,
  gate_result text not null,
  method_ref text not null,
  assessor_kind text not null,
  assessor_ref text not null,
  evidence_refs text[] not null,
  evidence_digest text not null,
  finding_codes text[] not null default '{}'::text[],
  confidence numeric(4, 3) not null,
  captured_at timestamptz not null,
  projection_posture text not null default 'candidate_only',
  operational_effect text not null default 'none',

  constraint gate_evidence_ref_typed check (evidence_ref ~ '^evidence\.[a-z0-9][a-z0-9._-]*$'),
  constraint gate_evidence_subject check (subject_ref = 'doctrine.classification.anti_limiting'),
  constraint gate_evidence_subject_version check (subject_version = '0.1.0'),
  constraint gate_evidence_run_typed check (evaluation_run_ref ~ '^eval_run\.[a-z0-9][a-z0-9._-]*$'),
  constraint gate_evidence_gate_known check (gate_id in (
    'quirk_approval',
    'procedures',
    'processes',
    'profiling',
    'interoperability',
    'security',
    'statistical',
    'lexical',
    'quirk_pedantry',
    'ship_it_without_bryan',
    'separation_of_authority',
    'migration_and_rollback'
  )),
  constraint gate_evidence_result_known check (gate_result in ('pass', 'fail', 'indeterminate', 'not_run')),
  constraint gate_evidence_method_typed check (method_ref ~ '^method\.[a-z0-9][a-z0-9._-]*$'),
  constraint gate_evidence_assessor_kind_known check (assessor_kind in ('human', 'agent', 'capability', 'tool', 'panel')),
  constraint gate_evidence_assessor_present check (length(btrim(assessor_ref)) >= 3),
  constraint gate_evidence_refs_present check (cardinality(evidence_refs) > 0),
  constraint gate_evidence_digest_sha256 check (evidence_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint gate_evidence_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint gate_evidence_candidate_only check (projection_posture = 'candidate_only'),
  constraint gate_evidence_no_operational_effect check (operational_effect = 'none'),
  unique (subject_ref, subject_version, evaluation_run_ref, gate_id)
);

comment on table quirk_core_private.gate_evidence is
  'Append-only evidence for the twelve named admission gates. A pass is evidence, never authority.';

create table quirk_core_private.fixture_results (
  evaluation_run_ref text not null,
  fixture_id text not null,
  rule_id text not null,
  suite_ref text not null default 'eval.classification.anti_limiting@0.1.0',
  fixture_digest text not null,
  adapter_ref text not null,
  adapter_contract_ref text,
  runner_ref text,
  runner_version text,
  runner_digest text,
  execution_status text not null,
  expected_result text not null,
  observed_result text,
  expected_disposition text not null,
  observed_disposition text,
  expected_finding_codes text[] not null,
  observed_finding_codes text[] not null default '{}'::text[],
  evidence_refs text[] not null default '{}'::text[],
  evidence_digest text,
  executed_at timestamptz,
  projection_posture text not null default 'candidate_only',
  operational_effect text not null default 'none',
  expectation_met boolean generated always as (
    execution_status = 'executed'
    and observed_result = expected_result
    and observed_disposition = expected_disposition
    and expected_finding_codes <@ observed_finding_codes
  ) stored,

  primary key (evaluation_run_ref, fixture_id),
  constraint fixture_results_run_typed check (evaluation_run_ref ~ '^eval_run\.[a-z0-9][a-z0-9._-]*$'),
  constraint fixture_results_fixture_known check (fixture_id in (
    'E-ALR-001-01', 'E-ALR-001-02',
    'E-ALR-002-01', 'E-ALR-002-02',
    'E-ALR-003-01', 'E-ALR-003-02',
    'E-ALR-004-01', 'E-ALR-004-02',
    'E-ALR-005-01', 'E-ALR-005-02',
    'E-ALR-006-01', 'E-ALR-006-02',
    'E-ALR-007-01', 'E-ALR-007-02',
    'E-ALR-008-01', 'E-ALR-008-02',
    'E-ALR-009-01', 'E-ALR-009-02',
    'E-ALR-010-01', 'E-ALR-010-02',
    'E-ALR-011-01', 'E-ALR-011-02'
  )),
  constraint fixture_results_rule_known check (rule_id in (
    'ALR-001', 'ALR-002', 'ALR-003', 'ALR-004', 'ALR-005', 'ALR-006',
    'ALR-007', 'ALR-008', 'ALR-009', 'ALR-010', 'ALR-011'
  )),
  constraint fixture_results_rule_matches_fixture check (fixture_id like 'E-' || rule_id || '-%'),
  constraint fixture_results_suite_exact check (suite_ref = 'eval.classification.anti_limiting@0.1.0'),
  constraint fixture_results_fixture_digest_sha256 check (fixture_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint fixture_results_adapter_typed check (adapter_ref ~ '^adapter\.[a-z0-9][a-z0-9._-]*$'),
  constraint fixture_results_execution_status_known check (execution_status in (
    'executed', 'not_run', 'adapter_missing', 'invalid_fixture', 'error'
  )),
  constraint fixture_results_expected_result_known check (expected_result in ('pass', 'fail')),
  constraint fixture_results_observed_result_known check (
    observed_result is null or observed_result in ('pass', 'fail', 'indeterminate', 'error')
  ),
  constraint fixture_results_expected_findings_present check (cardinality(expected_finding_codes) > 0),
  constraint fixture_results_adapter_matches_manifest check (
    adapter_ref = case fixture_id
      when 'E-ALR-001-01' then 'adapter.classification_document'
      when 'E-ALR-001-02' then 'adapter.classification_document'
      when 'E-ALR-002-01' then 'adapter.effect_record'
      when 'E-ALR-002-02' then 'adapter.result_claim'
      when 'E-ALR-003-01' then 'adapter.subtype_proposal'
      when 'E-ALR-003-02' then 'adapter.subtype_proposal'
      when 'E-ALR-004-01' then 'adapter.ontology_projection'
      when 'E-ALR-004-02' then 'adapter.migration_event'
      when 'E-ALR-005-01' then 'adapter.import_admission'
      when 'E-ALR-005-02' then 'adapter.import_admission'
      when 'E-ALR-006-01' then 'adapter.disposition_event'
      when 'E-ALR-006-02' then 'adapter.disposition_event'
      when 'E-ALR-007-01' then 'adapter.classification_document'
      when 'E-ALR-007-02' then 'adapter.normalization_pipeline'
      when 'E-ALR-008-01' then 'adapter.exclusivity_policy'
      when 'E-ALR-008-02' then 'adapter.interface_trace'
      when 'E-ALR-009-01' then 'adapter.policy_ast'
      when 'E-ALR-009-02' then 'adapter.release_workflow'
      when 'E-ALR-010-01' then 'adapter.persistence_event'
      when 'E-ALR-010-02' then 'adapter.classification_document'
      when 'E-ALR-011-01' then 'adapter.runtime_resolution'
      when 'E-ALR-011-02' then 'adapter.runtime_trace'
    end
  ),
  constraint fixture_results_expectation_matches_manifest check (
    expected_result = 'fail'
    and expected_disposition = case fixture_id
      when 'E-ALR-001-01' then 'reject'
      when 'E-ALR-001-02' then 'reject'
      when 'E-ALR-002-01' then 'reject_claim'
      when 'E-ALR-002-02' then 'reject_claim'
      when 'E-ALR-003-01' then 'convert_to_facet_proposal'
      when 'E-ALR-003-02' then 'reject'
      when 'E-ALR-004-01' then 'reject'
      when 'E-ALR-004-02' then 'block_projection'
      when 'E-ALR-005-01' then 'quarantine_import'
      when 'E-ALR-005-02' then 'quarantine_import'
      when 'E-ALR-006-01' then 'block_disposition'
      when 'E-ALR-006-02' then 'block_disposition'
      when 'E-ALR-007-01' then 'reject_classification'
      when 'E-ALR-007-02' then 'quarantine'
      when 'E-ALR-008-01' then 'reject'
      when 'E-ALR-008-02' then 'block_release'
      when 'E-ALR-009-01' then 'fail_closed'
      when 'E-ALR-009-02' then 'block_release'
      when 'E-ALR-010-01' then 'reject_mutation'
      when 'E-ALR-010-02' then 'reject'
      when 'E-ALR-011-01' then 'block_release'
      when 'E-ALR-011-02' then 'fail_closed_and_propose_move'
    end
    and expected_finding_codes = case fixture_id
      when 'E-ALR-001-01' then array['five_axes_not_independently_authoritative']
      when 'E-ALR-001-02' then array['cross_axis_compound_encoding']
      when 'E-ALR-002-01' then array['intent_observation_conflated', 'observation_without_evidence']
      when 'E-ALR-002-02' then array['causal_attribution_unsupported']
      when 'E-ALR-003-01' then array['subtype_without_durable_invariant']
      when 'E-ALR-003-02' then array['tag_laundered_as_type', 'missing_middle_contract']
      when 'E-ALR-004-01' then array['code_inheritance_is_only_semantic_basis']
      when 'E-ALR-004-02' then array['implementation_refactor_mutates_ontology']
      when 'E-ALR-005-01' then array['import_provenance_missing', 'import_mapping_missing']
      when 'E-ALR-005-02' then array['conceptual_import_laundering']
      when 'E-ALR-006-01' then array['decision_history_erased']
      when 'E-ALR-006-02' then array['minimum_lawful_history_not_preserved']
      when 'E-ALR-007-01' then array['other_used_as_resolution']
      when 'E-ALR-007-02' then array['resolution_states_do_not_round_trip']
      when 'E-ALR-008-01' then array['exclusivity_without_safety_or_integrity_basis']
      when 'E-ALR-008-02' then array['interface_silently_collapses_cardinality']
      when 'E-ALR-009-01' then array['tag_controls_permission']
      when 'E-ALR-009-02' then array['git_reference_substitutes_for_release_authority']
      when 'E-ALR-010-01' then array['historical_assertion_overwritten']
      when 'E-ALR-010-02' then array['version_increment_without_lineage']
      when 'E-ALR-011-01' then array['implicit_human_context_dependency']
      when 'E-ALR-011-02' then array['hidden_context_reconstruction', 'unsafe_ambiguity_promotion']
    end
  ),
  constraint fixture_results_executed_has_proof check (
    execution_status <> 'executed'
    or (
      adapter_contract_ref is not null
      and runner_ref is not null
      and runner_version is not null
      and runner_digest ~ '^sha256:[a-f0-9]{64}$'
      and observed_result is not null
      and observed_disposition is not null
      and cardinality(observed_finding_codes) > 0
      and cardinality(evidence_refs) > 0
      and evidence_digest ~ '^sha256:[a-f0-9]{64}$'
      and executed_at is not null
    )
  ),
  constraint fixture_results_nonexecuted_not_proof check (
    execution_status = 'executed' or observed_result is null
  ),
  constraint fixture_results_candidate_only check (projection_posture = 'candidate_only'),
  constraint fixture_results_no_operational_effect check (operational_effect = 'none')
);

comment on table quirk_core_private.fixture_results is
  'Append-only executable results for the exact 22 adversarial fixtures. Fixture declarations alone are not proof.';

create table quirk_core_private.proposed_moves (
  move_ref text not null,
  revision integer not null,
  subject_ref text not null default 'doctrine.classification.anti_limiting',
  subject_version text not null default '0.1.0',
  move_kind text not null,
  status text not null default 'proposed',
  summary text not null,
  rationale text not null,
  ambiguity_kind text not null,
  requesting_capability_ref text not null,
  requested_authority_ref text not null,
  input_refs text[] not null,
  evidence_refs text[] not null default '{}'::text[],
  source_digest text not null,
  resolution_decision_ref text,
  supersedes_move_ref text,
  supersedes_revision integer,
  created_at timestamptz not null,
  projection_posture text not null default 'candidate_only',
  operational_effect text not null default 'none',

  primary key (move_ref, revision),
  constraint proposed_moves_ref_typed check (move_ref ~ '^proposed_move\.[a-z0-9][a-z0-9._-]*$'),
  constraint proposed_moves_revision_positive check (revision >= 1),
  constraint proposed_moves_subject check (subject_ref = 'doctrine.classification.anti_limiting'),
  constraint proposed_moves_subject_version check (subject_version = '0.1.0'),
  constraint proposed_moves_kind_known check (move_kind in (
    'clarify_contract', 'supply_evidence', 'create_adapter', 'resolve_authority',
    'repair_schema', 'repair_fixture', 'record_exception', 'supersede_candidate'
  )),
  constraint proposed_moves_status_known check (status in (
    'proposed', 'triaged', 'withdrawn', 'rejected', 'resolved_by_decision', 'superseded'
  )),
  constraint proposed_moves_summary_present check (length(btrim(summary)) >= 3),
  constraint proposed_moves_rationale_present check (length(btrim(rationale)) >= 3),
  constraint proposed_moves_ambiguity_known check (ambiguity_kind in (
    'missing_contract', 'missing_evidence', 'missing_adapter', 'missing_authority',
    'conflicting_evidence', 'unsafe_inference', 'semantic_ambiguity', 'migration_risk'
  )),
  constraint proposed_moves_capability_typed check (
    requesting_capability_ref ~ '^capability\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint proposed_moves_authority_typed check (
    requested_authority_ref ~ '^authority\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint proposed_moves_capability_not_authority check (
    requesting_capability_ref <> requested_authority_ref
  ),
  constraint proposed_moves_inputs_present check (cardinality(input_refs) > 0),
  constraint proposed_moves_source_digest_sha256 check (source_digest ~ '^sha256:[a-f0-9]{64}$'),
  constraint proposed_moves_resolution_requires_decision check (
    (status = 'resolved_by_decision' and resolution_decision_ref is not null)
    or (status <> 'resolved_by_decision' and resolution_decision_ref is null)
  ),
  constraint proposed_moves_lineage_shape check (
    (revision = 1 and supersedes_move_ref is null and supersedes_revision is null)
    or (
      revision > 1
      and supersedes_move_ref is not null
      and supersedes_revision is not null
      and supersedes_move_ref = move_ref
      and supersedes_revision = revision - 1
    )
  ),
  constraint proposed_moves_candidate_only check (projection_posture = 'candidate_only'),
  constraint proposed_moves_no_operational_effect check (operational_effect = 'none'),
  foreign key (supersedes_move_ref, supersedes_revision)
    references quirk_core_private.proposed_moves (move_ref, revision)
    on update restrict
    on delete restrict
    deferrable initially immediate
);

comment on table quirk_core_private.proposed_moves is
  'Append-only typed abstentions and repair requests. A requesting capability cannot grant the requested authority.';

create table quirk_core_private.admission_decisions (
  decision_ref text primary key,
  subject_ref text not null default 'doctrine.classification.anti_limiting',
  subject_version text not null default '0.1.0',
  evaluation_run_ref text not null,
  outcome text not null,
  confidence numeric(4, 3) not null,
  blockers text[] not null default '{}'::text[],
  minimum_changes text[] not null default '{}'::text[],
  requesting_capability_ref text,
  granting_authority_ref text not null,
  source_decision_ref text not null,
  source_decision_digest text not null,
  source_ref text not null,
  decided_at timestamptz not null,
  recorded_at timestamptz not null default transaction_timestamp(),
  supersedes_decision_ref text,
  successor_subject_ref text,
  projection_posture text not null default 'candidate_only',
  operational_effect text not null default 'none',

  constraint admission_decisions_ref_typed check (
    decision_ref ~ '^admission_decision\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint admission_decisions_subject check (subject_ref = 'doctrine.classification.anti_limiting'),
  constraint admission_decisions_subject_version check (subject_version = '0.1.0'),
  constraint admission_decisions_run_typed check (evaluation_run_ref ~ '^eval_run\.[a-z0-9][a-z0-9._-]*$'),
  -- The v0.1 suite has only expected failures. Until a later migration models
  -- v0.2 positive controls and cross-cutting authority cases, an approve row
  -- would let a reject-everything evaluator masquerade as proof.
  constraint admission_decisions_outcome_known check (outcome in ('revise', 'reject', 'supersede')),
  constraint admission_decisions_confidence_range check (confidence >= 0 and confidence <= 1),
  constraint admission_decisions_capability_typed check (
    requesting_capability_ref is null
    or requesting_capability_ref ~ '^capability\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint admission_decisions_authority_typed check (
    granting_authority_ref ~ '^authority\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint admission_decisions_capability_not_authority check (
    requesting_capability_ref is null
    or requesting_capability_ref <> granting_authority_ref
  ),
  constraint admission_decisions_source_decision_typed check (
    source_decision_ref ~ '^decision\.[a-z0-9][a-z0-9._-]*$'
  ),
  constraint admission_decisions_source_digest_sha256 check (
    source_decision_digest ~ '^sha256:[a-f0-9]{64}$'
  ),
  constraint admission_decisions_source_present check (length(btrim(source_ref)) >= 3),
  constraint admission_decisions_outcome_evidence_shape check (
    (outcome = 'approve' and cardinality(blockers) = 0 and cardinality(minimum_changes) = 0)
    or (outcome = 'revise' and cardinality(blockers) > 0 and cardinality(minimum_changes) > 0)
    or (outcome = 'reject' and cardinality(blockers) > 0)
    or (
      outcome = 'supersede'
      and supersedes_decision_ref is not null
      and successor_subject_ref is not null
    )
  ),
  constraint admission_decisions_candidate_only check (projection_posture = 'candidate_only'),
  constraint admission_decisions_no_operational_effect check (operational_effect = 'none'),
  foreign key (supersedes_decision_ref)
    references quirk_core_private.admission_decisions (decision_ref)
    on update restrict
    on delete restrict
    deferrable initially immediate
);

comment on table quirk_core_private.admission_decisions is
  'Append-only projection of an externally authorized v0.1 review decision. Approve is blocked; every row has operational_effect=none.';

alter table quirk_core_private.proposed_moves
  add constraint proposed_moves_resolution_decision_fk
  foreign key (resolution_decision_ref)
  references quirk_core_private.admission_decisions (decision_ref)
  on update restrict
  on delete restrict
  deferrable initially immediate;

-- PostgreSQL does not create indexes for foreign-key columns. These partial
-- indexes keep lineage and resolution checks bounded without indexing nulls.
create index proposed_moves_supersedes_idx
  on quirk_core_private.proposed_moves (supersedes_move_ref, supersedes_revision)
  where supersedes_move_ref is not null;

create index proposed_moves_resolution_decision_idx
  on quirk_core_private.proposed_moves (resolution_decision_ref)
  where resolution_decision_ref is not null;

create index admission_decisions_supersedes_idx
  on quirk_core_private.admission_decisions (supersedes_decision_ref)
  where supersedes_decision_ref is not null;

create function quirk_core_private.prevent_append_only_mutation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
begin
  raise exception 'append-only relation %.% rejects %', tg_table_schema, tg_table_name, tg_op
    using errcode = '55000';
end
$function$;

comment on function quirk_core_private.prevent_append_only_mutation() is
  'Rejects UPDATE and DELETE. Corrections and dispositions must be new rows with lineage.';

create function quirk_core_private.validate_admission_decision()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  gate_count integer;
  passing_gate_count integer;
  fixture_count integer;
  passing_fixture_count integer;
  rule_count integer;
begin
  if new.outcome = 'approve' then
    select
      count(*),
      count(*) filter (where gate_result = 'pass')
    into gate_count, passing_gate_count
    from quirk_core_private.gate_evidence
    where subject_ref = new.subject_ref
      and subject_version = new.subject_version
      and evaluation_run_ref = new.evaluation_run_ref;

    if gate_count <> 12 or passing_gate_count <> 12 then
      raise exception 'approve requires exactly 12 passing named gates in evaluation run %; found % total and % passing',
        new.evaluation_run_ref, gate_count, passing_gate_count
        using errcode = '23514';
    end if;

    select
      count(*),
      count(*) filter (where expectation_met),
      count(distinct rule_id)
    into fixture_count, passing_fixture_count, rule_count
    from quirk_core_private.fixture_results
    where evaluation_run_ref = new.evaluation_run_ref;

    if fixture_count <> 22 or passing_fixture_count <> 22 or rule_count <> 11 then
      raise exception 'approve requires 22 expectation-matched executable fixtures across 11 rules in evaluation run %; found % total, % matched, % rules',
        new.evaluation_run_ref, fixture_count, passing_fixture_count, rule_count
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from quirk_core_private.fixture_results
      where evaluation_run_ref = new.evaluation_run_ref
      group by rule_id
      having count(*) <> 2 or not bool_and(expectation_met)
    ) then
      raise exception 'approve requires exactly two expectation-matched fixtures per rule in evaluation run %',
        new.evaluation_run_ref
        using errcode = '23514';
    end if;
  end if;

  return new;
end
$function$;

comment on function quirk_core_private.validate_admission_decision() is
  'Defense in depth for a future approval-capable schema; v0.1 table constraints reject approve because positive controls are absent.';

create trigger gate_evidence_append_only
before update or delete on quirk_core_private.gate_evidence
for each row execute function quirk_core_private.prevent_append_only_mutation();

create trigger fixture_results_append_only
before update or delete on quirk_core_private.fixture_results
for each row execute function quirk_core_private.prevent_append_only_mutation();

create trigger proposed_moves_append_only
before update or delete on quirk_core_private.proposed_moves
for each row execute function quirk_core_private.prevent_append_only_mutation();

create trigger admission_decisions_validate
before insert on quirk_core_private.admission_decisions
for each row execute function quirk_core_private.validate_admission_decision();

create trigger admission_decisions_append_only
before update or delete on quirk_core_private.admission_decisions
for each row execute function quirk_core_private.prevent_append_only_mutation();

alter table quirk_core_private.gate_evidence enable row level security;
alter table quirk_core_private.gate_evidence force row level security;
alter table quirk_core_private.fixture_results enable row level security;
alter table quirk_core_private.fixture_results force row level security;
alter table quirk_core_private.proposed_moves enable row level security;
alter table quirk_core_private.proposed_moves force row level security;
alter table quirk_core_private.admission_decisions enable row level security;
alter table quirk_core_private.admission_decisions force row level security;

revoke all privileges on all tables in schema quirk_core_private
  from public, anon, authenticated, service_role;
revoke all privileges on all functions in schema quirk_core_private
  from public, anon, authenticated, service_role;

grant usage on schema quirk_core_private
  to quirk_projection_ingest, quirk_projection_reader, quirk_admission_mirror;

grant insert on table
  quirk_core_private.gate_evidence,
  quirk_core_private.fixture_results,
  quirk_core_private.proposed_moves
to quirk_projection_ingest;

grant select on table
  quirk_core_private.gate_evidence,
  quirk_core_private.fixture_results,
  quirk_core_private.proposed_moves,
  quirk_core_private.admission_decisions
to quirk_projection_reader;

grant select on table
  quirk_core_private.gate_evidence,
  quirk_core_private.fixture_results
to quirk_admission_mirror;

grant insert on table quirk_core_private.admission_decisions
  to quirk_admission_mirror;

create policy gate_evidence_ingest_insert
on quirk_core_private.gate_evidence
for insert
to quirk_projection_ingest
with check (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy gate_evidence_private_read
on quirk_core_private.gate_evidence
for select
to quirk_projection_reader, quirk_admission_mirror
using (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy fixture_results_ingest_insert
on quirk_core_private.fixture_results
for insert
to quirk_projection_ingest
with check (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy fixture_results_private_read
on quirk_core_private.fixture_results
for select
to quirk_projection_reader, quirk_admission_mirror
using (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy proposed_moves_ingest_insert
on quirk_core_private.proposed_moves
for insert
to quirk_projection_ingest
with check (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy proposed_moves_private_read
on quirk_core_private.proposed_moves
for select
to quirk_projection_reader
using (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

create policy admission_decisions_mirror_insert
on quirk_core_private.admission_decisions
for insert
to quirk_admission_mirror
with check (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
  and granting_authority_ref like 'authority.%'
  and (requesting_capability_ref is null or requesting_capability_ref like 'capability.%')
);

create policy admission_decisions_private_read
on quirk_core_private.admission_decisions
for select
to quirk_projection_reader
using (
  projection_posture = 'candidate_only'
  and operational_effect = 'none'
);

commit;

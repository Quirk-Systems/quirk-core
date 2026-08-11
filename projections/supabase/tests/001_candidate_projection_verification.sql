-- Verification for 20260811183747_candidate_admission_projection.sql
-- Run only against a disposable local database or Supabase branch.
-- psql -v ON_ERROR_STOP=1 -f projections/supabase/tests/001_candidate_projection_verification.sql

begin;

do $verify_catalog$
declare
  relation_count integer;
  rls_count integer;
  append_only_count integer;
  policy_count integer;
  insecure_function_count integer;
  forbidden_privilege_count integer;
  unsafe_role_count integer;
  leaked_membership_count integer;
begin
  if not exists (
    select 1
    from pg_catalog.pg_namespace
    where nspname = 'quirk_core_private'
  ) then
    raise exception 'missing private schema quirk_core_private';
  end if;

  select count(*)
  into relation_count
  from pg_catalog.pg_class as class
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'quirk_core_private'
    and class.relkind = 'r'
    and class.relname in ('gate_evidence', 'fixture_results', 'proposed_moves', 'admission_decisions');

  if relation_count <> 4 then
    raise exception 'expected four candidate projection tables, found %', relation_count;
  end if;

  select count(*)
  into rls_count
  from pg_catalog.pg_class as class
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'quirk_core_private'
    and class.relname in ('gate_evidence', 'fixture_results', 'proposed_moves', 'admission_decisions')
    and class.relrowsecurity
    and class.relforcerowsecurity;

  if rls_count <> 4 then
    raise exception 'all four tables must have RLS enabled and forced; found %', rls_count;
  end if;

  select count(*)
  into append_only_count
  from pg_catalog.pg_trigger as trigger
  join pg_catalog.pg_class as class on class.oid = trigger.tgrelid
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'quirk_core_private'
    and trigger.tgname in (
      'gate_evidence_append_only',
      'fixture_results_append_only',
      'proposed_moves_append_only',
      'admission_decisions_append_only'
    )
    and not trigger.tgisinternal;

  if append_only_count <> 4 then
    raise exception 'expected four append-only mutation triggers, found %', append_only_count;
  end if;

  select count(*)
  into policy_count
  from pg_catalog.pg_policy as policy
  join pg_catalog.pg_class as class on class.oid = policy.polrelid
  join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
  where namespace.nspname = 'quirk_core_private';

  if policy_count <> 8 then
    raise exception 'expected eight explicit RLS policies, found %', policy_count;
  end if;

  select count(*)
  into insecure_function_count
  from pg_catalog.pg_proc as proc
  join pg_catalog.pg_namespace as namespace on namespace.oid = proc.pronamespace
  where namespace.nspname = 'quirk_core_private'
    and proc.prosecdef;

  if insecure_function_count <> 0 then
    raise exception 'private projection contains % SECURITY DEFINER functions', insecure_function_count;
  end if;

  select count(*)
  into forbidden_privilege_count
  from (
    select role_name, class.oid as relation_oid
    from (values ('anon'), ('authenticated'), ('service_role')) as roles(role_name)
    cross join pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace on namespace.oid = class.relnamespace
    where namespace.nspname = 'quirk_core_private'
      and class.relname in ('gate_evidence', 'fixture_results', 'proposed_moves', 'admission_decisions')
      and (
        pg_catalog.has_table_privilege(role_name, class.oid, 'SELECT')
        or pg_catalog.has_table_privilege(role_name, class.oid, 'INSERT')
        or pg_catalog.has_table_privilege(role_name, class.oid, 'UPDATE')
        or pg_catalog.has_table_privilege(role_name, class.oid, 'DELETE')
      )
  ) as leaked;

  if forbidden_privilege_count <> 0 then
    raise exception 'anon/authenticated/service_role retain % forbidden table privilege paths', forbidden_privilege_count;
  end if;

  if pg_catalog.has_schema_privilege('anon', 'quirk_core_private', 'USAGE')
    or pg_catalog.has_schema_privilege('authenticated', 'quirk_core_private', 'USAGE')
    or pg_catalog.has_schema_privilege('service_role', 'quirk_core_private', 'USAGE') then
    raise exception 'an exposed Supabase role has USAGE on quirk_core_private';
  end if;

  select count(*)
  into unsafe_role_count
  from pg_catalog.pg_roles
  where rolname in ('quirk_projection_ingest', 'quirk_projection_reader', 'quirk_admission_mirror')
    and (rolcanlogin or rolsuper or rolcreatedb or rolcreaterole or rolinherit or rolreplication or rolbypassrls);

  if unsafe_role_count <> 0 then
    raise exception 'one or more projection roles has unsafe role attributes';
  end if;

  select count(*)
  into leaked_membership_count
  from pg_catalog.pg_auth_members as membership
  join pg_catalog.pg_roles as granted_role on granted_role.oid = membership.roleid
  where granted_role.rolname in (
    'quirk_projection_ingest',
    'quirk_projection_reader',
    'quirk_admission_mirror'
  );

  if leaked_membership_count <> 0 then
    raise exception 'a dormant projection role has already been granted to a member';
  end if;

  if pg_catalog.has_table_privilege('quirk_projection_ingest', 'quirk_core_private.admission_decisions', 'INSERT') then
    raise exception 'ingestion capability can insert admission decisions';
  end if;

  if not pg_catalog.has_table_privilege('quirk_admission_mirror', 'quirk_core_private.admission_decisions', 'INSERT') then
    raise exception 'admission mirror lacks its narrow append capability';
  end if;

  if pg_catalog.has_table_privilege('quirk_admission_mirror', 'quirk_core_private.gate_evidence', 'INSERT')
    or pg_catalog.has_table_privilege('quirk_admission_mirror', 'quirk_core_private.fixture_results', 'INSERT') then
    raise exception 'admission mirror can manufacture its own proof';
  end if;
end
$verify_catalog$;

insert into quirk_core_private.proposed_moves (
  move_ref,
  revision,
  move_kind,
  status,
  summary,
  rationale,
  ambiguity_kind,
  requesting_capability_ref,
  requested_authority_ref,
  input_refs,
  evidence_refs,
  source_digest,
  created_at
) values (
  'proposed_move.test_missing_adapter',
  1,
  'create_adapter',
  'proposed',
  'Create the missing executable adapter.',
  'A fixture declaration is not an executable evaluation.',
  'missing_adapter',
  'capability.eval_runner',
  'authority.quirk_approval',
  array['fixture.E-ALR-001-01'],
  '{}'::text[],
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  '2026-08-11T00:00:00Z'
);

do $verify_lineage_and_posture$
begin
  begin
    insert into quirk_core_private.proposed_moves (
      move_ref, revision, move_kind, status, summary, rationale, ambiguity_kind,
      requesting_capability_ref, requested_authority_ref, input_refs,
      source_digest, created_at
    ) values (
      'proposed_move.test_missing_adapter', 2, 'create_adapter', 'triaged',
      'Invalid lineage.', 'Revision two lacks its predecessor.', 'missing_adapter',
      'capability.eval_runner', 'authority.quirk_approval', array['fixture.E-ALR-001-01'],
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      '2026-08-11T00:01:00Z'
    );
    raise exception 'revision two without lineage unexpectedly validated';
  exception when check_violation then
    null;
  end;

  begin
    update quirk_core_private.proposed_moves
    set summary = 'Mutated history.'
    where move_ref = 'proposed_move.test_missing_adapter' and revision = 1;
    raise exception 'append-only UPDATE unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;

  begin
    delete from quirk_core_private.proposed_moves
    where move_ref = 'proposed_move.test_missing_adapter' and revision = 1;
    raise exception 'append-only DELETE unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;
end
$verify_lineage_and_posture$;

do $verify_fixture_proof$
begin
  begin
    insert into quirk_core_private.fixture_results (
      evaluation_run_ref, fixture_id, rule_id, fixture_digest, adapter_ref,
      execution_status, expected_result, expected_disposition,
      expected_finding_codes, observed_result
    ) values (
      'eval_run.invalid_fixture', 'E-ALR-001-01', 'ALR-001',
      'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc',
      'adapter.classification_document', 'executed', 'fail', 'reject',
      array['five_axes_not_independently_authoritative'], 'fail'
    );
    raise exception 'executed fixture without runner proof unexpectedly validated';
  exception when check_violation then
    null;
  end;
end
$verify_fixture_proof$;

insert into quirk_core_private.fixture_results (
  evaluation_run_ref,
  fixture_id,
  rule_id,
  fixture_digest,
  adapter_ref,
  adapter_contract_ref,
  runner_ref,
  runner_version,
  runner_digest,
  execution_status,
  expected_result,
  observed_result,
  expected_disposition,
  observed_disposition,
  expected_finding_codes,
  observed_finding_codes,
  evidence_refs,
  evidence_digest,
  executed_at
) values (
  'eval_run.valid_fixture',
  'E-ALR-001-01',
  'ALR-001',
  'sha256:dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'adapter.classification_document',
  'contract.adapter.classification_document@1.0.0',
  'runner.quirk_eval',
  '1.0.0',
  'sha256:eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',
  'executed',
  'fail',
  'fail',
  'reject',
  'reject',
  array['five_axes_not_independently_authoritative'],
  array['five_axes_not_independently_authoritative'],
  array['evidence.fixture_trace.E-ALR-001-01'],
  'sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff',
  '2026-08-11T00:02:00Z'
);

do $verify_expectation$
begin
  if not exists (
    select 1
    from quirk_core_private.fixture_results
    where evaluation_run_ref = 'eval_run.valid_fixture'
      and fixture_id = 'E-ALR-001-01'
      and expectation_met
  ) then
    raise exception 'valid executable fixture did not become proof-eligible';
  end if;
end
$verify_expectation$;

do $verify_capability_and_candidate_boundaries$
begin
  begin
    insert into quirk_core_private.admission_decisions (
      decision_ref, evaluation_run_ref, outcome, confidence, blockers, minimum_changes,
      requesting_capability_ref, granting_authority_ref, source_decision_ref,
      source_decision_digest, source_ref, decided_at
    ) values (
      'admission_decision.invalid_authority', 'eval_run.invalid_authority', 'revise', 0.9,
      array['missing_proof'], array['supply_proof'],
      'capability.eval_runner', 'capability.eval_runner', 'decision.invalid_authority',
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      'github:Quirk-Systems/quirk-core#1', '2026-08-11T00:03:00Z'
    );
    raise exception 'capability unexpectedly validated as authority';
  exception when check_violation then
    null;
  end;

  begin
    insert into quirk_core_private.admission_decisions (
      decision_ref, evaluation_run_ref, outcome, confidence, blockers, minimum_changes,
      granting_authority_ref, source_decision_ref, source_decision_digest,
      source_ref, decided_at, projection_posture
    ) values (
      'admission_decision.invalid_posture', 'eval_run.invalid_posture', 'revise', 0.9,
      array['missing_proof'], array['supply_proof'],
      'authority.quirk_approval', 'decision.invalid_posture',
      'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      'github:Quirk-Systems/quirk-core#1', '2026-08-11T00:04:00Z', 'canonical'
    );
    raise exception 'canonical projection posture unexpectedly validated';
  exception when check_violation then
    null;
  end;

  begin
    insert into quirk_core_private.admission_decisions (
      decision_ref, evaluation_run_ref, outcome, confidence, blockers, minimum_changes,
      granting_authority_ref, source_decision_ref, source_decision_digest,
      source_ref, decided_at, operational_effect
    ) values (
      'admission_decision.invalid_effect', 'eval_run.invalid_effect', 'revise', 0.9,
      array['missing_proof'], array['supply_proof'],
      'authority.quirk_approval', 'decision.invalid_effect',
      'sha256:3333333333333333333333333333333333333333333333333333333333333333',
      'github:Quirk-Systems/quirk-core#1', '2026-08-11T00:05:00Z', 'canonize'
    );
    raise exception 'operational effect unexpectedly validated';
  exception when check_violation then
    null;
  end;

  begin
    insert into quirk_core_private.admission_decisions (
      decision_ref, evaluation_run_ref, outcome, confidence, blockers, minimum_changes,
      granting_authority_ref, source_decision_ref, source_decision_digest,
      source_ref, decided_at
    ) values (
      'admission_decision.unproved_approve', 'eval_run.no_proof', 'approve', 0.9,
      '{}'::text[], '{}'::text[],
      'authority.quirk_approval', 'decision.unproved_approve',
      'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      'github:Quirk-Systems/quirk-core#1', '2026-08-11T00:06:00Z'
    );
    raise exception 'approve unexpectedly validated in the v0.1 evidence-only projection';
  exception when check_violation then
    null;
  end;
end
$verify_capability_and_candidate_boundaries$;

insert into quirk_core_private.admission_decisions (
  decision_ref,
  evaluation_run_ref,
  outcome,
  confidence,
  blockers,
  minimum_changes,
  requesting_capability_ref,
  granting_authority_ref,
  source_decision_ref,
  source_decision_digest,
  source_ref,
  decided_at
) values (
  'admission_decision.valid_revise',
  'eval_run.current_review',
  'revise',
  0.980,
  array['fixtures_not_executable', 'strict_schema_validation_missing'],
  array['implement_adapters', 'make_schema_strict_clean'],
  'capability.adversarial_review',
  'authority.quirk_approval',
  'decision.quirk_core_pr_1_review',
  'sha256:5555555555555555555555555555555555555555555555555555555555555555',
  'github:Quirk-Systems/quirk-core#1',
  '2026-08-11T00:07:00Z'
);

do $verify_decision_append_only$
begin
  begin
    update quirk_core_private.admission_decisions
    set confidence = 0.500
    where decision_ref = 'admission_decision.valid_revise';
    raise exception 'admission decision UPDATE unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;
end
$verify_decision_append_only$;

rollback;

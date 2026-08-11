create table if not exists public.preference_references (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null,
  reference_type text not null,
  source jsonb not null default '{}'::jsonb,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.preference_references enable row level security;

create table if not exists public.preference_edges (
  id uuid primary key default gen_random_uuid(),
  subject_id text not null,
  predicate text not null,
  object jsonb not null,
  purpose jsonb not null,
  context jsonb not null,
  authority jsonb not null,
  validity jsonb not null,
  reference_id uuid references public.preference_references(id) on delete restrict,
  system_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint preference_edges_required_semantics_check check (
    jsonb_typeof(purpose) is not null
    and purpose <> '{}'::jsonb
    and jsonb_typeof(context) is not null
    and context <> '{}'::jsonb
    and jsonb_typeof(authority) is not null
    and authority <> '{}'::jsonb
    and jsonb_typeof(validity) is not null
    and validity <> '{}'::jsonb
  ),
  constraint preference_edges_provenance_check check (
    reference_id is not null or system_default = true
  )
);

alter table public.preference_edges enable row level security;

comment on table public.preference_edges is 'Canonical derived preference relations. Every edge must declare purpose, context, authority, validity, and provenance via reference_id or explicit system_default=true.';
comment on column public.preference_edges.system_default is 'Explicit provenance escape hatch for declared system defaults. Must be true when no preference reference supports the edge.';
comment on constraint preference_edges_provenance_check on public.preference_edges is 'Fail closed: a PreferenceEdge is invalid without at least one reference_id or explicit system_default declaration.';
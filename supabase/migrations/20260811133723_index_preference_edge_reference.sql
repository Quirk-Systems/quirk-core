create index if not exists preference_edges_reference_id_idx
  on public.preference_edges(reference_id)
  where reference_id is not null;
-- AI triage suggestions.
--
-- When a tenant reports a request, the server asks Gemini for a category,
-- priority and one-line reason, or falls back to keyword rules. The
-- suggestion is kept in ai_category, ai_priority and ai_reason, apart from
-- the values the manager confirms, so accuracy can be measured later.
-- ai_source says which produced it. Only the server (service role) writes
-- these columns; clients have no grant on them.

alter table public.maintenance_requests
  add column ai_source text check (ai_source in ('ai', 'rules')),
  add constraint maintenance_requests_ai_suggestion_complete check (
    (ai_source is null and ai_category is null and ai_priority is null and ai_reason is null)
    or (ai_source is not null and ai_category is not null and ai_priority is not null and ai_reason is not null)
  );

-- Per-org hourly cap on Gemini calls counts recent AI suggestions.
create index maintenance_requests_org_id_created_at_idx
  on public.maintenance_requests (org_id, created_at desc);

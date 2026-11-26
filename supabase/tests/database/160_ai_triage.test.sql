-- AI triage suggestions: only the server writes them, they are stored whole,
-- and they never overwrite what the manager confirms.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(6);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select throws_ok(
  $$ insert into public.maintenance_requests (org_id, unit_id, tenant_id, title, description, ai_category, ai_priority, ai_reason, ai_source)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a1',
             '00000000-0002-0000-0000-0000000000a2', 'Leak', 'Self triage', 'plumbing', 'emergency', 'me', 'ai') $$,
  '42501', null, 'a tenant cannot write a suggestion');
select tests.clear_authentication();

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a
select throws_ok(
  $$ update public.maintenance_requests set ai_priority = 'low' where id = '00000000-0008-0000-0000-0000000000a1' $$,
  '42501', null, 'a manager cannot rewrite a suggestion');
select tests.clear_authentication();

set local role service_role;
select lives_ok(
  $$ update public.maintenance_requests
     set ai_category = 'plumbing', ai_priority = 'high', ai_reason = 'Active leak.', ai_source = 'ai'
     where id = '00000000-0008-0000-0000-0000000000a1' $$,
  'the server stores a suggestion');
select throws_ok(
  $$ update public.maintenance_requests
     set ai_category = 'plumbing', ai_priority = null, ai_reason = 'Half done', ai_source = 'rules'
     where id = '00000000-0008-0000-0000-0000000000a2' $$,
  '23514', null, 'a suggestion is all four fields or none');
select throws_ok(
  $$ update public.maintenance_requests
     set ai_category = 'other', ai_priority = 'low', ai_reason = 'x', ai_source = 'guess'
     where id = '00000000-0008-0000-0000-0000000000a2' $$,
  '23514', null, 'the source is ai or rules');
reset role;

select results_eq(
  $$ select category, priority from public.maintenance_requests where id = '00000000-0008-0000-0000-0000000000a1' $$,
  $$ values (null::public.request_category, null::public.request_priority) $$,
  'the confirmed values stay untouched');

select * from finish();
rollback;

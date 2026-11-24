-- Admins see everything in their own organization, including the audit log,
-- and nothing in other organizations. The audit log is insert-only.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(8);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a0'); -- admin_a

select set_eq('select org_id from public.audit_log', array['00000000-0001-0000-0000-00000000000a'::uuid],
  'admin reads only own org audit log');
select set_eq('select id from public.leases',
  array['00000000-0005-0000-0000-0000000000a1', '00000000-0005-0000-0000-0000000000a2']::uuid[],
  'admin reads every lease in own org and none in others');
select lives_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'second.admin@example.test', 'admin', 'hash-admin',
             '00000000-0002-0000-0000-0000000000a0', now() + interval '7 days') $$,
  'admin can invite an admin');
select results_eq(
  $$ update public.organizations set name = 'Sample Lettings A Ltd'
     where id = '00000000-0001-0000-0000-00000000000a' returning name $$,
  $$ values ('Sample Lettings A Ltd') $$,
  'admin can rename own org');
select is_empty(
  $$ update public.organizations set name = 'Taken over'
     where id = '00000000-0001-0000-0000-00000000000b' returning id $$,
  'admin cannot rename another org');
select throws_ok(
  $$ insert into public.audit_log (org_id, action, entity) values ('00000000-0001-0000-0000-00000000000a', 'fake', 'x') $$,
  '42501', null, 'admin cannot write to the audit log from the client');

-- Even the database owner cannot rewrite history.
select tests.clear_authentication();
select throws_ok(
  $$ update public.audit_log set action = 'edited' $$,
  'P0001', 'audit_log is insert-only', 'audit log rows cannot be updated');
select throws_ok(
  $$ delete from public.audit_log $$,
  'P0001', 'audit_log is insert-only', 'audit log rows cannot be deleted');

select * from finish();
rollback;

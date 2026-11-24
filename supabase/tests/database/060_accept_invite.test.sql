-- accept_invite creates the profile with the invited role and org, marks the
-- invite used, and refuses expired, reused or mismatched invites. Only the
-- service role can call it.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(12);

insert into auth.users (id, email) values
  ('00000000-0002-0000-0000-0000000000c1', 'new.tenant.a@example.test'),
  ('00000000-0002-0000-0000-0000000000c2', 'someone.else@example.test');

insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at) values
  ('00000000-0001-0000-0000-00000000000a', 'expired@example.test', 'tenant', 'hash-expired',
   '00000000-0002-0000-0000-0000000000a1', now() - interval '1 minute');

-- Permissions
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a
select throws_ok(
  $$ select public.accept_invite('hash-a', '00000000-0002-0000-0000-0000000000c1', 'New Tenant') $$,
  '42501', null, 'signed-in users cannot call accept_invite');
select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.accept_invite('hash-a', '00000000-0002-0000-0000-0000000000c1', 'New Tenant') $$,
  '42501', null, 'anon cannot call accept_invite');
select tests.clear_authentication();

-- Refusals
select throws_ok(
  $$ select public.accept_invite('no-such-hash', '00000000-0002-0000-0000-0000000000c1', 'X') $$,
  'P0002', 'invite_not_found', 'unknown token is rejected');
select throws_ok(
  $$ select public.accept_invite('hash-expired', '00000000-0002-0000-0000-0000000000c1', 'X') $$,
  'P0001', 'invite_expired', 'expired invite is rejected');
select throws_ok(
  $$ select public.accept_invite('hash-a', '00000000-0002-0000-0000-0000000000c2', 'X') $$,
  'P0001', 'invite_email_mismatch', 'invite cannot be used by a different email');

-- Success
select lives_ok(
  $$ select public.accept_invite('hash-a', '00000000-0002-0000-0000-0000000000c1', '  New Tenant  ') $$,
  'valid invite is accepted');
select results_eq(
  $$ select org_id, role::text, full_name from public.profiles where id = '00000000-0002-0000-0000-0000000000c1' $$,
  $$ values ('00000000-0001-0000-0000-00000000000a'::uuid, 'tenant', 'New Tenant') $$,
  'profile gets the invite org and role');
select isnt_empty(
  $$ select 1 from public.invites where token_hash = 'hash-a' and accepted_at is not null $$,
  'invite is marked accepted');
select isnt_empty(
  $$ select 1 from public.audit_log where action = 'invite.accepted'
       and actor_id = '00000000-0002-0000-0000-0000000000c1' $$,
  'acceptance is written to the audit log');
select throws_ok(
  $$ select public.accept_invite('hash-a', '00000000-0002-0000-0000-0000000000c1', 'Again') $$,
  'P0001', 'invite_already_accepted', 'invite cannot be reused');

-- The new tenant only sees their own org.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000c1');
select set_eq('select id from public.organizations', array['00000000-0001-0000-0000-00000000000a'::uuid],
  'new member reads only the inviting org');
select is_empty('select id from public.leases', 'new tenant has no leases yet');

select * from finish();
rollback;

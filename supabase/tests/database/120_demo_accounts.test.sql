-- Demo login accounts: only the service role can look up their emails, the
-- mapping cannot hold an admin, and shared demo accounts cannot create invites.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(8);

delete from private.demo_accounts; -- the local seed adds its own
insert into private.demo_accounts (role, user_id) values
  ('manager', '00000000-0002-0000-0000-0000000000a1'),
  ('tenant', '00000000-0002-0000-0000-0000000000a2');

select is(
  public.demo_account_email('manager'), 'manager.a@example.test',
  'the demo manager email is found');
select is(
  public.demo_account_email('staff'), null,
  'a role with no demo account returns null');

update public.profiles set role = 'staff' where id = '00000000-0002-0000-0000-0000000000a2';
select is(
  public.demo_account_email('tenant'), null,
  'an account whose role changed is not used for that role');
update public.profiles set role = 'tenant' where id = '00000000-0002-0000-0000-0000000000a2';

select throws_ok(
  $$ insert into private.demo_accounts (role, user_id) values ('admin', '00000000-0002-0000-0000-0000000000a0') $$,
  '23514', null, 'an admin cannot be a demo account');

select ok(
  has_function_privilege('service_role', 'public.demo_account_email(public.user_role)', 'EXECUTE'),
  'the service role can look up demo emails');
select ok(
  not has_function_privilege('authenticated', 'public.demo_account_email(public.user_role)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.demo_account_email(public.user_role)', 'EXECUTE'),
  'clients cannot look up demo emails');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a, now a demo account
select throws_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'visitor@example.test', 'tenant', 'hash-visitor',
             '00000000-0002-0000-0000-0000000000a1', now() + interval '7 days') $$,
  '42501', null, 'a demo manager cannot create invites');
select tests.clear_authentication();

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a0'); -- admin_a, not a demo account
select lives_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'visitor@example.test', 'tenant', 'hash-visitor',
             '00000000-0002-0000-0000-0000000000a0', now() + interval '7 days') $$,
  'a real admin in the same org can still invite');
select tests.clear_authentication();

select * from finish();
rollback;

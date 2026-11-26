-- Emergency emails: only the server can claim them, each goes out once,
-- and shared demo accounts never get email.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(6);

delete from private.demo_accounts;
insert into private.demo_accounts (role, user_id) values ('tenant', '00000000-0002-0000-0000-0000000000a2');

insert into public.notifications (id, org_id, user_id, type, title, link, created_at) values
  ('00000000-0015-0000-0000-0000000000a1', '00000000-0001-0000-0000-00000000000a',
   '00000000-0002-0000-0000-0000000000a1', 'request_emergency', 'Emergency: "Gas smell"', '/manager/maintenance/x', now()),
  ('00000000-0015-0000-0000-0000000000a2', '00000000-0001-0000-0000-00000000000a',
   '00000000-0002-0000-0000-0000000000a1', 'request_emergency', 'Emergency: "Old"', '/manager/maintenance/y', now() - interval '2 days'),
  ('00000000-0015-0000-0000-0000000000a3', '00000000-0001-0000-0000-00000000000a',
   '00000000-0002-0000-0000-0000000000a2', 'request_emergency', 'Emergency: "Demo"', '/manager/maintenance/z', now());

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
select throws_ok($$ select * from public.claim_notification_emails() $$, '42501', null,
  'signed-in users cannot claim emails');
select tests.clear_authentication();

set local role service_role;
select results_eq(
  $$ select id::text, email, title from public.claim_notification_emails() $$,
  $$ values ('00000000-0015-0000-0000-0000000000a1', 'manager.a@example.test', 'Emergency: "Gas smell"') $$,
  'the server claims the recent emergency with the recipient''s address');
select is((select count(*)::int from public.claim_notification_emails()), 0, 'a claimed email is not handed out again');
reset role;

select isnt((select emailed_at from public.notifications where id = '00000000-0015-0000-0000-0000000000a1'), null,
  'the claim marks it as emailed');
select is((select emailed_at from public.notifications where id = '00000000-0015-0000-0000-0000000000a3'), null,
  'demo accounts are never emailed');
select is(
  (select count(*)::int from public.notifications where emailed_at is not null and type <> 'request_emergency'), 0,
  'other notification types are not emailed');

select * from finish();
rollback;

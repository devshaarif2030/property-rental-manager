-- Nightly demo reset: puts the demo org back to the sample set, leaves every
-- other org alone, keeps the people, and runs the same way twice.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(14);

delete from private.demo_accounts; -- the local seed adds its own
insert into private.demo_accounts (role, user_id) values
  ('manager', '00000000-0002-0000-0000-0000000000a1'),
  ('tenant', '00000000-0002-0000-0000-0000000000a2');

create temporary table org_b_before as
  select
    (select count(*) from public.properties where org_id = '00000000-0001-0000-0000-00000000000b') as properties,
    (select count(*) from public.payments where org_id = '00000000-0001-0000-0000-00000000000b') as payments,
    (select count(*) from public.maintenance_requests where org_id = '00000000-0001-0000-0000-00000000000b') as requests;

select lives_ok($$ select private.reset_demo_data('2027-03-10') $$, 'the reset runs on org A data');

select results_eq(
  $$ select name from public.properties where org_id = '00000000-0001-0000-0000-00000000000a' order by name $$,
  $$ values ('Birch House'), ('Cedar Lofts'), ('Maple Court') $$,
  'org A has exactly the sample properties');
select is(
  (select count(*)::int from public.units where org_id = '00000000-0001-0000-0000-00000000000a'), 8,
  'org A has the eight sample units');
select is(
  (select count(*)::int from public.maintenance_requests where org_id = '00000000-0001-0000-0000-00000000000a'), 0,
  'old requests are gone');
select is(
  (select count(*)::int from public.invites where org_id = '00000000-0001-0000-0000-00000000000a'), 0,
  'pending invites are gone');
select is(
  (select count(*)::int from public.profiles where org_id = '00000000-0001-0000-0000-00000000000a'), 6,
  'people are kept');

select results_eq(
  $$ select l.tenant_id::text, l.start_date::text, l.status::text from public.leases l
     where l.org_id = '00000000-0001-0000-0000-00000000000a' $$,
  $$ values ('00000000-0002-0000-0000-0000000000a2', '2026-10-01', 'active') $$,
  'the demo tenant has the only lease, started five months back');
select results_eq(
  $$ select c.period_month::text, c.status::text, (p.id is not null) from public.rent_charges c
     left join public.payments p on p.rent_charge_id = c.id
     where c.org_id = '00000000-0001-0000-0000-00000000000a' order by c.period_month $$,
  $$ values ('2026-10-01', 'paid', true), ('2026-11-01', 'paid', true), ('2026-12-01', 'paid', true),
            ('2027-01-01', 'paid', true), ('2027-02-01', 'paid', true), ('2027-03-01', 'due', false) $$,
  'five paid months with payments, and this month due');

select private.reset_demo_data('2027-03-29');
select is(
  (select status::text from public.rent_charges
   where org_id = '00000000-0001-0000-0000-00000000000a' and period_month = '2027-03-01'), 'overdue',
  'after the due day the current charge is overdue');
select is(
  (select count(*)::int from public.properties where org_id = '00000000-0001-0000-0000-00000000000a'), 3,
  'running it again does not duplicate anything');

select results_eq(
  $$ select
       (select count(*) from public.properties where org_id = '00000000-0001-0000-0000-00000000000b'),
       (select count(*) from public.payments where org_id = '00000000-0001-0000-0000-00000000000b'),
       (select count(*) from public.maintenance_requests where org_id = '00000000-0001-0000-0000-00000000000b') $$,
  $$ select properties, payments, requests from org_b_before $$,
  'other organizations are untouched');

select is(
  (select count(*)::int from public.audit_log where org_id = '00000000-0001-0000-0000-00000000000a' and action = 'demo.reset'), 2,
  'each reset is written to the audit log');

select ok(
  not has_function_privilege('authenticated', 'private.reset_demo_data(date)', 'EXECUTE'),
  'clients cannot run the reset');
select is(
  (select schedule from cron.job where jobname = 'reset-demo-data'), '0 3 * * *',
  'the reset is scheduled nightly');

select * from finish();
rollback;

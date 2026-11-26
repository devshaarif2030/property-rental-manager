-- Nightly demo reset: puts the demo org back to the sample set, leaves every
-- other org alone, keeps the people, and runs the same way twice. Sample
-- tenants are created once and can never sign in.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(26);

delete from private.demo_accounts; -- the local seed adds its own
insert into private.demo_accounts (role, user_id) values
  ('manager', '00000000-0002-0000-0000-0000000000a1'),
  ('tenant', '00000000-0002-0000-0000-0000000000a2'),
  ('staff', '00000000-0002-0000-0000-0000000000a4');

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
  (select count(*)::int from public.units where org_id = '00000000-0001-0000-0000-00000000000a'), 13,
  'org A has the thirteen sample units');
select results_eq(
  $$ select status::text, count(*)::int from public.units
     where org_id = '00000000-0001-0000-0000-00000000000a' group by status order by status::text $$,
  $$ values ('occupied', 9), ('vacant', 4) $$,
  'nine units are let and four are vacant');
select results_eq(
  $$ select title, status::text, coalesce(assigned_to::text, '-'), coalesce(category::text, '-'), coalesce(ai_source, '-')
     from public.maintenance_requests where org_id = '00000000-0001-0000-0000-00000000000a' order by created_at $$,
  $$ values
       ('Smoke alarm chirping', 'done', '00000000-0002-0000-0000-0000000000a4', 'electrical', '-'),
       ('Front door lock sticking', 'done', '00000000-0002-0000-0000-0000000000a4', 'structural', '-'),
       ('Dishwasher not draining', 'done', '00000000-0002-0000-0000-0000000000a4', 'appliance', '-'),
       ('Hallway light flickering', 'in_progress', '00000000-0002-0000-0000-0000000000a4', 'electrical', '-'),
       ('Bathroom extractor fan not working', 'assigned', '00000000-0002-0000-0000-0000000000a4', 'electrical', '-'),
       ('Bedroom radiator stays cold', 'open', '-', '-', 'rules'),
       ('Mould patch on bathroom ceiling', 'assigned', '00000000-0002-0000-0000-0000000000a4', 'structural', '-'),
       ('Kitchen tap keeps dripping', 'open', '-', '-', 'rules'),
       ('Window latch loose', 'open', '-', '-', 'rules') $$,
  'old requests are replaced by the nine sample requests');
select is(
  (select count(*)::int from public.maintenance_requests
   where org_id = '00000000-0001-0000-0000-00000000000a' and tenant_id = '00000000-0002-0000-0000-0000000000a2'), 4,
  'four of them are the demo tenant''s');
select results_eq(
  $$ select coalesce(u.status::text, 'note') from public.request_updates u
     join public.maintenance_requests r on r.id = u.request_id
     where r.title = 'Front door lock sticking' and r.org_id = '00000000-0001-0000-0000-00000000000a'
     order by u.created_at $$,
  $$ values ('open'), ('assigned'), ('in_progress'), ('done') $$,
  'the done job has a full timeline in order');
select is(
  (select count(*)::int from public.maintenance_requests r
   where r.org_id = '00000000-0001-0000-0000-00000000000a' and r.status <> 'open'
     and r.status = (select u.status from public.request_updates u where u.request_id = r.id and u.status is not null
                     order by u.created_at desc limit 1)), 6,
  'each job''s latest timeline status matches the request');
select is(
  (select count(*)::int from public.invites where org_id = '00000000-0001-0000-0000-00000000000a'), 0,
  'pending invites are gone');
select is(
  (select count(*)::int from public.profiles where org_id = '00000000-0001-0000-0000-00000000000a'), 15,
  'people are kept and the nine sample tenants are added');
select is(
  (select count(*)::int from auth.users u join public.profiles p on p.id = u.id
   where p.org_id = '00000000-0001-0000-0000-00000000000a' and u.email like '%@sample-tenant.invalid'
     and u.encrypted_password is null and u.banned_until = 'infinity'
     and not exists (select 1 from auth.identities i where i.user_id = u.id)), 9,
  'sample tenants have no password, no identity and a permanent ban');

select results_eq(
  $$ select l.start_date::text, l.status::text from public.leases l
     where l.org_id = '00000000-0001-0000-0000-00000000000a' and l.tenant_id = '00000000-0002-0000-0000-0000000000a2' $$,
  $$ values ('2026-10-01', 'active') $$,
  'the demo tenant has one lease, started five months back');
select results_eq(
  $$ select status::text, count(*)::int from public.leases
     where org_id = '00000000-0001-0000-0000-00000000000a' group by status order by status::text $$,
  $$ values ('active', 9), ('ended', 1) $$,
  'nine active leases and one ended one');
select results_eq(
  $$ select c.period_month::text, c.status::text, (p.id is not null) from public.rent_charges c
     join public.leases l on l.id = c.lease_id
     left join public.payments p on p.rent_charge_id = c.id
     where c.org_id = '00000000-0001-0000-0000-00000000000a' and l.tenant_id = '00000000-0002-0000-0000-0000000000a2'
     order by c.period_month $$,
  $$ values ('2026-10-01', 'paid', true), ('2026-11-01', 'paid', true), ('2026-12-01', 'paid', true),
            ('2027-01-01', 'paid', true), ('2027-02-01', 'paid', true), ('2027-03-01', 'due', false) $$,
  'five paid months with payments, and this month due');
select results_eq(
  $$ select status::text, count(*)::int from public.rent_charges
     where org_id = '00000000-0001-0000-0000-00000000000a' and status <> 'paid' group by status order by status::text $$,
  $$ values ('due', 4), ('overdue', 2) $$,
  'across the portfolio four charges are due and two are overdue');
select is(
  (select count(*)::int from public.rent_charges c
   where c.org_id = '00000000-0001-0000-0000-00000000000a'
     and (c.status = 'paid') <> exists (select 1 from public.payments p where p.rent_charge_id = c.id)), 0,
  'every paid charge has a payment and no unpaid charge has one');
select ok(
  (select max(paid_at) from public.payments where org_id = '00000000-0001-0000-0000-00000000000a') < '2027-03-10',
  'no sample payment is in the future');

select private.reset_demo_data('2027-03-29');
select is(
  (select c.status::text from public.rent_charges c join public.leases l on l.id = c.lease_id
   where l.tenant_id = '00000000-0002-0000-0000-0000000000a2' and c.period_month = '2027-03-01'), 'overdue',
  'after the due day the demo tenant''s current charge is overdue');
select results_eq(
  $$ select
       (select count(*)::int from public.properties where org_id = '00000000-0001-0000-0000-00000000000a'),
       (select count(*)::int from public.profiles where org_id = '00000000-0001-0000-0000-00000000000a') $$,
  $$ values (3, 15) $$,
  'running it again does not duplicate properties or sample tenants');

delete from private.demo_accounts where role = 'staff';
select private.reset_demo_data('2027-03-29');
select is(
  (select count(*)::int from public.maintenance_requests
   where org_id = '00000000-0001-0000-0000-00000000000a' and assigned_to is null and status = 'open'), 9,
  'without a demo staff account the sample requests stay open and unassigned');

select results_eq(
  $$ select
       (select count(*) from public.properties where org_id = '00000000-0001-0000-0000-00000000000b'),
       (select count(*) from public.payments where org_id = '00000000-0001-0000-0000-00000000000b'),
       (select count(*) from public.maintenance_requests where org_id = '00000000-0001-0000-0000-00000000000b') $$,
  $$ select properties, payments, requests from org_b_before $$,
  'other organizations are untouched');

select is(
  (select count(*)::int from public.audit_log where org_id = '00000000-0001-0000-0000-00000000000a' and action = 'demo.reset'), 3,
  'each reset is written to the audit log');

select ok(
  not has_function_privilege('authenticated', 'private.reset_demo_data(date)', 'EXECUTE'),
  'clients cannot run the reset');
select ok(
  not has_function_privilege('authenticated', 'private.demo_sample_tenant(uuid, text, text)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'private.demo_lease(uuid, uuid, uuid, date, date, smallint, integer, integer, date)', 'EXECUTE')
  and not has_function_privilege('authenticated',
    'private.demo_open_request(uuid, uuid, uuid, timestamptz, text, text, public.request_category, public.request_priority, text)',
    'EXECUTE'),
  'clients cannot add sample tenants, leases or requests');
select ok(
  not has_function_privilege('authenticated',
    'private.demo_job(uuid, uuid, uuid, uuid, uuid, date, text, text, public.request_category, public.request_priority, public.request_status, text)',
    'EXECUTE'),
  'clients cannot add sample jobs');
select is(
  (select schedule from cron.job where jobname = 'reset-demo-data'), '0 3 * * *',
  'the reset is scheduled nightly');

select * from finish();
rollback;

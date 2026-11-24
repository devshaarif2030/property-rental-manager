-- Monthly rent charges and overdue marking (the pg_cron jobs).
-- Dates are passed in, so the tests do not depend on today's date.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(16);

select is(
  private.generate_rent_charges('2027-01-01'), 3,
  'January creates one charge per active lease');
select results_eq(
  $$ select lease_id::text, amount_cents, due_date::text, status::text from public.rent_charges
     where period_month = '2027-01-01' order by lease_id $$,
  $$ values ('00000000-0005-0000-0000-0000000000a1', 120000, '2027-01-01', 'due'),
            ('00000000-0005-0000-0000-0000000000a2', 95000, '2027-01-05', 'due'),
            ('00000000-0005-0000-0000-0000000000b1', 180000, '2027-01-01', 'due') $$,
  'charges use the lease rent and due day');
select is(
  private.generate_rent_charges('2027-01-15'), 0,
  'running again for the same month creates nothing');
select results_eq(
  $$ select title from public.notifications
     where user_id = '00000000-0002-0000-0000-0000000000a3' and type = 'rent_due'
       and title like 'Rent for %' $$,
  $$ values ('Rent for January 2027 is due on 5 January') $$,
  'the tenant is told when rent is due');

-- An ended lease stops billing; a lease that has not started is not billed yet.
update public.leases set status = 'ended', end_date = '2027-01-31'
where id = '00000000-0005-0000-0000-0000000000a2';
insert into public.leases (id, org_id, unit_id, tenant_id, start_date, rent_amount_cents, due_day)
values ('00000000-0005-0000-0000-0000000000a3', '00000000-0001-0000-0000-00000000000a',
        '00000000-0004-0000-0000-0000000000a3', '00000000-0002-0000-0000-0000000000a3', '2027-03-15', 90000, 1);

select is(
  private.generate_rent_charges('2027-02-01'), 2,
  'February skips the ended lease and the lease starting in March');
select is(
  private.generate_rent_charges('2027-03-01'), 3,
  'March bills the new lease');
select results_eq(
  $$ select due_date::text from public.rent_charges where lease_id = '00000000-0005-0000-0000-0000000000a3' $$,
  $$ values ('2027-03-15') $$,
  'a lease starting after its due day is due on the start date');

-- Overdue ----------------------------------------------------------------
-- On 3 January: December (a9) and the two charges due 1 January are late;
-- a2's charge due 5 January is not; November's charges are paid.
select is(
  private.mark_overdue_rent_charges('2027-01-03'), 3,
  'unpaid charges past their due date become overdue');
select results_eq(
  $$ select lease_id::text, period_month::text, status::text from public.rent_charges
     where period_month <= '2027-01-01' order by lease_id, period_month $$,
  $$ values ('00000000-0005-0000-0000-0000000000a1', '2026-11-01', 'paid'),
            ('00000000-0005-0000-0000-0000000000a1', '2026-12-01', 'overdue'),
            ('00000000-0005-0000-0000-0000000000a1', '2027-01-01', 'overdue'),
            ('00000000-0005-0000-0000-0000000000a2', '2026-11-01', 'paid'),
            ('00000000-0005-0000-0000-0000000000a2', '2027-01-01', 'due'),
            ('00000000-0005-0000-0000-0000000000b1', '2026-11-01', 'paid'),
            ('00000000-0005-0000-0000-0000000000b1', '2027-01-01', 'overdue') $$,
  'paid charges and charges not yet due are left alone');
select is(
  private.mark_overdue_rent_charges('2027-01-03'), 0,
  'running again marks nothing new');
select results_eq(
  $$ select count(*)::int from public.notifications
     where user_id = '00000000-0002-0000-0000-0000000000a2' and type = 'rent_overdue' $$,
  $$ values (2) $$,
  'the tenant is told about each overdue charge');

-- Clients cannot run the jobs ------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a0'); -- admin_a
select throws_ok(
  $$ select private.generate_rent_charges('2027-04-01') $$,
  '42501', null, 'an admin cannot create charges directly');
select throws_ok(
  $$ select private.mark_overdue_rent_charges('2027-04-01') $$,
  '42501', null, 'an admin cannot mark charges overdue');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select results_eq(
  $$ select count(*)::int from public.notifications where title like 'Rent for %' $$,
  $$ values (5) $$,
  'a tenant sees only their own rent notifications');
select throws_ok(
  $$ update public.rent_charges set status = 'paid' where id = '00000000-0006-0000-0000-0000000000a9' $$,
  '42501', null, 'a tenant cannot mark their own charge paid');

select tests.clear_authentication();
select results_eq(
  $$ select jobname::text, schedule::text from cron.job
     where jobname in ('generate-rent-charges', 'mark-overdue-rent-charges') order by jobname $$,
  $$ values ('generate-rent-charges', '5 0 * * *'), ('mark-overdue-rent-charges', '15 0 * * *') $$,
  'both jobs are scheduled nightly');

select * from finish();
rollback;

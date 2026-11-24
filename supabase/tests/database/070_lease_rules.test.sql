-- Unit status follows leases, lease tenants must be tenants, and leases keep
-- their unit and tenant once created.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(10);

select results_eq(
  $$ select status::text from public.units where id = '00000000-0004-0000-0000-0000000000a3' $$,
  $$ values ('vacant') $$,
  'a unit with no lease is vacant');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a

select lives_ok(
  $$ insert into public.leases (id, org_id, unit_id, tenant_id, start_date, rent_amount_cents, due_day)
     values ('00000000-0005-0000-0000-0000000000a3', '00000000-0001-0000-0000-00000000000a',
             '00000000-0004-0000-0000-0000000000a3', '00000000-0002-0000-0000-0000000000a3',
             '2026-12-01', 90000, 1) $$,
  'manager creates a lease on a vacant unit');
select results_eq(
  $$ select status::text from public.units where id = '00000000-0004-0000-0000-0000000000a3' $$,
  $$ values ('occupied') $$,
  'creating an active lease marks the unit occupied');

select lives_ok(
  $$ update public.leases set status = 'ended', end_date = '2027-01-31'
     where id = '00000000-0005-0000-0000-0000000000a3' $$,
  'manager ends the lease');
select results_eq(
  $$ select status::text from public.units where id = '00000000-0004-0000-0000-0000000000a3' $$,
  $$ values ('vacant') $$,
  'ending the only active lease marks the unit vacant');

select throws_ok(
  $$ insert into public.leases (org_id, unit_id, tenant_id, start_date, rent_amount_cents, due_day)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a3',
             '00000000-0002-0000-0000-0000000000a4', '2026-12-01', 90000, 1) $$,
  '23514', 'lease_tenant_not_tenant', 'a staff member cannot be a lease tenant');

select throws_ok(
  $$ update public.units set status = 'occupied' where id = '00000000-0004-0000-0000-0000000000a3' $$,
  '42501', null, 'managers cannot set unit status by hand');
select throws_ok(
  $$ update public.leases set unit_id = '00000000-0004-0000-0000-0000000000a2'
     where id = '00000000-0005-0000-0000-0000000000a1' $$,
  '42501', null, 'a lease cannot be moved to another unit');
select throws_ok(
  $$ update public.leases set tenant_id = '00000000-0002-0000-0000-0000000000a3'
     where id = '00000000-0005-0000-0000-0000000000a1' $$,
  '42501', null, 'a lease cannot be handed to another tenant');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select is_empty(
  $$ update public.leases set rent_amount_cents = 1 where id = '00000000-0005-0000-0000-0000000000a1' returning id $$,
  'a tenant cannot change their own lease terms');

select * from finish();
rollback;

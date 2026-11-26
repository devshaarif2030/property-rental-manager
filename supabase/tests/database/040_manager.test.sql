-- Managers run their own organization: properties, units, leases, requests,
-- tenant and staff invites. They cannot record payments, invite admins or read
-- the audit log.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(12);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a

select set_eq('select id from public.profiles',
  array['00000000-0002-0000-0000-0000000000a0', '00000000-0002-0000-0000-0000000000a1',
        '00000000-0002-0000-0000-0000000000a2', '00000000-0002-0000-0000-0000000000a3',
        '00000000-0002-0000-0000-0000000000a4', '00000000-0002-0000-0000-0000000000a5']::uuid[],
  'manager reads every profile in own org');
select is_empty('select id from public.notifications', 'manager does not read other users'' notifications');
select is_empty('select id from public.audit_log', 'manager cannot read the audit log');

select lives_ok(
  $$ insert into public.properties (org_id, name, address_line, city, postcode, country)
     values ('00000000-0001-0000-0000-00000000000a', 'Birch Lodge', '3 Birch Road', 'York', 'YO1 1AA', 'GB') $$,
  'manager can create a property in own org');
select lives_ok(
  $$ insert into public.leases (org_id, unit_id, tenant_id, start_date, rent_amount_cents, due_day)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a3',
             '00000000-0002-0000-0000-0000000000a3', '2026-12-01', 90000, 1) $$,
  'manager can create a lease in own org');
select throws_ok(
  $$ insert into public.leases (org_id, unit_id, tenant_id, start_date, rent_amount_cents, due_day)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a1',
             '00000000-0002-0000-0000-0000000000a3', '2026-12-01', 90000, 1) $$,
  '23505', null, 'a unit cannot have two active leases');
select is(
  public.triage_request('00000000-0008-0000-0000-0000000000a1', 'plumbing', 'high',
                        '00000000-0002-0000-0000-0000000000a5'),
  'assigned'::public.request_status,
  'manager can confirm triage and reassign a request');

select lives_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'new.staff@example.test', 'staff', 'hash-staff',
             '00000000-0002-0000-0000-0000000000a1', now() + interval '7 days') $$,
  'manager can invite staff');
select throws_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'new.admin@example.test', 'admin', 'hash-admin',
             '00000000-0002-0000-0000-0000000000a1', now() + interval '7 days') $$,
  '42501', null, 'manager cannot invite an admin');
select throws_ok(
  'select token_hash from public.invites', '42501', null, 'invite token hashes are not readable');

select throws_ok(
  $$ update public.rent_charges set status = 'paid' where id = '00000000-0006-0000-0000-0000000000a9' $$,
  '42501', null, 'manager cannot mark a rent charge paid');
select throws_ok(
  $$ insert into public.payments (org_id, rent_charge_id, amount_cents, stripe_session_id, status, paid_at)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0006-0000-0000-0000000000a9',
             120000, 'cs_fake', 'succeeded', now()) $$,
  '42501', null, 'manager cannot record a payment');

select * from finish();
rollback;

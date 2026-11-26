-- A tenant sees only their own lease, charges, payments and requests, and the
-- unit and property they live in. Tenant A1 must never see Tenant A2's data.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(22);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1

select set_eq('select id from public.leases', array['00000000-0005-0000-0000-0000000000a1'::uuid],
  'tenant reads only own lease');
select set_eq('select id from public.rent_charges',
  array['00000000-0006-0000-0000-0000000000a1', '00000000-0006-0000-0000-0000000000a9']::uuid[],
  'tenant reads only charges on own lease');
select set_eq('select id from public.payments', array['00000000-0007-0000-0000-0000000000a1'::uuid],
  'tenant reads only own payments');
select set_eq('select id from public.units', array['00000000-0004-0000-0000-0000000000a1'::uuid],
  'tenant reads only the unit they lease');
select set_eq('select id from public.properties', array['00000000-0003-0000-0000-0000000000a1'::uuid],
  'tenant reads only the property they live in');
select set_eq('select id from public.maintenance_requests', array['00000000-0008-0000-0000-0000000000a1'::uuid],
  'tenant reads only own requests');
select set_eq('select id from public.request_photos', array['00000000-0009-0000-0000-0000000000a1'::uuid],
  'tenant reads only photos on own requests');
select set_eq('select id from public.request_updates', array['00000000-0010-0000-0000-0000000000a1'::uuid],
  'tenant reads only updates on own requests');
select set_eq('select id from public.notifications', array['00000000-0011-0000-0000-0000000000a2'::uuid],
  'tenant reads only own notifications');
select set_eq('select id from public.profiles',
  array['00000000-0002-0000-0000-0000000000a2', '00000000-0002-0000-0000-0000000000a0',
        '00000000-0002-0000-0000-0000000000a1']::uuid[],
  'tenant reads own profile and org managers, not other tenants or staff');
select is_empty('select id from public.invites', 'tenant cannot read invites');
select is_empty('select id from public.audit_log', 'tenant cannot read the audit log');

-- Rent is only marked paid by the Stripe webhook (service role), never by a client.
select throws_ok(
  $$ update public.rent_charges set status = 'paid' where id = '00000000-0006-0000-0000-0000000000a9' $$,
  '42501', null, 'tenant cannot mark a rent charge paid');
select throws_ok(
  $$ insert into public.payments (org_id, rent_charge_id, amount_cents, stripe_session_id, status, paid_at)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0006-0000-0000-0000000000a9',
             120000, 'cs_fake', 'succeeded', now()) $$,
  '42501', null, 'tenant cannot record a payment');

-- Requests: only on a unit they actively lease, and no setting triage fields.
select lives_ok(
  $$ insert into public.maintenance_requests (org_id, unit_id, tenant_id, title, description)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a1',
             '00000000-0002-0000-0000-0000000000a2', 'Light flickers', 'Hallway light.') $$,
  'tenant can report a request on own unit');
select throws_ok(
  $$ insert into public.maintenance_requests (org_id, unit_id, tenant_id, title, description)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a2',
             '00000000-0002-0000-0000-0000000000a2', 'Not my flat', 'Should fail.') $$,
  '42501', null, 'tenant cannot report a request on a unit they do not lease');
select throws_ok(
  $$ insert into public.maintenance_requests (org_id, unit_id, tenant_id, title, description, priority)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0004-0000-0000-0000000000a1',
             '00000000-0002-0000-0000-0000000000a2', 'Self triage', 'Should fail.', 'emergency') $$,
  '42501', null, 'tenant cannot set the confirmed priority');
select is_empty(
  $$ update public.maintenance_requests set status = 'done'
     where id = '00000000-0008-0000-0000-0000000000a1' returning id $$,
  'tenant cannot change request status directly');
select throws_ok(
  $$ insert into public.request_photos (org_id, request_id, storage_path, uploaded_by)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a2',
             '00000000-0001-0000-0000-00000000000a/00000000-0008-0000-0000-0000000000a2/00000000-0014-0000-0000-0000000000a9.jpg', '00000000-0002-0000-0000-0000000000a2') $$,
  '42501', null, 'tenant cannot add a photo to another tenant''s request');

-- Tenants cannot change their own role or organization.
select throws_ok(
  $$ update public.profiles set role = 'admin' where id = '00000000-0002-0000-0000-0000000000a2' $$,
  '42501', null, 'tenant cannot change own role');
select results_eq(
  $$ update public.profiles set full_name = 'Tenant A1 Renamed'
     where id = '00000000-0002-0000-0000-0000000000a2' returning full_name $$,
  $$ values ('Tenant A1 Renamed') $$,
  'tenant can update own name');
select is_empty(
  $$ update public.profiles set full_name = 'Hacked'
     where id = '00000000-0002-0000-0000-0000000000a3' returning id $$,
  'tenant cannot update another tenant''s profile');

select * from finish();
rollback;

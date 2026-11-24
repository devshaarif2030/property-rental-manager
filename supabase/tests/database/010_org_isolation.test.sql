-- A manager in one organization sees nothing from another organization.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(28);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000b1'); -- manager_b

select set_eq('select id from public.organizations', array['00000000-0001-0000-0000-00000000000b'::uuid],
  'manager B reads only org B');
select set_eq('select id from public.profiles',
  array['00000000-0002-0000-0000-0000000000b1', '00000000-0002-0000-0000-0000000000b2']::uuid[],
  'manager B reads only org B profiles');
select set_eq('select id from public.invites', array['00000000-0012-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B invites');
select set_eq('select id from public.properties', array['00000000-0003-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B properties');
select set_eq('select id from public.units', array['00000000-0004-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B units');
select set_eq('select id from public.leases', array['00000000-0005-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B leases');
select set_eq('select id from public.rent_charges', array['00000000-0006-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B rent charges');
select set_eq('select id from public.payments', array['00000000-0007-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B payments');
select set_eq('select id from public.maintenance_requests', array['00000000-0008-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B requests');
select set_eq('select id from public.request_photos', array['00000000-0009-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B request photos');
select set_eq('select id from public.request_updates', array['00000000-0010-0000-0000-0000000000b1'::uuid],
  'manager B reads only org B request updates');
select is_empty('select id from public.notifications', 'manager B has no notifications of others');
select is_empty('select id from public.audit_log', 'manager B cannot read the audit log');

-- Writes into another org are rejected or match no rows.
select throws_ok(
  $$ insert into public.properties (org_id, name, address_line, city, postcode, country)
     values ('00000000-0001-0000-0000-00000000000a', 'Intruder', '1 Way', 'Leeds', 'LS1', 'GB') $$,
  '42501', null, 'manager B cannot create a property in org A');
select is_empty(
  $$ update public.units set rent_amount_cents = 1 where id = '00000000-0004-0000-0000-0000000000a1' returning id $$,
  'manager B cannot update an org A unit');
select is_empty(
  $$ delete from public.properties where id = '00000000-0003-0000-0000-0000000000a1' returning id $$,
  'manager B cannot delete an org A property');
select throws_ok(
  $$ insert into public.invites (org_id, email, role, token_hash, invited_by, expires_at)
     values ('00000000-0001-0000-0000-00000000000a', 'x@example.test', 'tenant', 'hash-x',
             '00000000-0002-0000-0000-0000000000b1', now() + interval '1 day') $$,
  '42501', null, 'manager B cannot invite into org A');

-- A unit in org B cannot point at a property in org A, even for the service role.
select tests.clear_authentication();
select throws_ok(
  $$ insert into public.units (org_id, property_id, label, rent_amount_cents)
     values ('00000000-0001-0000-0000-00000000000b', '00000000-0003-0000-0000-0000000000a1', 'Cross', 1000) $$,
  '23503', null, 'a child row cannot reference a parent in another org');

-- And the same checks from the other side.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a

select set_eq('select id from public.organizations', array['00000000-0001-0000-0000-00000000000a'::uuid],
  'manager A reads only org A');
select set_eq('select id from public.properties', array['00000000-0003-0000-0000-0000000000a1'::uuid],
  'manager A reads only org A properties');
select set_eq('select id from public.units',
  array['00000000-0004-0000-0000-0000000000a1', '00000000-0004-0000-0000-0000000000a2',
        '00000000-0004-0000-0000-0000000000a3']::uuid[],
  'manager A reads only org A units');
select set_eq('select id from public.leases',
  array['00000000-0005-0000-0000-0000000000a1', '00000000-0005-0000-0000-0000000000a2']::uuid[],
  'manager A reads only org A leases');
select set_eq('select id from public.rent_charges',
  array['00000000-0006-0000-0000-0000000000a1', '00000000-0006-0000-0000-0000000000a2',
        '00000000-0006-0000-0000-0000000000a9']::uuid[],
  'manager A reads only org A rent charges');
select set_eq('select id from public.payments',
  array['00000000-0007-0000-0000-0000000000a1', '00000000-0007-0000-0000-0000000000a2']::uuid[],
  'manager A reads only org A payments');
select set_eq('select id from public.maintenance_requests',
  array['00000000-0008-0000-0000-0000000000a1', '00000000-0008-0000-0000-0000000000a2']::uuid[],
  'manager A reads only org A requests');

-- Anonymous visitors get nothing.
select tests.authenticate_as_anon();
select throws_ok('select id from public.leases', '42501', null, 'anon cannot read leases');
select throws_ok('select id from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select id from public.payments', '42501', null, 'anon cannot read payments');

select * from finish();
rollback;

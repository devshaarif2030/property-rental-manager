-- Maintenance staff see only the jobs assigned to them, and nothing financial.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(13);

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a4'); -- staff_a1

select set_eq('select id from public.maintenance_requests', array['00000000-0008-0000-0000-0000000000a1'::uuid],
  'staff reads only assigned requests');
select set_eq('select id from public.request_photos', array['00000000-0009-0000-0000-0000000000a1'::uuid],
  'staff reads only photos on assigned requests');
select set_eq('select id from public.request_updates', array['00000000-0010-0000-0000-0000000000a1'::uuid],
  'staff reads only updates on assigned requests');
select set_eq('select id from public.units', array['00000000-0004-0000-0000-0000000000a1'::uuid],
  'staff reads only units with assigned jobs');
select set_eq('select id from public.properties', array['00000000-0003-0000-0000-0000000000a1'::uuid],
  'staff reads only properties with assigned jobs');
select set_eq('select id from public.notifications', array['00000000-0011-0000-0000-0000000000a4'::uuid],
  'staff reads only own notifications');
select is_empty('select id from public.leases', 'staff cannot read leases');
select is_empty('select id from public.rent_charges', 'staff cannot read rent charges');
select is_empty('select id from public.payments', 'staff cannot read payments');
select is_empty('select id from public.invites', 'staff cannot read invites');

select lives_ok(
  $$ insert into public.request_updates (org_id, request_id, author_id, note)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a1',
             '00000000-0002-0000-0000-0000000000a4', 'On my way') $$,
  'staff can post a note on an assigned job');
select throws_ok(
  $$ insert into public.request_updates (org_id, request_id, author_id, note)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a2',
             '00000000-0002-0000-0000-0000000000a4', 'Not my job') $$,
  '42501', null, 'staff cannot post on a job assigned to someone else');
select throws_ok(
  $$ update public.maintenance_requests set assigned_to = '00000000-0002-0000-0000-0000000000a4'
     where id = '00000000-0008-0000-0000-0000000000a2' $$,
  '42501', null, 'staff cannot reassign jobs');

select * from finish();
rollback;

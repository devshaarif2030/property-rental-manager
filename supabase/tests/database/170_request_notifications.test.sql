-- Request notifications: assignment, status changes and emergencies notify
-- the right person once, and nobody else.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(10);

delete from public.notifications;

-- Manager A triages tenant A1's request and moves it to Staff A2.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
do $$ begin perform triage_request('00000000-0008-0000-0000-0000000000a1', 'plumbing', 'normal', '00000000-0002-0000-0000-0000000000a5'); end $$;
select tests.clear_authentication();

select results_eq(
  $$ select user_id::text, type, title, link from public.notifications $$,
  $$ values ('00000000-0002-0000-0000-0000000000a5', 'request_assigned', 'New job: "Kitchen tap leaking"',
             '/staff/jobs/00000000-0008-0000-0000-0000000000a1') $$,
  'reassigning notifies only the new staff member (status did not change)');

-- Triage again with the same assignee: nothing new.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
do $$ begin perform triage_request('00000000-0008-0000-0000-0000000000a1', 'plumbing', 'high', '00000000-0002-0000-0000-0000000000a5'); end $$;
select tests.clear_authentication();
select is((select count(*)::int from public.notifications), 1, 'triaging again without changes notifies nobody');

-- Staff A2 starts and finishes the job.
delete from public.notifications;
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a5');
do $$ begin perform update_job_status('00000000-0008-0000-0000-0000000000a1', 'in_progress'); end $$;
do $$ begin perform update_job_status('00000000-0008-0000-0000-0000000000a1', 'done', 'Washer replaced.'); end $$;
select tests.clear_authentication();
select set_eq(
  $$ select user_id::text, type, title, link from public.notifications $$,
  $$ values
       ('00000000-0002-0000-0000-0000000000a2', 'request_status_changed', '"Kitchen tap leaking" is in progress',
        '/tenant/requests/00000000-0008-0000-0000-0000000000a1'),
       ('00000000-0002-0000-0000-0000000000a2', 'request_status_changed', '"Kitchen tap leaking" is done',
        '/tenant/requests/00000000-0008-0000-0000-0000000000a1') $$,
  'the tenant hears about each status change');

-- An AI emergency suggestion notifies the property's manager only.
delete from public.notifications;
set local role service_role;
update public.maintenance_requests
set ai_category = 'heating', ai_priority = 'emergency', ai_reason = 'No heat.', ai_source = 'ai'
where id = '00000000-0008-0000-0000-0000000000a2';
reset role;
select results_eq(
  $$ select user_id::text, type, title, link from public.notifications $$,
  $$ values ('00000000-0002-0000-0000-0000000000a1', 'request_emergency', 'Emergency: "Boiler not starting"',
             '/manager/maintenance/00000000-0008-0000-0000-0000000000a2') $$,
  'an emergency suggestion notifies the property manager');

-- The manager confirming emergency does not notify again.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
do $$ begin perform triage_request('00000000-0008-0000-0000-0000000000a2', 'heating', 'emergency', '00000000-0002-0000-0000-0000000000a5'); end $$;
select tests.clear_authentication();
select is(
  (select count(*)::int from public.notifications where type = 'request_emergency'), 1,
  'confirming an emergency that was already flagged does not notify again');

-- With no property manager, every manager and admin in the org is told.
delete from public.notifications;
update public.properties set manager_id = null where id = '00000000-0003-0000-0000-0000000000a1';
update public.maintenance_requests set priority = 'emergency' where id = '00000000-0008-0000-0000-0000000000a1';
select is((select count(*)::int from public.notifications), 0, 'a closed request never raises an emergency');

update public.maintenance_requests set status = 'open', assigned_to = null, priority = null where id = '00000000-0008-0000-0000-0000000000a1';
delete from public.notifications;
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
do $$ begin perform triage_request('00000000-0008-0000-0000-0000000000a1', 'plumbing', 'emergency'); end $$;
select tests.clear_authentication();
select set_eq(
  $$ select user_id::text from public.notifications where type = 'request_emergency' $$,
  $$ values ('00000000-0002-0000-0000-0000000000a0'), ('00000000-0002-0000-0000-0000000000a1') $$,
  'without a property manager the org''s admin and managers are told');
select is(
  (select count(*)::int from public.notifications where org_id <> '00000000-0001-0000-0000-00000000000a'), 0,
  'nothing reaches another organization');

-- Each person reads only their own.
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1');
select is((select count(*)::int from public.notifications), 1, 'the manager sees only their own notification');
select tests.clear_authentication();
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2');
select is((select count(*)::int from public.notifications), 0, 'the tenant sees none of them');
select tests.clear_authentication();

select * from finish();
rollback;

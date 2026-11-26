-- Triage, assignment and job status go through triage_request and
-- update_job_status, which keep the request and its timeline in step.
begin;
create extension if not exists pgtap with schema extensions;
\ir _fixture.psql
select plan(19);

-- Opening entry -----------------------------------------------------------------
-- Inserted with a fixed id (clients cannot set one), so the tests can name it.
insert into public.maintenance_requests (id, org_id, unit_id, tenant_id, title, description)
values ('00000000-0008-0000-0000-0000000000a3', '00000000-0001-0000-0000-00000000000a',
        '00000000-0004-0000-0000-0000000000a1', '00000000-0002-0000-0000-0000000000a2',
        'Ceiling leak', 'Water dripping from the bathroom ceiling.');
select results_eq(
  $$ select status::text, author_id::text from public.request_updates
     where request_id = '00000000-0008-0000-0000-0000000000a3' $$,
  $$ values ('open', '00000000-0002-0000-0000-0000000000a2') $$,
  'reporting a request writes the Open entry');

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a2'); -- tenant_a1
select throws_ok(
  $$ insert into public.request_updates (org_id, request_id, author_id, status)
     values ('00000000-0001-0000-0000-00000000000a', '00000000-0008-0000-0000-0000000000a3',
             '00000000-0002-0000-0000-0000000000a2', 'done') $$,
  '42501', null, 'a tenant cannot fake a status entry');
select throws_ok(
  $$ select public.triage_request('00000000-0008-0000-0000-0000000000a3', 'plumbing', 'high', null) $$,
  '42501', null, 'a tenant cannot triage');
select tests.clear_authentication();

-- Triage by the manager -----------------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a
select is(
  public.triage_request('00000000-0008-0000-0000-0000000000a3', 'plumbing', 'emergency', null),
  'open'::public.request_status,
  'triage without an assignee keeps the request open');
select is(
  public.triage_request('00000000-0008-0000-0000-0000000000a3', 'plumbing', 'emergency',
                        '00000000-0002-0000-0000-0000000000a4'),
  'assigned'::public.request_status,
  'assigning staff moves it to assigned');
select results_eq(
  $$ select category::text, priority::text, assigned_to::text from public.maintenance_requests
     where id = '00000000-0008-0000-0000-0000000000a3' $$,
  $$ values ('plumbing', 'emergency', '00000000-0002-0000-0000-0000000000a4') $$,
  'the confirmed values are saved');
-- One transaction, so every row has the same created_at: compare as a set.
select set_eq(
  $$ select status::text, note from public.request_updates
     where request_id = '00000000-0008-0000-0000-0000000000a3' $$,
  $$ values ('open', null), (null, 'Triaged as Plumbing, Emergency priority. Not assigned.'),
            ('assigned', 'Triaged as Plumbing, Emergency priority. Assigned to Staff A1.') $$,
  'each triage is on the timeline');
select throws_ok(
  $$ select public.triage_request('00000000-0008-0000-0000-0000000000a3', 'plumbing', 'high',
                                  '00000000-0002-0000-0000-0000000000a2') $$,
  'P0001', 'assignee_not_staff', 'only staff can be assigned');
select throws_ok(
  $$ select public.triage_request('00000000-0008-0000-0000-0000000000b1', 'other', 'low', null) $$,
  'P0002', 'request_not_found', 'a manager cannot triage another org''s request');
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'in_progress') $$,
  'P0002', 'job_not_found', 'a manager cannot move a job they are not assigned');
select tests.clear_authentication();

-- Staff move the job forward -----------------------------------------------------
select tests.authenticate_as('00000000-0002-0000-0000-0000000000a5'); -- staff_a2, not assigned
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'in_progress') $$,
  'P0002', 'job_not_found', 'other staff cannot touch the job');
select tests.clear_authentication();

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a4'); -- staff_a1, assigned
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'done') $$,
  'P0001', 'invalid_status_change', 'a job cannot skip in progress');
select lives_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'in_progress', 'On my way') $$,
  'assigned staff start the job');
select lives_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'done', 'Replaced the seal') $$,
  'assigned staff finish the job');
select is(
  (select status::text from public.maintenance_requests where id = '00000000-0008-0000-0000-0000000000a3'),
  'done', 'the request is done');
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'in_progress') $$,
  'P0001', 'invalid_status_change', 'a done job cannot reopen');
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'done', repeat('x', 2001)) $$,
  '22001', 'note_too_long', 'notes are capped at 2000 characters');
select tests.clear_authentication();

select tests.authenticate_as('00000000-0002-0000-0000-0000000000a1'); -- manager_a
select throws_ok(
  $$ select public.triage_request('00000000-0008-0000-0000-0000000000a3', 'plumbing', 'low', null) $$,
  'P0001', 'request_closed', 'a done request cannot be triaged again');
select tests.clear_authentication();

select tests.authenticate_as_anon();
select throws_ok(
  $$ select public.update_job_status('00000000-0008-0000-0000-0000000000a3', 'in_progress') $$,
  '42501', null, 'signed-out visitors cannot call the workflow');
select tests.clear_authentication();

select * from finish();
rollback;

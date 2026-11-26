-- Maintenance workflow: triage, assignment and job status.
--
-- Status changes go through two functions so the request and its timeline
-- always change together and the rules live in one place:
--   triage_request    managers confirm category and priority and assign staff
--   update_job_status the assigned staff member moves a job to in progress or done
-- Clients can no longer update maintenance_requests directly, and timeline
-- rows they insert are notes only. The "Open" entry is written by a trigger
-- when the tenant reports the request.

revoke update on public.maintenance_requests from authenticated;
-- The old "managers update org requests" policy stays in place but has no
-- effect without the grant.

alter policy "add updates to visible requests" on public.request_updates
  with check (
    author_id = (select auth.uid())
    and org_id = (select private.current_org_id())
    and status is null
    and request_id in (select r.id from public.maintenance_requests r)
  );

-- Opening entry ---------------------------------------------------------------

create function private.log_request_opened()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.request_updates (org_id, request_id, author_id, status)
  values (new.org_id, new.id, new.tenant_id, 'open');
  return null;
end;
$$;

create trigger maintenance_requests_log_opened
  after insert on public.maintenance_requests
  for each row execute function private.log_request_opened();

-- Triage ----------------------------------------------------------------------

-- Confirms category and priority and sets (or clears) the assignee.
-- Assigning an open request moves it to assigned; clearing the assignee of an
-- assigned request moves it back to open. Returns the new status.
create function public.triage_request(
  p_request_id uuid,
  p_category public.request_category,
  p_priority public.request_priority,
  p_assigned_to uuid default null
)
returns public.request_status
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_org_id uuid := private.managed_org_id();
  v_request public.maintenance_requests;
  v_status public.request_status;
  v_staff_name text;
  v_note text;
begin
  if v_org_id is null then
    raise exception 'not_allowed' using errcode = '42501';
  end if;
  if p_category is null or p_priority is null then
    raise exception 'category_and_priority_required' using errcode = '22004';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = p_request_id and org_id = v_org_id
  for update;
  if not found then
    raise exception 'request_not_found' using errcode = 'P0002';
  end if;
  if v_request.status in ('done', 'cancelled') then
    raise exception 'request_closed' using errcode = 'P0001';
  end if;

  if p_assigned_to is not null then
    select full_name into v_staff_name
    from public.profiles
    where id = p_assigned_to and org_id = v_org_id and role = 'staff';
    if v_staff_name is null then
      raise exception 'assignee_not_staff' using errcode = 'P0001';
    end if;
  end if;

  v_status := case
    when p_assigned_to is not null and v_request.status = 'open' then 'assigned'
    when p_assigned_to is null and v_request.status = 'assigned' then 'open'
    else v_request.status
  end;

  update public.maintenance_requests
  set category = p_category, priority = p_priority, assigned_to = p_assigned_to, status = v_status
  where id = v_request.id;

  v_note := 'Triaged as ' || initcap(p_category::text) || ', ' || initcap(p_priority::text) || ' priority.'
    || case when p_assigned_to is not null then ' Assigned to ' || v_staff_name || '.' else ' Not assigned.' end;

  insert into public.request_updates (org_id, request_id, author_id, status, note)
  values (
    v_org_id, v_request.id, (select auth.uid()),
    case when v_status is distinct from v_request.status then v_status end,
    v_note
  );

  return v_status;
end;
$$;

-- Job status ------------------------------------------------------------------

-- The assigned staff member moves a job forward: assigned to in progress,
-- in progress to done. An optional note goes on the timeline.
create function public.update_job_status(
  p_request_id uuid,
  p_status public.request_status,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.maintenance_requests;
  v_note text := nullif(trim(p_note), '');
begin
  if length(v_note) > 2000 then
    raise exception 'note_too_long' using errcode = '22001';
  end if;

  select * into v_request
  from public.maintenance_requests
  where id = p_request_id and assigned_to = (select auth.uid())
  for update;
  if not found then
    raise exception 'job_not_found' using errcode = 'P0002';
  end if;

  if not (
    (v_request.status = 'assigned' and p_status = 'in_progress')
    or (v_request.status = 'in_progress' and p_status = 'done')
  ) then
    raise exception 'invalid_status_change' using errcode = 'P0001';
  end if;

  update public.maintenance_requests set status = p_status where id = v_request.id;

  insert into public.request_updates (org_id, request_id, author_id, status, note)
  values (v_request.org_id, v_request.id, (select auth.uid()), p_status, v_note);
end;
$$;

revoke all on function private.log_request_opened() from public, anon, authenticated;
revoke all on function public.triage_request(uuid, public.request_category, public.request_priority, uuid)
  from public, anon;
revoke all on function public.update_job_status(uuid, public.request_status, text) from public, anon;
grant execute on function public.triage_request(uuid, public.request_category, public.request_priority, uuid)
  to authenticated;
grant execute on function public.update_job_status(uuid, public.request_status, text) to authenticated;

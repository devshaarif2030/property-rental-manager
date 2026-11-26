-- In-app notifications for maintenance requests.
--
-- A trigger on maintenance_requests writes a notification when:
--   * a request is assigned to a staff member (to that staff member)
--   * a request's status changes, other than back to open (to the tenant)
--   * a request becomes emergency priority, from the AI suggestion or the
--     manager's triage (to the property's manager, or to every manager and
--     admin in the organization when the property has none)
-- Writing them in the database means every path that changes a request
-- (triage, job status, the AI triage on the server) notifies the same way.

create function private.notify_request_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_title text := '"' || left(new.title, 120) || '"';
  v_was_emergency boolean := coalesce(old.priority, old.ai_priority) is not distinct from 'emergency';
  v_is_emergency boolean := coalesce(new.priority, new.ai_priority) is not distinct from 'emergency';
  v_property_manager uuid;
begin
  if new.assigned_to is not null and new.assigned_to is distinct from old.assigned_to then
    insert into public.notifications (org_id, user_id, type, title, link)
    values (new.org_id, new.assigned_to, 'request_assigned',
            'New job: ' || v_title, '/staff/jobs/' || new.id);
  end if;

  if new.status is distinct from old.status and new.status <> 'open' then
    insert into public.notifications (org_id, user_id, type, title, link)
    values (
      new.org_id, new.tenant_id, 'request_status_changed',
      v_title || case new.status
        when 'assigned' then ' is assigned to a technician'
        when 'in_progress' then ' is in progress'
        when 'done' then ' is done'
        when 'cancelled' then ' was cancelled'
      end,
      '/tenant/requests/' || new.id
    );
  end if;

  if v_is_emergency and not v_was_emergency and new.status not in ('done', 'cancelled') then
    select p.manager_id into v_property_manager
    from public.units u join public.properties p on p.id = u.property_id
    where u.id = new.unit_id;

    insert into public.notifications (org_id, user_id, type, title, link)
    select new.org_id, m.id, 'request_emergency', 'Emergency: ' || v_title, '/manager/maintenance/' || new.id
    from public.profiles m
    where m.org_id = new.org_id
      and case
        when v_property_manager is not null then m.id = v_property_manager
        else m.role in ('manager', 'admin')
      end;
  end if;

  return null;
end;
$$;

revoke all on function private.notify_request_change() from public, anon, authenticated;

create trigger maintenance_requests_notify
  after update on public.maintenance_requests
  for each row execute function private.notify_request_change();

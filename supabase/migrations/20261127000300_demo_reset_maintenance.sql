-- Demo reset: sample maintenance requests and jobs.
--
-- The nightly reset now also adds four requests for the demo tenant: one
-- waiting for triage (with a keyword-rules suggestion), one assigned to the
-- demo staff account, one in progress and one done. The demo staff account
-- comes from private.demo_accounts; it is optional.

-- One sample job for the demo reset: a tenant request triaged by the manager
-- and, when a demo staff account exists, assigned and moved to p_status with
-- a matching timeline. Without staff the request is triaged but left open.
create function private.demo_job(
  p_org_id uuid,
  p_unit_id uuid,
  p_tenant_id uuid,
  p_manager_id uuid,
  p_staff_id uuid,
  p_reported_on date,
  p_title text,
  p_description text,
  p_category public.request_category,
  p_priority public.request_priority,
  p_status public.request_status,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
  v_status public.request_status := case when p_staff_id is null then 'open' else p_status end;
  v_staff_name text;
  v_at timestamptz := p_reported_on + interval '9 hours';
begin
  select full_name into v_staff_name from public.profiles where id = p_staff_id;

  insert into public.maintenance_requests (
    org_id, unit_id, tenant_id, title, description, category, priority,
    status, assigned_to, created_at, updated_at
  )
  values (
    p_org_id, p_unit_id, p_tenant_id, p_title, p_description, p_category, p_priority,
    v_status, p_staff_id, v_at, v_at
  )
  returning id into v_request_id;
  update public.request_updates set created_at = v_at where request_id = v_request_id;

  insert into public.request_updates (org_id, request_id, author_id, status, note, created_at)
  values (
    p_org_id, v_request_id, p_manager_id,
    case when p_staff_id is not null then 'assigned'::public.request_status end,
    'Triaged as ' || initcap(p_category::text) || ', ' || initcap(p_priority::text) || ' priority.'
      || case when p_staff_id is not null then ' Assigned to ' || v_staff_name || '.' else ' Not assigned.' end,
    v_at + interval '2 hours'
  );

  if v_status in ('in_progress', 'done') then
    insert into public.request_updates (org_id, request_id, author_id, status, note, created_at)
    values (
      p_org_id, v_request_id, p_staff_id, 'in_progress',
      case when v_status = 'in_progress' then p_note end, v_at + interval '1 day'
    );
  end if;
  if v_status = 'done' then
    insert into public.request_updates (org_id, request_id, author_id, status, note, created_at)
    values (p_org_id, v_request_id, p_staff_id, 'done', p_note, v_at + interval '2 days');
  end if;
end;
$$;

revoke all on function private.demo_job(
  uuid, uuid, uuid, uuid, uuid, date, text, text,
  public.request_category, public.request_priority, public.request_status, text
) from public, anon, authenticated;

create or replace function private.reset_demo_data(
  p_today date default (now() at time zone 'utc')::date
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_manager_id uuid;
  v_tenant_id uuid;
  v_org_id uuid;
  v_month date := date_trunc('month', p_today)::date;
  v_maple uuid;
  v_birch uuid;
  v_cedar uuid;
  v_unit_id uuid;
  v_lease_id uuid;
  v_rent integer := 145000;
  v_due_day smallint := 28;
  v_charge_month date;
  v_charge_id uuid;
  v_due_date date;
  v_staff_id uuid;
  v_request_id uuid;
begin
  select d.user_id into v_manager_id from private.demo_accounts d where d.role = 'manager';
  select d.user_id into v_tenant_id from private.demo_accounts d where d.role = 'tenant';
  if v_manager_id is null or v_tenant_id is null then
    raise notice 'reset_demo_data: no demo manager or tenant, nothing to reset';
    return;
  end if;

  select p.org_id into v_org_id from public.profiles p where p.id = v_manager_id;
  -- The demo staff account is optional; without one the sample jobs stay unassigned.
  select d.user_id into v_staff_id
  from private.demo_accounts d join public.profiles p on p.id = d.user_id
  where d.role = 'staff' and p.org_id = v_org_id;
  if not exists (select 1 from public.profiles p where p.id = v_tenant_id and p.org_id = v_org_id) then
    raise exception 'reset_demo_data: the demo tenant is not in the demo manager''s organization';
  end if;

  -- Children first: leases, charges and payments restrict deletes of their parents.
  delete from public.notifications where org_id = v_org_id;
  delete from public.maintenance_requests where org_id = v_org_id;
  delete from public.payments where org_id = v_org_id;
  delete from public.rent_charges where org_id = v_org_id;
  delete from public.leases where org_id = v_org_id;
  delete from public.properties where org_id = v_org_id;
  delete from public.invites where org_id = v_org_id and accepted_at is null;

  insert into public.properties (org_id, name, address_line, city, postcode, country, manager_id)
  values (v_org_id, 'Maple Court', '120 Maple Avenue', 'Austin', '78701', 'US', v_manager_id)
  returning id into v_maple;
  insert into public.properties (org_id, name, address_line, city, postcode, country, manager_id)
  values (v_org_id, 'Birch House', '45 Birch Street', 'Austin', '78702', 'US', v_manager_id)
  returning id into v_birch;
  insert into public.properties (org_id, name, address_line, city, postcode, country, manager_id)
  values (v_org_id, 'Cedar Lofts', '9 Cedar Lane', 'Round Rock', '78664', 'US', v_manager_id)
  returning id into v_cedar;

  insert into public.units (org_id, property_id, label, bedrooms, bathrooms, rent_amount_cents, status)
  values
    (v_org_id, v_maple, 'Unit 1B', 1, 1, 118000, 'vacant'),
    (v_org_id, v_maple, 'Unit 2A', 2, 2, 152000, 'vacant'),
    (v_org_id, v_maple, 'Unit 2B', 3, 2, 189000, 'vacant'),
    (v_org_id, v_birch, 'Flat 1', 1, 1, 105000, 'vacant'),
    (v_org_id, v_birch, 'Flat 2', 2, 1, 132000, 'vacant'),
    (v_org_id, v_cedar, 'Loft A', 0, 1, 99000, 'vacant'),
    (v_org_id, v_cedar, 'Loft B', 1, 1, 121000, 'vacant');

  insert into public.units (org_id, property_id, label, bedrooms, bathrooms, rent_amount_cents, status)
  values (v_org_id, v_maple, 'Unit 1A', 2, 1, v_rent, 'occupied')
  returning id into v_unit_id;

  insert into public.leases (
    org_id, unit_id, tenant_id, start_date, rent_amount_cents, deposit_amount_cents, due_day
  )
  values (v_org_id, v_unit_id, v_tenant_id, (v_month - interval '5 months')::date, v_rent, v_rent, v_due_day)
  returning id into v_lease_id;

  -- Five paid months, then the current month left to pay.
  for i in reverse 5..0 loop
    v_charge_month := (v_month - make_interval(months => i))::date;
    v_due_date := v_charge_month + (v_due_day - 1);

    insert into public.rent_charges (org_id, lease_id, period_month, amount_cents, due_date, status)
    values (
      v_org_id, v_lease_id, v_charge_month, v_rent, v_due_date,
      case
        when i > 0 then 'paid'
        when v_due_date < p_today then 'overdue'
        else 'due'
      end::public.rent_charge_status
    )
    returning id into v_charge_id;

    if i > 0 then
      -- Sample history, not real Stripe sessions: the ids say so.
      insert into public.payments (org_id, rent_charge_id, amount_cents, stripe_session_id, status, paid_at)
      values (
        v_org_id, v_charge_id, v_rent, 'demo_seed_' || v_charge_id::text, 'succeeded',
        (v_due_date - 2)::timestamptz + interval '10 hours'
      );
    end if;
  end loop;

  -- Sample maintenance: one request waiting for triage, one assigned job, one
  -- in progress and one done, so every role has something to look at.
  -- The insert trigger writes each request's "Open" timeline entry.
  insert into public.maintenance_requests (
    org_id, unit_id, tenant_id, title, description,
    ai_category, ai_priority, ai_reason, ai_source, created_at, updated_at
  )
  values (
    v_org_id, v_unit_id, v_tenant_id, 'Kitchen tap keeps dripping',
    'The cold tap in the kitchen drips all the time, even when fully closed.',
    'plumbing', 'normal', 'Keyword rules: mentions "tap", no urgency keyword found.', 'rules',
    p_today - interval '1 day', p_today - interval '1 day'
  )
  returning id into v_request_id;
  update public.request_updates set created_at = p_today - interval '1 day' where request_id = v_request_id;

  perform private.demo_job(
    v_org_id, v_unit_id, v_tenant_id, v_manager_id, v_staff_id, p_today - 3,
    'Bathroom extractor fan not working',
    'The fan makes a noise for a second and then stops. The mirror stays steamed up.',
    'electrical', 'normal', 'assigned', null);
  perform private.demo_job(
    v_org_id, v_unit_id, v_tenant_id, v_manager_id, v_staff_id, p_today - 6,
    'Hallway light flickering',
    'The ceiling light in the hallway flickers and sometimes goes off for a few seconds.',
    'electrical', 'high', 'in_progress', 'Checked the fitting. New switch ordered, fitting it tomorrow.');
  perform private.demo_job(
    v_org_id, v_unit_id, v_tenant_id, v_manager_id, v_staff_id, p_today - 20,
    'Front door lock sticking',
    'The key turns only after a few tries. Worried it will jam completely.',
    'structural', 'high', 'done', 'Lock cleaned and the strike plate adjusted. Works smoothly now.');

  insert into public.audit_log (org_id, actor_id, action, entity, meta)
  values (v_org_id, null, 'demo.reset', 'organization', jsonb_build_object('date', p_today));
end;
$$;

revoke all on function private.reset_demo_data(date) from public, anon, authenticated;

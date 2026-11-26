-- Demo reset: a fuller sample portfolio.
--
-- The nightly reset now fills the demo org like a small real portfolio:
-- 13 units over three properties, nine tenants with payment history of
-- different lengths (some paid up, some late, some overdue), one past tenant
-- with an ended lease, and maintenance requests from several units.
--
-- The eight extra tenants are sample people, not logins. Each is an auth user
-- with no password, no identity and a permanent ban, on a reserved .invalid
-- address, so nobody can sign in as them or send them mail. They are created
-- once and kept, like every other person in the org.

-- The id of a sample tenant in p_org_id, created on first use.
create function private.demo_sample_tenant(p_org_id uuid, p_email text, p_full_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  select u.id into v_user_id from auth.users u where u.email = p_email;

  if v_user_id is null then
    -- Empty token columns rather than nulls: the Auth server cannot read nulls there.
    insert into auth.users (
      instance_id, id, aud, role, email, banned_until,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      p_email, 'infinity', '{"provider": "email", "providers": ["email"]}'::jsonb,
      jsonb_build_object('full_name', p_full_name), now(), now(), '', '', '', ''
    )
    returning id into v_user_id;
  end if;

  insert into public.profiles (id, org_id, role, full_name)
  values (v_user_id, p_org_id, 'tenant', p_full_name)
  on conflict (id) do nothing;

  if not exists (
    select 1 from public.profiles p where p.id = v_user_id and p.org_id = p_org_id and p.role = 'tenant'
  ) then
    raise exception 'demo_sample_tenant: % is not a tenant in the demo organization', p_email;
  end if;
  return v_user_id;
end;
$$;

revoke all on function private.demo_sample_tenant(uuid, text, text) from public, anon, authenticated;

-- A sample lease with one rent charge per month from p_start to the current
-- month (or to the month before p_end for an ended lease). Charges are paid
-- p_late_days after two days before the due date, except the last
-- p_unpaid_months and any whose payment day is not yet past. Unpaid charges
-- are overdue once their due date has passed. Returns the lease id.
create function private.demo_lease(
  p_org_id uuid,
  p_unit_id uuid,
  p_tenant_id uuid,
  p_start date,
  p_end date,
  p_due_day smallint,
  p_unpaid_months integer,
  p_late_days integer,
  p_today date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rent integer;
  v_lease_id uuid;
  v_last_month date := date_trunc('month', coalesce(p_end - 1, p_today))::date;
  v_month date;
  v_due_date date;
  v_paid_on date;
  v_months_left integer;
  v_charge_id uuid;
  v_paid boolean;
begin
  select u.rent_amount_cents into v_rent from public.units u where u.id = p_unit_id;

  insert into public.leases (
    org_id, unit_id, tenant_id, start_date, end_date, rent_amount_cents, deposit_amount_cents, due_day, status
  )
  values (
    p_org_id, p_unit_id, p_tenant_id, p_start, p_end, v_rent, v_rent, p_due_day,
    case when p_end is not null and p_end <= p_today then 'ended' else 'active' end::public.lease_status
  )
  returning id into v_lease_id;

  v_month := date_trunc('month', p_start)::date;
  while v_month <= v_last_month loop
    v_due_date := v_month + (p_due_day - 1);
    v_paid_on := v_due_date - 2 + p_late_days;
    v_months_left := ((extract(year from v_last_month) - extract(year from v_month)) * 12
      + extract(month from v_last_month) - extract(month from v_month))::integer;
    v_paid := v_months_left >= p_unpaid_months and v_paid_on < p_today;

    insert into public.rent_charges (org_id, lease_id, period_month, amount_cents, due_date, status)
    values (
      p_org_id, v_lease_id, v_month, v_rent, v_due_date,
      case
        when v_paid then 'paid'
        when v_due_date < p_today then 'overdue'
        else 'due'
      end::public.rent_charge_status
    )
    returning id into v_charge_id;

    if v_paid then
      -- Sample history, not real Stripe sessions: the ids say so.
      insert into public.payments (org_id, rent_charge_id, amount_cents, stripe_session_id, status, paid_at)
      values (
        p_org_id, v_charge_id, v_rent, 'demo_seed_' || v_charge_id::text, 'succeeded',
        v_paid_on::timestamptz + interval '10 hours'
      );
    end if;

    v_month := (v_month + interval '1 month')::date;
  end loop;

  return v_lease_id;
end;
$$;

revoke all on function private.demo_lease(uuid, uuid, uuid, date, date, smallint, integer, integer, date)
  from public, anon, authenticated;

-- A sample request waiting for triage, with a keyword-rules suggestion.
create function private.demo_open_request(
  p_org_id uuid,
  p_unit_id uuid,
  p_tenant_id uuid,
  p_reported_at timestamptz,
  p_title text,
  p_description text,
  p_category public.request_category,
  p_priority public.request_priority,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request_id uuid;
begin
  -- The insert trigger writes the request's "Open" timeline entry.
  insert into public.maintenance_requests (
    org_id, unit_id, tenant_id, title, description,
    ai_category, ai_priority, ai_reason, ai_source, created_at, updated_at
  )
  values (
    p_org_id, p_unit_id, p_tenant_id, p_title, p_description,
    p_category, p_priority, p_reason, 'rules', p_reported_at, p_reported_at
  )
  returning id into v_request_id;
  update public.request_updates set created_at = p_reported_at where request_id = v_request_id;
end;
$$;

revoke all on function private.demo_open_request(
  uuid, uuid, uuid, timestamptz, text, text, public.request_category, public.request_priority, text
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
  v_staff_id uuid;
  v_org_id uuid;
  v_month date := date_trunc('month', p_today)::date;
  v_maple uuid;
  v_birch uuid;
  v_cedar uuid;
  v_unit_id uuid;
  v_units jsonb := '{}'::jsonb;
  v_tenants jsonb := '{}'::jsonb;
  v_sample record;
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

  -- Units start vacant; the lease trigger marks the let ones occupied.
  for v_sample in
    select * from (values
      ('maple', 'Unit 1A', 2, 1, 145000),
      ('maple', 'Unit 1B', 1, 1, 118000),
      ('maple', 'Unit 2A', 2, 2, 152000),
      ('maple', 'Unit 2B', 3, 2, 189000),
      ('maple', 'Unit 3A', 2, 2, 160000),
      ('maple', 'Unit 3B', 1, 1, 125000),
      ('birch', 'Flat 1', 1, 1, 105000),
      ('birch', 'Flat 2', 2, 1, 132000),
      ('birch', 'Flat 3', 1, 1, 110000),
      ('birch', 'Flat 4', 2, 1, 138000),
      ('cedar', 'Loft A', 0, 1, 99000),
      ('cedar', 'Loft B', 1, 1, 121000),
      ('cedar', 'Loft C', 1, 1, 115000)
    ) as u (property, label, bedrooms, bathrooms, rent)
  loop
    insert into public.units (org_id, property_id, label, bedrooms, bathrooms, rent_amount_cents)
    values (
      v_org_id,
      case v_sample.property when 'maple' then v_maple when 'birch' then v_birch else v_cedar end,
      v_sample.label, v_sample.bedrooms, v_sample.bathrooms, v_sample.rent
    )
    returning id into v_unit_id;
    v_units := v_units || jsonb_build_object(v_sample.label, v_unit_id);
  end loop;

  -- The demo tenant: five paid months, then the current month left to pay.
  perform private.demo_lease(
    v_org_id, (v_units ->> 'Unit 1A')::uuid, v_tenant_id,
    (v_month - interval '5 months')::date, null, 28::smallint, 1, 0, p_today);

  -- Sample tenants. Unpaid = trailing months left unpaid; late = days paid
  -- after two days before the due date.
  for v_sample in
    select * from (values
      ('olivia.hart@sample-tenant.invalid', 'Olivia Hart', 'Unit 1B', 11, null::integer, 1, 0, 0),
      ('marcus.bell@sample-tenant.invalid', 'Marcus Bell', 'Unit 2A', 8, null, 5, 2, 0),
      ('priya.nair@sample-tenant.invalid', 'Priya Nair', 'Unit 2B', 14, null, 1, 0, 0),
      ('daniel.okafor@sample-tenant.invalid', 'Daniel Okafor', 'Unit 3B', 3, null, 15, 1, 0),
      ('sofia.alvarez@sample-tenant.invalid', 'Sofia Alvarez', 'Flat 1', 6, null, 1, 0, 6),
      ('lucas.grant@sample-tenant.invalid', 'Lucas Grant', 'Flat 2', 13, 2, 1, 0, 0),
      ('ethan.brooks@sample-tenant.invalid', 'Ethan Brooks', 'Flat 3', 9, null, 10, 1, 0),
      ('hannah.kim@sample-tenant.invalid', 'Hannah Kim', 'Loft A', 5, null, 1, 0, 3),
      ('grace.turner@sample-tenant.invalid', 'Grace Turner', 'Loft C', 0, null, 20, 1, 0)
    ) as t (email, full_name, unit, started_months_ago, ended_months_ago, due_day, unpaid, late)
  loop
    v_tenants := v_tenants || jsonb_build_object(
      v_sample.full_name, private.demo_sample_tenant(v_org_id, v_sample.email, v_sample.full_name));
    perform private.demo_lease(
      v_org_id, (v_units ->> v_sample.unit)::uuid, (v_tenants ->> v_sample.full_name)::uuid,
      (v_month - make_interval(months => v_sample.started_months_ago))::date,
      (v_month - make_interval(months => v_sample.ended_months_ago))::date,
      v_sample.due_day::smallint, v_sample.unpaid, v_sample.late, p_today);
  end loop;

  -- Maintenance: requests waiting for triage, assigned jobs, one in progress
  -- and finished ones, so every role has something to look at. The demo
  -- tenant's four come first; the rest are from other units.
  perform private.demo_open_request(
    v_org_id, (v_units ->> 'Unit 1A')::uuid, v_tenant_id, p_today - interval '1 day',
    'Kitchen tap keeps dripping',
    'The cold tap in the kitchen drips all the time, even when fully closed.',
    'plumbing', 'normal', 'Keyword rules: mentions "tap", no urgency keyword found.');
  perform private.demo_job(
    v_org_id, (v_units ->> 'Unit 1A')::uuid, v_tenant_id, v_manager_id, v_staff_id, p_today - 3,
    'Bathroom extractor fan not working',
    'The fan makes a noise for a second and then stops. The mirror stays steamed up.',
    'electrical', 'normal', 'assigned', null);
  perform private.demo_job(
    v_org_id, (v_units ->> 'Unit 1A')::uuid, v_tenant_id, v_manager_id, v_staff_id, p_today - 6,
    'Hallway light flickering',
    'The ceiling light in the hallway flickers and sometimes goes off for a few seconds.',
    'electrical', 'high', 'in_progress', 'Checked the fitting. New switch ordered, fitting it tomorrow.');
  perform private.demo_job(
    v_org_id, (v_units ->> 'Unit 1A')::uuid, v_tenant_id, v_manager_id, v_staff_id, p_today - 20,
    'Front door lock sticking',
    'The key turns only after a few tries. Worried it will jam completely.',
    'structural', 'high', 'done', 'Lock cleaned and the strike plate adjusted. Works smoothly now.');

  perform private.demo_open_request(
    v_org_id, (v_units ->> 'Unit 2A')::uuid, (v_tenants ->> 'Marcus Bell')::uuid, p_today - interval '2 days',
    'Bedroom radiator stays cold',
    'The radiator in the main bedroom stays cold even with the heating on. The others are fine.',
    'heating', 'normal', 'Keyword rules: mentions "heating", no urgency keyword found.');
  perform private.demo_open_request(
    v_org_id, (v_units ->> 'Loft A')::uuid, (v_tenants ->> 'Hannah Kim')::uuid, p_today - interval '4 hours',
    'Window latch loose',
    'Not urgent, but the living room window latch is loose and the window does not close fully.',
    'structural', 'low', 'Keyword rules: mentions "window", "not urgent" suggests low priority.');
  perform private.demo_job(
    v_org_id, (v_units ->> 'Flat 1')::uuid, (v_tenants ->> 'Sofia Alvarez')::uuid, v_manager_id, v_staff_id,
    p_today - 2,
    'Mould patch on bathroom ceiling',
    'A dark patch of mould is growing above the shower. Wiping it only helps for a few days.',
    'structural', 'normal', 'assigned', null);
  perform private.demo_job(
    v_org_id, (v_units ->> 'Unit 2B')::uuid, (v_tenants ->> 'Priya Nair')::uuid, v_manager_id, v_staff_id,
    p_today - 12,
    'Dishwasher not draining',
    'Water is left at the bottom of the dishwasher after every cycle.',
    'appliance', 'normal', 'done', 'Filter was blocked. Cleaned it and ran a test cycle, drains fine.');
  perform private.demo_job(
    v_org_id, (v_units ->> 'Flat 3')::uuid, (v_tenants ->> 'Ethan Brooks')::uuid, v_manager_id, v_staff_id,
    p_today - 30,
    'Smoke alarm chirping',
    'The smoke alarm in the hallway chirps every minute, day and night.',
    'electrical', 'high', 'done', 'Replaced the battery and tested the alarm.');

  insert into public.audit_log (org_id, actor_id, action, entity, meta)
  values (v_org_id, null, 'demo.reset', 'organization', jsonb_build_object('date', p_today));
end;
$$;

revoke all on function private.reset_demo_data(date) from public, anon, authenticated;

-- Nightly demo data reset.
--
-- The demo accounts are shared by every visitor, so whatever they change is
-- put back every night: private.reset_demo_data() deletes the business data
-- of the demo organization (the org of the demo manager in
-- private.demo_accounts) and loads a fixed sample set again.
--
-- Profiles and auth users are kept, so the demo logins keep working. The
-- audit log is insert-only, so the reset adds a row instead of clearing it.
-- Dates are relative to the day of the reset: the demo tenant always has five
-- paid months and one charge for the current month to pay with Stripe test mode.
--
-- Sample data so far: three properties, eight units, one active lease (the
-- demo tenant). More tenants and maintenance requests come with week 4's seed.

create function private.reset_demo_data(
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
begin
  select d.user_id into v_manager_id from private.demo_accounts d where d.role = 'manager';
  select d.user_id into v_tenant_id from private.demo_accounts d where d.role = 'tenant';
  if v_manager_id is null or v_tenant_id is null then
    raise notice 'reset_demo_data: no demo manager or tenant, nothing to reset';
    return;
  end if;

  select p.org_id into v_org_id from public.profiles p where p.id = v_manager_id;
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

  insert into public.audit_log (org_id, actor_id, action, entity, meta)
  values (v_org_id, null, 'demo.reset', 'organization', jsonb_build_object('date', p_today));
end;
$$;

revoke all on function private.reset_demo_data(date) from public, anon, authenticated;

-- 03:00 UTC, after the rent charge (00:05) and overdue (00:15) jobs.
select cron.schedule('reset-demo-data', '0 3 * * *', $$select private.reset_demo_data()$$);

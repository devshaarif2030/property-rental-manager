-- Monthly rent charges and overdue marking, run by pg_cron inside the database.
--
-- generate_rent_charges(month) creates one charge per active lease that covers
-- any day of the month. It is idempotent (unique lease_id, period_month), so the
-- job runs daily: a lease created mid-month gets its charge the next night.
-- The charge is the lease's monthly rent; v1 does not prorate partial months.
-- It is due on the lease's due day, or on the start date if the lease starts later.
--
-- mark_overdue_rent_charges(today) moves unpaid charges past their due date to
-- overdue. Only the Stripe webhook marks a charge paid.
--
-- Each new charge and each newly overdue charge notifies the tenant.
-- Neither function is callable by clients.

create extension if not exists pg_cron with schema pg_catalog;

create function private.generate_rent_charges(
  p_month date default (date_trunc('month', now() at time zone 'utc'))::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_month)::date;
  v_month_end date := (date_trunc('month', p_month) + interval '1 month - 1 day')::date;
  v_count integer;
begin
  with created as (
    insert into public.rent_charges (org_id, lease_id, period_month, amount_cents, due_date)
    select
      l.org_id,
      l.id,
      v_month,
      l.rent_amount_cents,
      greatest(v_month + (l.due_day - 1), l.start_date)
    from public.leases l
    where l.status = 'active'
      and l.start_date <= v_month_end
      and (l.end_date is null or l.end_date >= v_month)
    on conflict (lease_id, period_month) do nothing
    returning org_id, lease_id, period_month, due_date
  ),
  notified as (
    insert into public.notifications (org_id, user_id, type, title, link)
    select
      c.org_id,
      l.tenant_id,
      'rent_due',
      'Rent for ' || to_char(c.period_month, 'FMMonth YYYY') || ' is due on ' || to_char(c.due_date, 'FMDD FMMonth'),
      '/tenant'
    from created c
    join public.leases l on l.id = c.lease_id
    returning 1
  )
  select count(*) into v_count from created;

  return v_count;
end;
$$;

create function private.mark_overdue_rent_charges(
  p_today date default (now() at time zone 'utc')::date
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  with updated as (
    update public.rent_charges
    set status = 'overdue'
    where status = 'due' and due_date < p_today
    returning org_id, lease_id, period_month
  ),
  notified as (
    insert into public.notifications (org_id, user_id, type, title, link)
    select
      u.org_id,
      l.tenant_id,
      'rent_overdue',
      'Rent for ' || to_char(u.period_month, 'FMMonth YYYY') || ' is overdue',
      '/tenant'
    from updated u
    join public.leases l on l.id = u.lease_id
    returning 1
  )
  select count(*) into v_count from updated;

  return v_count;
end;
$$;

revoke all on function private.generate_rent_charges(date) from public, anon, authenticated;
revoke all on function private.mark_overdue_rent_charges(date) from public, anon, authenticated;

-- Times are UTC. Charges first, then overdue, so a charge due today is not
-- marked overdue until tomorrow.
select cron.schedule('generate-rent-charges', '5 0 * * *', $$select private.generate_rent_charges()$$);
select cron.schedule('mark-overdue-rent-charges', '15 0 * * *', $$select private.mark_overdue_rent_charges()$$);

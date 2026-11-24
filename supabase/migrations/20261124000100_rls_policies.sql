-- Row Level Security for every public table.
--
-- Access model (v1):
--   admin    sees and manages everything in their own organization, reads the audit log
--   manager  manages properties, units, leases and requests in their organization
--   tenant   sees their own leases, charges, payments, requests and the units they relate to
--   staff    sees maintenance requests assigned to them and the units those are in
--
-- Nothing is readable across organizations. anon gets no table access at all.
-- Rent charges, payments, notifications and the audit log have no client write
-- path: they are written by pg_cron jobs and server code using the service role
-- (the Stripe webhook is the only thing that records a payment).

-- Helper functions ----------------------------------------------------------
-- security definer so they can read profiles without recursing into its RLS.
-- They only ever describe the calling user.

create function private.current_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles where id = (select auth.uid());
$$;

create function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- The caller's org id if they are an admin or manager, otherwise null.
create function private.managed_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles
  where id = (select auth.uid()) and role in ('admin', 'manager');
$$;

-- The caller's org id if they are an admin, otherwise null.
create function private.admin_org_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select org_id from public.profiles
  where id = (select auth.uid()) and role = 'admin';
$$;

revoke all on all functions in schema private from public;
grant usage on schema private to authenticated;
grant execute on function
  private.current_org_id(),
  private.current_user_role(),
  private.managed_org_id(),
  private.admin_org_id()
to authenticated;

-- Grants --------------------------------------------------------------------
-- Start from nothing, then grant only what each table needs. New tables in
-- later migrations also start with no client access.

revoke all on all tables in schema public from anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated;

grant select on public.organizations to authenticated;
grant update (name, currency) on public.organizations to authenticated;

grant select on public.profiles to authenticated;
grant update (full_name, phone) on public.profiles to authenticated;

grant select (id, org_id, email, role, invited_by, expires_at, accepted_at, created_at)
  on public.invites to authenticated;
grant insert (org_id, email, role, token_hash, invited_by, expires_at) on public.invites to authenticated;
grant delete on public.invites to authenticated;

grant select, insert, update, delete on public.properties to authenticated;
grant select, insert, update, delete on public.units to authenticated;
grant select, insert, update on public.leases to authenticated;

grant select on public.rent_charges to authenticated;
grant select on public.payments to authenticated;

grant select on public.maintenance_requests to authenticated;
grant insert (org_id, unit_id, tenant_id, title, description)
  on public.maintenance_requests to authenticated;
grant update (title, description, category, priority, status, assigned_to)
  on public.maintenance_requests to authenticated;

grant select on public.request_photos to authenticated;
grant insert (org_id, request_id, storage_path, uploaded_by) on public.request_photos to authenticated;

grant select on public.request_updates to authenticated;
grant insert (org_id, request_id, author_id, status, note) on public.request_updates to authenticated;

grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

grant select on public.audit_log to authenticated;

-- Enable RLS everywhere -----------------------------------------------------

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.properties enable row level security;
alter table public.units enable row level security;
alter table public.leases enable row level security;
alter table public.rent_charges enable row level security;
alter table public.payments enable row level security;
alter table public.maintenance_requests enable row level security;
alter table public.request_photos enable row level security;
alter table public.request_updates enable row level security;
alter table public.notifications enable row level security;
alter table public.audit_log enable row level security;

-- organizations -------------------------------------------------------------

create policy "members read their organization"
  on public.organizations for select to authenticated
  using (id = (select private.current_org_id()));

create policy "admins update their organization"
  on public.organizations for update to authenticated
  using (id = (select private.admin_org_id()))
  with check (id = (select private.admin_org_id()));

-- profiles ------------------------------------------------------------------

create policy "users read own profile, managers read org, members read their managers"
  on public.profiles for select to authenticated
  using (
    id = (select auth.uid())
    or org_id = (select private.managed_org_id())
    or (org_id = (select private.current_org_id()) and role in ('admin', 'manager'))
  );

create policy "users update own profile, admins update org profiles"
  on public.profiles for update to authenticated
  using (id = (select auth.uid()) or org_id = (select private.admin_org_id()))
  with check (id = (select auth.uid()) or org_id = (select private.admin_org_id()));

-- invites -------------------------------------------------------------------

create policy "managers read org invites"
  on public.invites for select to authenticated
  using (org_id = (select private.managed_org_id()));

create policy "managers invite tenants and staff, admins invite any role"
  on public.invites for insert to authenticated
  with check (
    org_id = (select private.managed_org_id())
    and invited_by = (select auth.uid())
    and (role in ('tenant', 'staff') or org_id = (select private.admin_org_id()))
  );

create policy "managers revoke org invites"
  on public.invites for delete to authenticated
  using (org_id = (select private.managed_org_id()));

-- properties ----------------------------------------------------------------

create policy "managers read org properties, others read properties of units they can see"
  on public.properties for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or exists (select 1 from public.units u where u.property_id = properties.id)
  );

create policy "managers create org properties"
  on public.properties for insert to authenticated
  with check (org_id = (select private.managed_org_id()));

create policy "managers update org properties"
  on public.properties for update to authenticated
  using (org_id = (select private.managed_org_id()))
  with check (org_id = (select private.managed_org_id()));

create policy "managers delete org properties"
  on public.properties for delete to authenticated
  using (org_id = (select private.managed_org_id()));

-- units ---------------------------------------------------------------------
-- The subqueries run under the caller's RLS on leases and maintenance_requests,
-- so a tenant sees units they lease and staff see units they have jobs in.

create policy "managers read org units, tenants and staff read related units"
  on public.units for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or exists (select 1 from public.leases l where l.unit_id = units.id)
    or exists (select 1 from public.maintenance_requests r where r.unit_id = units.id)
  );

create policy "managers create org units"
  on public.units for insert to authenticated
  with check (org_id = (select private.managed_org_id()));

create policy "managers update org units"
  on public.units for update to authenticated
  using (org_id = (select private.managed_org_id()))
  with check (org_id = (select private.managed_org_id()));

create policy "managers delete org units"
  on public.units for delete to authenticated
  using (org_id = (select private.managed_org_id()));

-- leases --------------------------------------------------------------------

create policy "managers read org leases, tenants read own"
  on public.leases for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or tenant_id = (select auth.uid())
  );

create policy "managers create org leases"
  on public.leases for insert to authenticated
  with check (org_id = (select private.managed_org_id()));

create policy "managers update org leases"
  on public.leases for update to authenticated
  using (org_id = (select private.managed_org_id()))
  with check (org_id = (select private.managed_org_id()));

-- rent_charges --------------------------------------------------------------

create policy "managers read org charges, tenants read charges on own leases"
  on public.rent_charges for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or lease_id in (select l.id from public.leases l where l.tenant_id = (select auth.uid()))
  );

-- payments ------------------------------------------------------------------

create policy "managers read org payments, tenants read payments on own charges"
  on public.payments for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or rent_charge_id in (
      select rc.id
      from public.rent_charges rc
      join public.leases l on l.id = rc.lease_id
      where l.tenant_id = (select auth.uid())
    )
  );

-- maintenance_requests ------------------------------------------------------

create policy "managers read org requests, tenants read own, staff read assigned"
  on public.maintenance_requests for select to authenticated
  using (
    org_id = (select private.managed_org_id())
    or tenant_id = (select auth.uid())
    or assigned_to = (select auth.uid())
  );

create policy "tenants report requests on units they actively lease"
  on public.maintenance_requests for insert to authenticated
  with check (
    tenant_id = (select auth.uid())
    and org_id = (select private.current_org_id())
    and (select private.current_user_role()) = 'tenant'
    and exists (
      select 1 from public.leases l
      where l.unit_id = maintenance_requests.unit_id
        and l.tenant_id = (select auth.uid())
        and l.status = 'active'
    )
  );

create policy "managers update org requests"
  on public.maintenance_requests for update to authenticated
  using (org_id = (select private.managed_org_id()))
  with check (org_id = (select private.managed_org_id()));

-- request_photos and request_updates ----------------------------------------
-- Visible to anyone who can see the parent request (checked under its RLS).

create policy "read photos of visible requests"
  on public.request_photos for select to authenticated
  using (request_id in (select r.id from public.maintenance_requests r));

create policy "add photos to visible requests"
  on public.request_photos for insert to authenticated
  with check (
    uploaded_by = (select auth.uid())
    and org_id = (select private.current_org_id())
    and request_id in (select r.id from public.maintenance_requests r)
  );

create policy "read updates of visible requests"
  on public.request_updates for select to authenticated
  using (request_id in (select r.id from public.maintenance_requests r));

create policy "add updates to visible requests"
  on public.request_updates for insert to authenticated
  with check (
    author_id = (select auth.uid())
    and org_id = (select private.current_org_id())
    and request_id in (select r.id from public.maintenance_requests r)
  );

-- notifications -------------------------------------------------------------

create policy "users read own notifications"
  on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));

create policy "users mark own notifications read"
  on public.notifications for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- audit_log -----------------------------------------------------------------

create policy "admins read org audit log"
  on public.audit_log for select to authenticated
  using (org_id = (select private.admin_org_id()));

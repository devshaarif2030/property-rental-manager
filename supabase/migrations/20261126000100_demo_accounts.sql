-- Public demo logins.
--
-- The live demo has one-click "Try as ..." buttons. private.demo_accounts maps
-- each demo role to the account the button signs in as. Server code reads the
-- email with the service role, creates a one-time sign-in token and exchanges
-- it for a session, so no demo password is ever shown or stored in the app.
--
-- Admin is left out on purpose: the owner's real admin account lives in the
-- demo organization, and a public admin login would expose the audit log and
-- organization settings.
--
-- Demo accounts are shared by everyone, so they cannot create invites. That
-- stops a visitor from inviting themselves a permanent account in the org.

create table private.demo_accounts (
  role public.user_role primary key check (role in ('manager', 'tenant', 'staff')),
  user_id uuid not null unique references public.profiles (id) on delete cascade
);

-- True when the caller is one of the shared demo accounts.
create function private.is_demo_user()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from private.demo_accounts where user_id = (select auth.uid()));
$$;

revoke all on function private.is_demo_user() from public;
grant execute on function private.is_demo_user() to authenticated;

-- The email of the demo account for a role, or null if none is set up or the
-- profile's role no longer matches. Server only (service role).
create function public.demo_account_email(p_role public.user_role)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select u.email::text
  from private.demo_accounts d
  join public.profiles p on p.id = d.user_id and p.role = d.role
  join auth.users u on u.id = d.user_id
  where d.role = p_role;
$$;

revoke all on function public.demo_account_email(public.user_role) from public, anon, authenticated;
grant execute on function public.demo_account_email(public.user_role) to service_role;

drop policy "managers invite tenants and staff, admins invite any role" on public.invites;

create policy "managers invite tenants and staff, admins invite any role, demo accounts cannot invite"
  on public.invites for insert to authenticated
  with check (
    org_id = (select private.managed_org_id())
    and invited_by = (select auth.uid())
    and (role in ('tenant', 'staff') or org_id = (select private.admin_org_id()))
    and not (select private.is_demo_user())
  );

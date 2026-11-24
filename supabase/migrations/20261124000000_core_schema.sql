-- Core schema for Property Rental Manager v1.
-- Every business table carries org_id. Child tables reference their parent with
-- a composite (org_id, id) foreign key, so a row can never point at a parent
-- that belongs to another organization.
-- Money is stored as integer minor units (cents) to match Stripe.

create schema if not exists private;
revoke all on schema private from public;

-- Enums ---------------------------------------------------------------------

create type public.user_role as enum ('admin', 'manager', 'tenant', 'staff');
create type public.unit_status as enum ('vacant', 'occupied');
create type public.lease_status as enum ('active', 'ended');
create type public.rent_charge_status as enum ('due', 'paid', 'overdue');
create type public.payment_status as enum ('pending', 'succeeded', 'failed', 'refunded');
create type public.request_status as enum ('open', 'assigned', 'in_progress', 'done', 'cancelled');
create type public.request_category as enum (
  'plumbing', 'electrical', 'heating', 'appliance', 'pest', 'structural', 'other'
);
create type public.request_priority as enum ('emergency', 'high', 'normal', 'low');

-- Shared triggers -------------------------------------------------------------

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Tables --------------------------------------------------------------------

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) between 1 and 200),
  currency char(3) not null default 'USD' check (currency in ('USD', 'GBP')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  org_id uuid not null references public.organizations (id) on delete cascade,
  role public.user_role not null,
  full_name text not null check (length(trim(full_name)) between 1 and 200),
  phone text check (length(phone) <= 32),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id)
);

create table public.invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  email text not null check (email = lower(email) and email like '%_@_%'),
  role public.user_role not null,
  token_hash text not null unique,
  invited_by uuid not null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (org_id, invited_by) references public.profiles (org_id, id) on delete cascade
);

-- One pending invite per email per org.
create unique index invites_pending_email_idx
  on public.invites (org_id, email)
  where accepted_at is null;

create table public.properties (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null check (length(trim(name)) between 1 and 200),
  address_line text not null,
  city text not null,
  postcode text not null,
  country char(2) not null check (country in ('US', 'GB')),
  manager_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, manager_id) references public.profiles (org_id, id) on delete set null (manager_id)
);

create table public.units (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  property_id uuid not null,
  label text not null check (length(trim(label)) between 1 and 50),
  bedrooms smallint not null default 0 check (bedrooms between 0 and 20),
  bathrooms smallint not null default 1 check (bathrooms between 0 and 20),
  rent_amount_cents integer not null check (rent_amount_cents > 0),
  status public.unit_status not null default 'vacant',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  unique (property_id, label),
  foreign key (org_id, property_id) references public.properties (org_id, id) on delete cascade
);

create table public.leases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  unit_id uuid not null,
  tenant_id uuid not null,
  start_date date not null,
  end_date date,
  rent_amount_cents integer not null check (rent_amount_cents > 0),
  deposit_amount_cents integer not null default 0 check (deposit_amount_cents >= 0),
  due_day smallint not null check (due_day between 1 and 28),
  status public.lease_status not null default 'active',
  document_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  check (end_date is null or end_date > start_date),
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete restrict,
  foreign key (org_id, tenant_id) references public.profiles (org_id, id) on delete restrict
);

-- At most one active lease per unit.
create unique index leases_one_active_per_unit_idx
  on public.leases (unit_id)
  where status = 'active';

create table public.rent_charges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  lease_id uuid not null,
  period_month date not null check (extract(day from period_month) = 1),
  amount_cents integer not null check (amount_cents > 0),
  due_date date not null,
  status public.rent_charge_status not null default 'due',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  unique (lease_id, period_month),
  foreign key (org_id, lease_id) references public.leases (org_id, id) on delete restrict
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  rent_charge_id uuid not null,
  amount_cents integer not null check (amount_cents > 0),
  stripe_session_id text not null unique,
  stripe_payment_intent text unique,
  status public.payment_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (status <> 'succeeded' or paid_at is not null),
  foreign key (org_id, rent_charge_id) references public.rent_charges (org_id, id) on delete restrict
);

create table public.maintenance_requests (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  unit_id uuid not null,
  tenant_id uuid not null,
  title text not null check (length(trim(title)) between 3 and 120),
  description text not null check (length(description) <= 4000),
  category public.request_category,
  priority public.request_priority,
  ai_category public.request_category,
  ai_priority public.request_priority,
  ai_reason text check (length(ai_reason) <= 300),
  status public.request_status not null default 'open',
  assigned_to uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (org_id, id),
  foreign key (org_id, unit_id) references public.units (org_id, id) on delete restrict,
  foreign key (org_id, tenant_id) references public.profiles (org_id, id) on delete restrict,
  foreign key (org_id, assigned_to) references public.profiles (org_id, id) on delete set null (assigned_to)
);

create table public.request_photos (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  request_id uuid not null,
  storage_path text not null unique,
  uploaded_by uuid not null,
  created_at timestamptz not null default now(),
  foreign key (org_id, request_id) references public.maintenance_requests (org_id, id) on delete cascade,
  foreign key (org_id, uploaded_by) references public.profiles (org_id, id) on delete restrict
);

create table public.request_updates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  request_id uuid not null,
  author_id uuid not null,
  status public.request_status,
  note text check (length(note) <= 2000),
  created_at timestamptz not null default now(),
  check (status is not null or note is not null),
  foreign key (org_id, request_id) references public.maintenance_requests (org_id, id) on delete cascade,
  foreign key (org_id, author_id) references public.profiles (org_id, id) on delete restrict
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null,
  type text not null check (
    type in ('rent_due', 'rent_overdue', 'request_assigned', 'request_status_changed', 'request_emergency')
  ),
  title text not null check (length(title) <= 200),
  link text check (link like '/%'),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (org_id, user_id) references public.profiles (org_id, id) on delete cascade
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  org_id uuid not null references public.organizations (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- The audit log is insert-only for everyone, including the service role.
-- Rows still go away with their organization through the cascade above.
create function private.reject_audit_log_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'audit_log is insert-only';
end;
$$;

create trigger audit_log_insert_only
  before update on public.audit_log
  for each row execute function private.reject_audit_log_change();

create trigger audit_log_no_direct_delete
  before delete on public.audit_log
  for each row
  when (pg_trigger_depth() = 0)
  execute function private.reject_audit_log_change();

-- updated_at triggers -------------------------------------------------------

create trigger organizations_set_updated_at before update on public.organizations
  for each row execute function private.set_updated_at();
create trigger profiles_set_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger properties_set_updated_at before update on public.properties
  for each row execute function private.set_updated_at();
create trigger units_set_updated_at before update on public.units
  for each row execute function private.set_updated_at();
create trigger leases_set_updated_at before update on public.leases
  for each row execute function private.set_updated_at();
create trigger rent_charges_set_updated_at before update on public.rent_charges
  for each row execute function private.set_updated_at();
create trigger maintenance_requests_set_updated_at before update on public.maintenance_requests
  for each row execute function private.set_updated_at();

-- Indexes for foreign keys and RLS lookups -----------------------------------

create index profiles_org_id_idx on public.profiles (org_id);
create index invites_org_id_idx on public.invites (org_id);
create index properties_org_id_idx on public.properties (org_id);
create index units_org_id_idx on public.units (org_id);
create index units_property_id_idx on public.units (property_id);
create index leases_org_id_idx on public.leases (org_id);
create index leases_tenant_id_idx on public.leases (tenant_id);
create index rent_charges_org_id_idx on public.rent_charges (org_id);
create index rent_charges_status_due_date_idx on public.rent_charges (status, due_date);
create index payments_org_id_idx on public.payments (org_id);
create index payments_rent_charge_id_idx on public.payments (rent_charge_id);
create index maintenance_requests_org_id_idx on public.maintenance_requests (org_id);
create index maintenance_requests_unit_id_idx on public.maintenance_requests (unit_id);
create index maintenance_requests_tenant_id_idx on public.maintenance_requests (tenant_id);
create index maintenance_requests_assigned_to_idx on public.maintenance_requests (assigned_to);
create index request_photos_request_id_idx on public.request_photos (request_id);
create index request_updates_request_id_idx on public.request_updates (request_id);
create index notifications_user_id_created_at_idx on public.notifications (user_id, created_at desc);
create index audit_log_org_id_created_at_idx on public.audit_log (org_id, created_at desc);

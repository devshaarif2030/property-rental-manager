-- Lease rules enforced in the database:
--   1. A lease's tenant must have the tenant role.
--   2. A unit's status follows its leases: occupied while it has an active
--      lease, vacant otherwise. Managers never set it by hand.

create function private.check_lease_tenant_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.profiles
    where id = new.tenant_id and org_id = new.org_id and role = 'tenant'
  ) then
    raise exception 'lease_tenant_not_tenant' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger leases_tenant_must_be_tenant
  before insert or update of tenant_id on public.leases
  for each row execute function private.check_lease_tenant_role();

-- Runs as definer: tenants and managers cannot update units.status directly
-- (it is not in the managers' editable columns), only through leases.
create function private.sync_unit_status()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_unit_ids uuid[];
begin
  if tg_op = 'UPDATE' and old.unit_id is distinct from new.unit_id then
    v_unit_ids := array[old.unit_id, new.unit_id];
  else
    v_unit_ids := array[new.unit_id];
  end if;

  update public.units u
  set status = case
    when exists (
      select 1 from public.leases l where l.unit_id = u.id and l.status = 'active'
    ) then 'occupied'::public.unit_status
    else 'vacant'::public.unit_status
  end
  where u.id = any (v_unit_ids);

  return null;
end;
$$;

create trigger leases_sync_unit_status
  after insert or update of status, unit_id on public.leases
  for each row execute function private.sync_unit_status();

-- Managers edit unit details but not the status, which leases own.
revoke update on public.units from authenticated;
grant update (label, bedrooms, bathrooms, rent_amount_cents) on public.units to authenticated;

-- A lease cannot move to another unit or tenant once created; end it and
-- create a new one instead. Managers edit terms and status only.
revoke update on public.leases from authenticated;
grant update (end_date, rent_amount_cents, deposit_amount_cents, due_day, status, document_path)
  on public.leases to authenticated;

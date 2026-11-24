import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type LeaseRow = {
  id: string;
  status: Database["public"]["Enums"]["lease_status"];
  startDate: string;
  endDate: string | null;
  rentAmountCents: number;
  depositAmountCents: number;
  dueDay: number;
  tenantName: string;
  hasDocument: boolean;
};

export type UnitWithLeases = {
  id: string;
  propertyId: string;
  propertyName: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  rentAmountCents: number;
  status: Database["public"]["Enums"]["unit_status"];
  activeLease: LeaseRow | null;
  pastLeases: LeaseRow[];
};

const LEASE_COLUMNS = `id, status, start_date, end_date, rent_amount_cents, deposit_amount_cents, due_day, document_path,
  tenant:profiles!leases_org_id_tenant_id_fkey(full_name)`;

type LeaseRecord = {
  id: string;
  status: Database["public"]["Enums"]["lease_status"];
  start_date: string;
  end_date: string | null;
  rent_amount_cents: number;
  deposit_amount_cents: number;
  due_day: number;
  document_path: string | null;
  tenant: { full_name: string };
};

function toLeaseRow(lease: LeaseRecord): LeaseRow {
  return {
    id: lease.id,
    status: lease.status,
    startDate: lease.start_date,
    endDate: lease.end_date,
    rentAmountCents: lease.rent_amount_cents,
    depositAmountCents: lease.deposit_amount_cents,
    dueDay: lease.due_day,
    tenantName: lease.tenant.full_name,
    hasDocument: lease.document_path !== null,
  };
}

// All queries run as the signed-in user, so RLS decides what comes back.

export async function getUnitWithLeases(supabase: Client, unitId: string): Promise<UnitWithLeases | null> {
  const { data, error } = await supabase
    .from("units")
    .select(
      `id, property_id, label, bedrooms, bathrooms, rent_amount_cents, status,
       properties(name), leases(${LEASE_COLUMNS})`,
    )
    .eq("id", unitId)
    .order("start_date", { referencedTable: "leases", ascending: false })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const leases = data.leases.map(toLeaseRow);
  return {
    id: data.id,
    propertyId: data.property_id,
    propertyName: data.properties.name,
    label: data.label,
    bedrooms: data.bedrooms,
    bathrooms: data.bathrooms,
    rentAmountCents: data.rent_amount_cents,
    status: data.status,
    activeLease: leases.find((lease) => lease.status === "active") ?? null,
    pastLeases: leases.filter((lease) => lease.status !== "active"),
  };
}

export async function getLease(supabase: Client, leaseId: string) {
  const { data, error } = await supabase
    .from("leases")
    .select(`${LEASE_COLUMNS}, unit_id, units(label, property_id)`)
    .eq("id", leaseId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return { ...toLeaseRow(data), unitId: data.unit_id, unitLabel: data.units.label, propertyId: data.units.property_id };
}

export type TenantOption = { id: string; fullName: string; hasActiveLease: boolean };

/** Tenants in the caller's org, for the lease form. */
export async function listTenantOptions(supabase: Client): Promise<TenantOption[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, leases!leases_org_id_tenant_id_fkey(status)")
    .eq("role", "tenant")
    .order("full_name");
  if (error) throw error;

  return data.map((tenant) => ({
    id: tenant.id,
    fullName: tenant.full_name,
    hasActiveLease: tenant.leases.some((lease) => lease.status === "active"),
  }));
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type PropertySummary = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  postcode: string;
  unitCount: number;
  occupiedCount: number;
};

export type UnitRow = {
  id: string;
  label: string;
  bedrooms: number;
  bathrooms: number;
  rentAmountCents: number;
  status: Database["public"]["Enums"]["unit_status"];
  currentTenantName: string | null;
};

export type PropertyDetail = {
  id: string;
  name: string;
  addressLine: string;
  city: string;
  postcode: string;
  country: string;
  units: UnitRow[];
};

// All queries run as the signed-in user, so RLS decides what comes back.

export async function listProperties(supabase: Client): Promise<PropertySummary[]> {
  const { data, error } = await supabase
    .from("properties")
    .select("id, name, address_line, city, postcode, units(status)")
    .order("name");
  if (error) throw error;

  return data.map((property) => ({
    id: property.id,
    name: property.name,
    addressLine: property.address_line,
    city: property.city,
    postcode: property.postcode,
    unitCount: property.units.length,
    occupiedCount: property.units.filter((unit) => unit.status === "occupied").length,
  }));
}

export async function getPropertyDetail(supabase: Client, propertyId: string): Promise<PropertyDetail | null> {
  const { data, error } = await supabase
    .from("properties")
    .select(
      `id, name, address_line, city, postcode, country,
       units(id, label, bedrooms, bathrooms, rent_amount_cents, status,
         leases(status, tenant:profiles!leases_org_id_tenant_id_fkey(full_name)))`,
    )
    .eq("id", propertyId)
    .order("label", { referencedTable: "units" })
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    name: data.name,
    addressLine: data.address_line,
    city: data.city,
    postcode: data.postcode,
    country: data.country,
    units: data.units.map((unit) => ({
      id: unit.id,
      label: unit.label,
      bedrooms: unit.bedrooms,
      bathrooms: unit.bathrooms,
      rentAmountCents: unit.rent_amount_cents,
      status: unit.status,
      currentTenantName: unit.leases.find((lease) => lease.status === "active")?.tenant.full_name ?? null,
    })),
  };
}

export async function getUnit(supabase: Client, unitId: string) {
  const { data, error } = await supabase
    .from("units")
    .select("id, property_id, label, bedrooms, bathrooms, rent_amount_cents, properties(name)")
    .eq("id", unitId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getOrganizationCurrency(supabase: Client, orgId: string): Promise<string> {
  const { data, error } = await supabase.from("organizations").select("currency").eq("id", orgId).single();
  if (error) throw error;
  return data.currency;
}

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

import type { ChargeRow } from "./summary";

type Client = SupabaseClient<Database>;

// Queries run as the signed-in manager or admin, so RLS limits them to their org.

export type Occupancy = { total: number; occupied: number };

export async function getOccupancy(supabase: Client): Promise<Occupancy> {
  const { data, error } = await supabase.from("units").select("status");
  if (error) throw error;
  return { total: data.length, occupied: data.filter((unit) => unit.status === "occupied").length };
}

/** Rent charges from `fromMonth` on, for the collection chart. */
export async function listChargesSince(supabase: Client, fromMonth: string): Promise<ChargeRow[]> {
  const { data, error } = await supabase
    .from("rent_charges")
    .select("period_month, amount_cents, status")
    .gte("period_month", fromMonth);
  if (error) throw error;
  return data.map((charge) => ({
    periodMonth: charge.period_month,
    amountCents: charge.amount_cents,
    status: charge.status,
  }));
}

export type OverdueCharge = {
  id: string;
  amountCents: number;
  dueDate: string;
  periodMonth: string;
  tenantName: string;
  unitLabel: string;
  propertyName: string;
};

/** Overdue charges, oldest first. */
export async function listOverdueCharges(supabase: Client): Promise<OverdueCharge[]> {
  const { data, error } = await supabase
    .from("rent_charges")
    .select("id, amount_cents, due_date, period_month, leases(profiles(full_name), units(label, properties(name)))")
    .eq("status", "overdue")
    .order("due_date", { ascending: true });
  if (error) throw error;
  return data.map((charge) => ({
    id: charge.id,
    amountCents: charge.amount_cents,
    dueDate: charge.due_date,
    periodMonth: charge.period_month,
    tenantName: charge.leases.profiles.full_name,
    unitLabel: charge.leases.units.label,
    propertyName: charge.leases.units.properties.name,
  }));
}

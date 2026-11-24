import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

type Client = SupabaseClient<Database>;

export type OpenCharge = {
  id: string;
  periodMonth: string;
  amountCents: number;
  dueDate: string;
  status: Database["public"]["Enums"]["rent_charge_status"];
  unitLabel: string;
  propertyName: string;
};

// Queries run as the signed-in tenant, so RLS limits them to their own leases.

/** Unpaid charges, oldest first, so overdue rent is at the top. */
export async function listOpenCharges(supabase: Client): Promise<OpenCharge[]> {
  const { data, error } = await supabase
    .from("rent_charges")
    .select("id, period_month, amount_cents, due_date, status, leases(units(label, properties(name)))")
    .in("status", ["due", "overdue"])
    .order("due_date", { ascending: true });
  if (error) throw error;

  return data.map((charge) => ({
    id: charge.id,
    periodMonth: charge.period_month,
    amountCents: charge.amount_cents,
    dueDate: charge.due_date,
    status: charge.status,
    unitLabel: charge.leases.units.label,
    propertyName: charge.leases.units.properties.name,
  }));
}

export type Receipt = {
  paymentId: string;
  status: Database["public"]["Enums"]["payment_status"];
  amountCents: number;
  paidAt: string | null;
  periodMonth: string;
  unitLabel: string;
  propertyName: string;
  propertyAddress: string;
};

export async function getReceiptBySession(supabase: Client, sessionId: string): Promise<Receipt | null> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `id, status, amount_cents, paid_at,
       rent_charges(period_month, leases(units(label, properties(name, address_line, city, postcode))))`,
    )
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const unit = data.rent_charges.leases.units;
  return {
    paymentId: data.id,
    status: data.status,
    amountCents: data.amount_cents,
    paidAt: data.paid_at,
    periodMonth: data.rent_charges.period_month,
    unitLabel: unit.label,
    propertyName: unit.properties.name,
    propertyAddress: `${unit.properties.address_line}, ${unit.properties.city} ${unit.properties.postcode}`,
  };
}

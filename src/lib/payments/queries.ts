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

export type PaymentHistoryRow = {
  id: string;
  sessionId: string;
  amountCents: number;
  paidAt: string;
  periodMonth: string;
};

/** Succeeded payments, newest first. Each links to its receipt. */
export async function listPaymentHistory(supabase: Client, limit = 24): Promise<PaymentHistoryRow[]> {
  const { data, error } = await supabase
    .from("payments")
    .select("id, stripe_session_id, amount_cents, paid_at, rent_charges(period_month)")
    .eq("status", "succeeded")
    .order("paid_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  return data.flatMap((payment) =>
    payment.paid_at
      ? [
          {
            id: payment.id,
            sessionId: payment.stripe_session_id,
            amountCents: payment.amount_cents,
            paidAt: payment.paid_at,
            periodMonth: payment.rent_charges.period_month,
          },
        ]
      : [],
  );
}

export type TenantLease = {
  id: string;
  startDate: string;
  endDate: string | null;
  rentAmountCents: number;
  dueDay: number;
  hasDocument: boolean;
  unitLabel: string;
  propertyName: string;
  propertyAddress: string;
};

/** The tenant's current lease, if any. A tenant has at most a few, so pick the latest active one. */
export async function getTenantLease(supabase: Client, tenantId: string): Promise<TenantLease | null> {
  const { data, error } = await supabase
    .from("leases")
    .select(
      `id, start_date, end_date, rent_amount_cents, due_day, document_path,
       units(label, properties(name, address_line, city, postcode))`,
    )
    .eq("tenant_id", tenantId)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const property = data.units.properties;
  return {
    id: data.id,
    startDate: data.start_date,
    endDate: data.end_date,
    rentAmountCents: data.rent_amount_cents,
    dueDay: data.due_day,
    hasDocument: data.document_path !== null,
    unitLabel: data.units.label,
    propertyName: property.name,
    propertyAddress: `${property.address_line}, ${property.city} ${property.postcode}`,
  };
}

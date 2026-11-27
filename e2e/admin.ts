import { createClient } from "@supabase/supabase-js";
import Stripe from "stripe";

import type { Database } from "@/lib/supabase/database.types";

/**
 * Test-only helpers that stand in for Stripe. CI has no Stripe account, so the
 * tests create the pending payment that Checkout would have created, then
 * deliver a signed webhook the same way Stripe does. The app still verifies
 * the signature and records the payment through its own webhook route.
 */
/** The demo tenant from supabase/seed.sql. */
const DEMO_TENANT_NAME = "Taylor Tenant";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See the e2e job in .github/workflows/ci.yml.`);
  return value;
}

export function adminClient() {
  return createClient<Database>(requireEnv("NEXT_PUBLIC_SUPABASE_URL"), requireEnv("SUPABASE_SECRET_KEY"), {
    auth: { persistSession: false },
  });
}

/** The demo tenant's oldest unpaid rent charge, with the org currency. */
export async function demoTenantUnpaidCharge() {
  const db = adminClient();
  const { data: tenant, error: tenantError } = await db
    .from("profiles")
    .select("id, org_id")
    .eq("role", "tenant")
    .eq("full_name", DEMO_TENANT_NAME)
    .single();
  if (tenantError) throw tenantError;

  const { data: charge, error } = await db
    .from("rent_charges")
    .select("id, org_id, amount_cents, period_month, leases!inner(tenant_id)")
    .eq("leases.tenant_id", tenant.id)
    .neq("status", "paid")
    .order("period_month")
    .limit(1)
    .single();
  if (error) throw error;

  const { data: org, error: orgError } = await db.from("organizations").select("currency").eq("id", tenant.org_id).single();
  if (orgError) throw orgError;
  return { ...charge, currency: org.currency };
}

/** Writes the pending payment row that starting Checkout would write. */
export async function createPendingPayment(charge: { id: string; org_id: string; amount_cents: number }) {
  const sessionId = `cs_test_e2e_${Date.now()}`;
  const { error } = await adminClient().from("payments").insert({
    org_id: charge.org_id,
    rent_charge_id: charge.id,
    amount_cents: charge.amount_cents,
    stripe_session_id: sessionId,
  });
  if (error) throw error;
  return sessionId;
}

/** A checkout.session.completed event body and its Stripe-Signature header. */
export function signedCheckoutCompleted(session: { id: string; amountCents: number; currency: string }) {
  const payload = JSON.stringify({
    id: `evt_e2e_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        payment_status: "paid",
        payment_intent: `pi_e2e_${Date.now()}`,
        amount_total: session.amountCents,
        currency: session.currency.toLowerCase(),
      },
    },
  });
  const signature = new Stripe(requireEnv("STRIPE_SECRET_KEY")).webhooks.generateTestHeaderString({
    payload,
    secret: requireEnv("STRIPE_WEBHOOK_SECRET"),
  });
  return { payload, signature };
}

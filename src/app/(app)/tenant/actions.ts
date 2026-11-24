"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { formatIsoMonth } from "@/lib/dates";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { idSchema, type FormActionResult } from "@/lib/properties/schemas";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/server";

const TENANT_PATH = "/tenant";
const CHECKOUT_MINUTES = 30;

const NOT_FOUND: FormActionResult = { ok: false, error: "That charge no longer exists." };
const FAILED: FormActionResult = { ok: false, error: "Could not start the payment. Try again." };

/**
 * Starts a Stripe Checkout (test mode) for one of the tenant's own charges.
 * This only creates a pending payment. The charge is marked paid later, by
 * the verified webhook, never here.
 */
export async function payRentCharge(chargeId: string): Promise<FormActionResult> {
  const user = await requireRole(["tenant"], TENANT_PATH);
  const id = idSchema.safeParse(chargeId);
  if (!id.success) return NOT_FOUND;

  // Read as the tenant: RLS only returns charges on their own leases.
  const supabase = await createClient();
  const { data: charge, error } = await supabase
    .from("rent_charges")
    .select("id, org_id, amount_cents, status, period_month")
    .eq("id", id.data)
    .maybeSingle();
  if (error) return FAILED;
  if (!charge) return NOT_FOUND;
  if (charge.status === "paid") return { ok: false, error: "This charge is already paid." };

  // Next.js checks the Origin header of every server action against the host.
  const origin = (await headers()).get("origin");
  if (!origin) return FAILED;

  const currency = await getOrganizationCurrency(supabase, user.orgId);
  const stripe = getStripe();
  let session;
  try {
    session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency.toLowerCase(),
            unit_amount: charge.amount_cents,
            product_data: { name: `Rent for ${formatIsoMonth(charge.period_month)}` },
          },
        },
      ],
      customer_email: user.email || undefined,
      client_reference_id: charge.id,
      metadata: { rent_charge_id: charge.id, org_id: charge.org_id },
      expires_at: Math.floor(Date.now() / 1000) + CHECKOUT_MINUTES * 60,
      success_url: `${origin}/tenant/payments/{CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}${TENANT_PATH}`,
    });
  } catch {
    return FAILED;
  }

  // Payments have no client write path; the pending row is written with the
  // service role, from values read under the tenant's RLS above.
  const { error: insertError } = await createAdminClient().from("payments").insert({
    org_id: charge.org_id,
    rent_charge_id: charge.id,
    amount_cents: charge.amount_cents,
    stripe_session_id: session.id,
  });
  if (insertError || !session.url) {
    await stripe.checkout.sessions.expire(session.id).catch(() => undefined);
    return FAILED;
  }

  redirect(session.url);
}

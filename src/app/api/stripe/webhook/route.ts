import type Stripe from "stripe";

import { paymentActionFor } from "@/lib/payments/webhook";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, getStripeEnv } from "@/lib/stripe/server";

/**
 * Stripe webhook. The only place a payment is recorded.
 *
 * The raw body is verified against the signing secret before anything else.
 * Recording is idempotent in the database, so Stripe's retries and duplicate
 * deliveries are safe. Errors we cannot fix by retrying return 200 so Stripe
 * stops; database outages return 500 so Stripe tries again.
 */
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();
  let event: Stripe.Event;
  try {
    event = await getStripe().webhooks.constructEventAsync(payload, signature, getStripeEnv().STRIPE_WEBHOOK_SECRET);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  const action = paymentActionFor(event);
  if (action.kind === "ignore") return Response.json({ received: true });

  const supabase = createAdminClient();
  const { error } =
    action.kind === "record"
      ? await supabase.rpc("record_rent_payment", {
          p_session_id: action.sessionId,
          p_payment_intent: action.paymentIntent ?? "",
          p_amount_cents: action.amountCents,
          p_currency: action.currency,
        })
      : await supabase.rpc("fail_rent_payment", { p_session_id: action.sessionId });

  if (error) {
    // Unknown session (not ours) or an amount mismatch: retrying will not help.
    if (error.message === "payment_not_found" || error.message === "payment_amount_mismatch") {
      console.error("stripe webhook: payment not recorded", { event: event.id, reason: error.message });
      return Response.json({ received: true });
    }
    return new Response("Could not record payment", { status: 500 });
  }

  return Response.json({ received: true });
}

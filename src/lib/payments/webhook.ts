import type Stripe from "stripe";

/** What the webhook asks the database to do for one Stripe event. */
export type PaymentAction =
  | { kind: "record"; sessionId: string; paymentIntent: string | null; amountCents: number; currency: string }
  | { kind: "fail"; sessionId: string }
  | { kind: "ignore" };

function paymentIntentId(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

/**
 * Maps a verified Stripe event to a payment action. Only a paid Checkout
 * Session records a payment; delayed methods record on async success.
 */
export function paymentActionFor(event: Stripe.Event): PaymentAction {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object;
      if (session.payment_status !== "paid" || session.amount_total === null || !session.currency) {
        return { kind: "ignore" };
      }
      return {
        kind: "record",
        sessionId: session.id,
        paymentIntent: paymentIntentId(session),
        amountCents: session.amount_total,
        currency: session.currency,
      };
    }
    case "checkout.session.async_payment_failed":
    case "checkout.session.expired":
      return { kind: "fail", sessionId: event.data.object.id };
    default:
      return { kind: "ignore" };
  }
}

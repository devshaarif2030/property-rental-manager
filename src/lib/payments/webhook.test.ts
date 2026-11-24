import Stripe from "stripe";
import { describe, expect, it } from "vitest";

import { paymentActionFor } from "./webhook";

const stripe = new Stripe("sk_test_unit");
const SECRET = "whsec_unit_test_secret";

function checkoutEvent(type: string, session: Record<string, unknown>) {
  return {
    id: "evt_test",
    object: "event",
    type,
    data: {
      object: {
        id: "cs_test_1",
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 120000,
        currency: "usd",
        payment_intent: "pi_test_1",
        ...session,
      },
    },
  };
}

async function verified(event: unknown) {
  const payload = JSON.stringify(event);
  const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: SECRET });
  return stripe.webhooks.constructEventAsync(payload, header, SECRET);
}

describe("webhook signature", () => {
  it("accepts a correctly signed payload", async () => {
    const event = await verified(checkoutEvent("checkout.session.completed", {}));
    expect(event.id).toBe("evt_test");
  });

  it("rejects a payload signed with another secret", async () => {
    const payload = JSON.stringify(checkoutEvent("checkout.session.completed", {}));
    const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: "whsec_other" });
    await expect(stripe.webhooks.constructEventAsync(payload, header, SECRET)).rejects.toThrow();
  });

  it("rejects a tampered payload", async () => {
    const payload = JSON.stringify(checkoutEvent("checkout.session.completed", {}));
    const header = await stripe.webhooks.generateTestHeaderStringAsync({ payload, secret: SECRET });
    const tampered = payload.replace("120000", "1");
    await expect(stripe.webhooks.constructEventAsync(tampered, header, SECRET)).rejects.toThrow();
  });
});

describe("paymentActionFor", () => {
  it("records a paid Checkout Session", async () => {
    const event = await verified(checkoutEvent("checkout.session.completed", {}));
    expect(paymentActionFor(event)).toEqual({
      kind: "record",
      sessionId: "cs_test_1",
      paymentIntent: "pi_test_1",
      amountCents: 120000,
      currency: "usd",
    });
  });

  it("waits when a delayed payment is not paid yet", async () => {
    const event = await verified(checkoutEvent("checkout.session.completed", { payment_status: "unpaid" }));
    expect(paymentActionFor(event)).toEqual({ kind: "ignore" });
  });

  it("records a delayed payment when it succeeds", async () => {
    const event = await verified(checkoutEvent("checkout.session.async_payment_succeeded", {}));
    expect(paymentActionFor(event).kind).toBe("record");
  });

  it.each(["checkout.session.expired", "checkout.session.async_payment_failed"])("fails the payment on %s", async (type) => {
    const event = await verified(checkoutEvent(type, { payment_status: "unpaid" }));
    expect(paymentActionFor(event)).toEqual({ kind: "fail", sessionId: "cs_test_1" });
  });

  it("ignores other events", async () => {
    const event = await verified({ id: "evt_2", object: "event", type: "customer.created", data: { object: {} } });
    expect(paymentActionFor(event)).toEqual({ kind: "ignore" });
  });
});

import { describe, expect, it } from "vitest";

import { getReceiptBySession, listOpenCharges } from "@/lib/payments/queries";

import { createVacantUnit, leaseFor, SEED_ORG_ID, SEED_TENANT_ID, serviceRoleClient, signedInAs } from "./helpers";

// Runs against the local seeded stack. The service role stands in for the
// nightly charge job and the verified Stripe webhook; no Stripe call is made.

async function chargeWithPendingPayment() {
  const { supabase: manager, unitId } = await createVacantUnit();
  const { data: lease, error } = await manager
    .from("leases")
    .insert(leaseFor(unitId, SEED_TENANT_ID))
    .select("id")
    .single();
  if (error) throw error;

  const service = serviceRoleClient();
  const { data: charge, error: chargeError } = await service
    .from("rent_charges")
    .insert({
      org_id: SEED_ORG_ID,
      lease_id: lease.id,
      period_month: "2026-12-01",
      amount_cents: 110000,
      due_date: "2026-12-01",
    })
    .select("id")
    .single();
  if (chargeError) throw chargeError;

  const sessionId = `cs_test_${crypto.randomUUID().replaceAll("-", "")}`;
  const { error: paymentError } = await service.from("payments").insert({
    org_id: SEED_ORG_ID,
    rent_charge_id: charge.id,
    amount_cents: 110000,
    stripe_session_id: sessionId,
  });
  if (paymentError) throw paymentError;
  return { service, chargeId: charge.id, sessionId };
}

describe("payments", () => {
  it("the webhook records a payment once and the tenant sees the receipt", async () => {
    const { service, chargeId, sessionId } = await chargeWithPendingPayment();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    expect((await listOpenCharges(tenant)).map((charge) => charge.id)).toContain(chargeId);

    const payment = { p_session_id: sessionId, p_payment_intent: "pi_test_1", p_amount_cents: 110000, p_currency: "usd" };
    const first = await service.rpc("record_rent_payment", payment);
    expect(first).toMatchObject({ error: null, data: true });
    const replay = await service.rpc("record_rent_payment", payment);
    expect(replay).toMatchObject({ error: null, data: false });

    expect((await listOpenCharges(tenant)).map((charge) => charge.id)).not.toContain(chargeId);
    const receipt = await getReceiptBySession(tenant, sessionId);
    expect(receipt).toMatchObject({ status: "succeeded", amountCents: 110000, periodMonth: "2026-12-01" });
  });

  it("a tenant cannot record their own payment", async () => {
    const { sessionId } = await chargeWithPendingPayment();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    const { error } = await tenant.rpc("record_rent_payment", {
      p_session_id: sessionId,
      p_payment_intent: "pi_test_2",
      p_amount_cents: 110000,
      p_currency: "usd",
    });
    expect(error).not.toBeNull();
  });

  it("a tenant cannot create payments or mark charges paid", async () => {
    const { chargeId } = await chargeWithPendingPayment();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    const { error: insertError } = await tenant.from("payments").insert({
      org_id: SEED_ORG_ID,
      rent_charge_id: chargeId,
      amount_cents: 1,
      stripe_session_id: "cs_test_forged",
    });
    expect(insertError).not.toBeNull();

    const { error: updateError } = await tenant.from("rent_charges").update({ status: "paid" }).eq("id", chargeId);
    expect(updateError).not.toBeNull();
  });

  it("staff see no charges", async () => {
    await chargeWithPendingPayment();
    const { supabase: staff } = await signedInAs("staff@demo.test");
    expect(await listOpenCharges(staff)).toEqual([]);
  });
});

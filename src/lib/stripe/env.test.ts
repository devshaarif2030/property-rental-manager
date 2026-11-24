import { describe, expect, it } from "vitest";

import { stripeEnvSchema } from "./env";

describe("stripeEnvSchema", () => {
  it("accepts test-mode keys", () => {
    expect(
      stripeEnvSchema.safeParse({ STRIPE_SECRET_KEY: "sk_test_123", STRIPE_WEBHOOK_SECRET: "whsec_123" }).success,
    ).toBe(true);
  });

  it("refuses live keys", () => {
    expect(
      stripeEnvSchema.safeParse({ STRIPE_SECRET_KEY: "sk_live_123", STRIPE_WEBHOOK_SECRET: "whsec_123" }).success,
    ).toBe(false);
  });

  it("refuses a missing webhook secret", () => {
    expect(stripeEnvSchema.safeParse({ STRIPE_SECRET_KEY: "sk_test_123" }).success).toBe(false);
  });
});

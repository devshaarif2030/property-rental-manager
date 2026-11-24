import "server-only";

import Stripe from "stripe";

import { stripeEnvSchema, type StripeEnv } from "./env";

/** Server-only Stripe config, validated on first use so builds need no keys. */
export function getStripeEnv(): StripeEnv {
  return stripeEnvSchema.parse({
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
  });
}

let client: Stripe | undefined;

export function getStripe(): Stripe {
  client ??= new Stripe(getStripeEnv().STRIPE_SECRET_KEY);
  return client;
}

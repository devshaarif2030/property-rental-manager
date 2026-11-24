import { z } from "zod";

/**
 * Stripe keys must be test-mode keys. This is a portfolio build: a live key
 * is refused at startup rather than trusted.
 */
export const stripeEnvSchema = z.object({
  STRIPE_SECRET_KEY: z
    .string()
    .refine((key) => key.startsWith("sk_test_") || key.startsWith("rk_test_"), "Use a Stripe test-mode secret key."),
  STRIPE_WEBHOOK_SECRET: z.string().startsWith("whsec_", "Use the webhook signing secret (whsec_...)."),
});

export type StripeEnv = z.infer<typeof stripeEnvSchema>;

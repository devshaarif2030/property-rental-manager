import "server-only";

import { z } from "zod";

import type { EmailConfig } from "./resend";

/** Resend's shared sender. It only delivers to the Resend account's own address until a domain is verified. */
export const DEFAULT_EMAIL_FROM = "Property Rental Manager <onboarding@resend.dev>";

const emailEnvSchema = z.object({
  RESEND_API_KEY: z.string().trim().min(1).optional(),
  EMAIL_FROM: z.string().trim().min(3).default(DEFAULT_EMAIL_FROM),
  SITE_URL: z.url().optional(),
});

/** Email settings, or null when no key is set: the app then keeps notifications in-app only. */
export function getEmailConfig(): EmailConfig | null {
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const env = emailEnvSchema.parse({
    RESEND_API_KEY: process.env.RESEND_API_KEY || undefined,
    EMAIL_FROM: process.env.EMAIL_FROM || undefined,
    SITE_URL: process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : undefined),
  });
  if (!env.RESEND_API_KEY) return null;
  return { apiKey: env.RESEND_API_KEY, from: env.EMAIL_FROM, siteUrl: env.SITE_URL ?? "http://localhost:3000" };
}

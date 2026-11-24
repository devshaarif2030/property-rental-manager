import "server-only";

import { z } from "zod";

const serverEnvSchema = z.object({
  SUPABASE_SECRET_KEY: z.string().min(1),
});

/** Server-only secrets. Never import this from a client component. */
export function getServerEnv() {
  return serverEnvSchema.parse({ SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY });
}

import "server-only";

import { createClient } from "@supabase/supabase-js";

import { getPublicEnv } from "@/lib/env";
import { getServerEnv } from "@/lib/env.server";

import type { Database } from "./database.types";

/**
 * Service-role client. Bypasses RLS, so use it only for steps no user can do
 * for themselves (reading an invite before sign up, creating the auth user),
 * and only after validating input on the server.
 */
export function createAdminClient() {
  return createClient<Database>(getPublicEnv().NEXT_PUBLIC_SUPABASE_URL, getServerEnv().SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

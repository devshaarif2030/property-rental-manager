import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Shared helpers for integration tests that run against the local seeded stack.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
export const SEED_ORG_ID = "10000000-0000-0000-0000-000000000001";
export const SEED_TENANT_ID = "10000000-0000-0000-0000-0000000000a3";
export const SEED_STAFF_ID = "10000000-0000-0000-0000-0000000000a4";

export async function signedInAs(email: string) {
  const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "demo-password" });
  if (error) throw error;
  return { supabase, userId: data.user.id };
}

export async function createVacantUnit() {
  const { supabase, userId } = await signedInAs("manager@demo.test");
  const { data: property } = await supabase
    .from("properties")
    .insert({
      org_id: SEED_ORG_ID,
      name: `Lease House ${Date.now()}`,
      address_line: "9 Lease Lane",
      city: "York",
      postcode: "YO1 1AA",
      country: "GB",
      manager_id: userId,
    })
    .select("id")
    .single();
  const { data: unit } = await supabase
    .from("units")
    .insert({ org_id: SEED_ORG_ID, property_id: property!.id, label: "Flat 1", rent_amount_cents: 110000 })
    .select("id")
    .single();
  return { supabase, unitId: unit!.id };
}

export function leaseFor(unitId: string, tenantId: string) {
  return {
    org_id: SEED_ORG_ID,
    unit_id: unitId,
    tenant_id: tenantId,
    start_date: "2026-12-01",
    rent_amount_cents: 110000,
    deposit_amount_cents: 110000,
    due_day: 1,
  };
}

/** Service-role client, standing in for the Stripe webhook and pg_cron jobs. */
export function serviceRoleClient() {
  return createClient<Database>(SUPABASE_URL, SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

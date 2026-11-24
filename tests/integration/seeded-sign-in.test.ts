import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

// Runs against a local Supabase stack started with `pnpm db:start`.
// Signs in as each seeded demo account through the real Auth API.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const DEMO_PASSWORD = "demo-password";

const DEMO_ACCOUNTS = [
  { email: "admin@demo.test", role: "admin" },
  { email: "manager@demo.test", role: "manager" },
  { email: "tenant@demo.test", role: "tenant" },
  { email: "staff@demo.test", role: "staff" },
] as const;

function newClient() {
  return createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

describe("seeded demo accounts", () => {
  it.each(DEMO_ACCOUNTS)("$role can sign in and reads their own role", async ({ email, role }) => {
    const supabase = newClient();
    const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: DEMO_PASSWORD,
    });
    expect(signInError).toBeNull();

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", auth.user!.id)
      .single();
    expect(error).toBeNull();
    expect(profile?.role).toBe(role);
  });

  it("rejects a wrong password", async () => {
    const { error } = await newClient().auth.signInWithPassword({
      email: "tenant@demo.test",
      password: "wrong-password",
    });
    expect(error).not.toBeNull();
  });

  it("does not allow public sign up", async () => {
    const { error } = await newClient().auth.signUp({
      email: "stranger@demo.test",
      password: "a-long-password",
    });
    expect(error).not.toBeNull();
  });

  it("gives a signed-out visitor no rows", async () => {
    const { data, error } = await newClient().from("profiles").select("id");
    expect(data ?? []).toHaveLength(0);
    expect(error).not.toBeNull();
  });
});

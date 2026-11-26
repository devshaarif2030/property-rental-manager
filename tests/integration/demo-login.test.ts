import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import type { Database } from "@/lib/supabase/database.types";

// The one-click demo login, done the way signInAsDemo does it: look up the
// demo email with the service role, create a one-time token, exchange it.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

const admin = createClient<Database>(SUPABASE_URL, SECRET_KEY, clientOptions);

describe("demo login", () => {
  it.each(["manager", "tenant", "staff"] as const)("signs in as the demo %s without a password", async (role) => {
    const { data: email, error: lookupError } = await admin.rpc("demo_account_email", { p_role: role });
    expect(lookupError).toBeNull();
    expect(email).toBeTruthy();

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email: email! });
    expect(linkError).toBeNull();

    const visitor = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
    const { data: session, error: verifyError } = await visitor.auth.verifyOtp({
      type: "magiclink",
      token_hash: link.properties!.hashed_token,
    });
    expect(verifyError).toBeNull();

    const { data: profile } = await visitor.from("profiles").select("role").eq("id", session.user!.id).single();
    expect(profile?.role).toBe(role);
  });

  it("does not let a signed-out visitor look up demo emails", async () => {
    const visitor = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
    const { error } = await visitor.rpc("demo_account_email", { p_role: "manager" });
    expect(error).not.toBeNull();
  });

  it("does not offer the admin account", async () => {
    const { data } = await admin.rpc("demo_account_email", { p_role: "admin" });
    expect(data).toBeNull();
  });
});

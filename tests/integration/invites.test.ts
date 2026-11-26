import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { generateInviteToken } from "@/lib/invites/tokens";
import type { Database } from "@/lib/supabase/database.types";

// Runs against a local Supabase stack started with `pnpm db:start`.
// Walks the invite flow the way the app does: an admin creates the invite
// under RLS, then the server accepts it with the service role. The seeded
// manager is a shared demo account, and demo accounts cannot invite.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SECRET_KEY = process.env.SUPABASE_SECRET_KEY ?? "";
const DEMO_PASSWORD = "demo-password";
const SEED_ORG_ID = "10000000-0000-0000-0000-000000000001";

const clientOptions = { auth: { persistSession: false, autoRefreshToken: false } };

async function signedInAs(email: string) {
  const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: DEMO_PASSWORD });
  if (error) throw error;
  return { supabase, userId: data.user.id };
}

function inviteRow(invitedBy: string, email: string, role: Database["public"]["Enums"]["user_role"]) {
  const { token, tokenHash } = generateInviteToken();
  return {
    token,
    tokenHash,
    row: {
      org_id: SEED_ORG_ID,
      email,
      role,
      token_hash: tokenHash,
      invited_by: invitedBy,
      expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    },
  };
}

describe("invites", () => {
  it("an admin invites a tenant who accepts and signs in", async () => {
    const email = `invited.${Date.now()}@demo.test`;
    const inviter = await signedInAs("admin@demo.test");
    const invite = inviteRow(inviter.userId, email, "tenant");

    const { error: insertError } = await inviter.supabase.from("invites").insert(invite.row);
    expect(insertError).toBeNull();

    const admin = createClient<Database>(SUPABASE_URL, SECRET_KEY, clientOptions);
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: "new-tenant-password",
      email_confirm: true,
    });
    expect(createError).toBeNull();

    const { data: profile, error: acceptError } = await admin.rpc("accept_invite", {
      p_token_hash: invite.tokenHash,
      p_user_id: created.user!.id,
      p_full_name: "Invited Tenant",
    });
    expect(acceptError).toBeNull();
    expect(profile?.role).toBe("tenant");
    expect(profile?.org_id).toBe(SEED_ORG_ID);

    const tenant = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, clientOptions);
    const { error: signInError } = await tenant.auth.signInWithPassword({
      email,
      password: "new-tenant-password",
    });
    expect(signInError).toBeNull();
  });

  it("a manager cannot invite an admin", async () => {
    const manager = await signedInAs("manager@demo.test");
    const invite = inviteRow(manager.userId, `would-be-admin.${Date.now()}@demo.test`, "admin");
    const { error } = await manager.supabase.from("invites").insert(invite.row);
    expect(error).not.toBeNull();
  });

  it("the shared demo manager cannot invite anyone", async () => {
    const manager = await signedInAs("manager@demo.test");
    const invite = inviteRow(manager.userId, `visitor.${Date.now()}@demo.test`, "tenant");
    const { error } = await manager.supabase.from("invites").insert(invite.row);
    expect(error).not.toBeNull();
  });

  it("a tenant cannot invite anyone", async () => {
    const tenant = await signedInAs("tenant@demo.test");
    const invite = inviteRow(tenant.userId, `friend.${Date.now()}@demo.test`, "tenant");
    const { error } = await tenant.supabase.from("invites").insert(invite.row);
    expect(error).not.toBeNull();
  });

  it("a signed-in user cannot call accept_invite directly", async () => {
    const tenant = await signedInAs("tenant@demo.test");
    const { error } = await tenant.supabase.rpc("accept_invite", {
      p_token_hash: "anything",
      p_user_id: tenant.userId,
      p_full_name: "Me",
    });
    expect(error).not.toBeNull();
  });
});

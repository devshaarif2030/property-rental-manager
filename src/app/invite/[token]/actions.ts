"use server";

import { redirect } from "next/navigation";

import { DASHBOARD_PATH } from "@/lib/auth/paths";
import { acceptInviteSchema, type AcceptInviteInput } from "@/lib/invites/schemas";
import { hashInviteToken } from "@/lib/invites/tokens";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { findOpenInvite } from "./invite";

export type AcceptInviteResult = { ok: false; error: string };

export async function acceptInvite(input: AcceptInviteInput): Promise<AcceptInviteResult> {
  const parsed = acceptInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check your name and password." };

  const tokenHash = hashInviteToken(parsed.data.token);
  const invite = await findOpenInvite(tokenHash);
  if (!invite) return { ok: false, error: "This invite is no longer valid. Ask for a new one." };

  const admin = createAdminClient();
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: invite.email,
    password: parsed.data.password,
    email_confirm: true,
    user_metadata: { full_name: parsed.data.fullName },
  });
  if (createError || !created.user) {
    return { ok: false, error: "An account with this email already exists. Sign in instead." };
  }

  const { error: acceptError } = await admin.rpc("accept_invite", {
    p_token_hash: tokenHash,
    p_user_id: created.user.id,
    p_full_name: parsed.data.fullName,
  });
  if (acceptError) {
    // Do not leave an auth user without a profile behind.
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, error: "This invite is no longer valid. Ask for a new one." };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: parsed.data.password,
  });
  if (signInError) redirect("/sign-in");

  redirect(DASHBOARD_PATH);
}

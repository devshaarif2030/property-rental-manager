"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";

import { requireRole } from "@/lib/auth/session";
import {
  createInviteSchema,
  INVITE_TTL_DAYS,
  revokeInviteSchema,
  rolesInvitableBy,
  type CreateInviteInput,
  type CreateInviteResult,
} from "@/lib/invites/schemas";
import { generateInviteToken, invitePath } from "@/lib/invites/tokens";
import { createClient } from "@/lib/supabase/server";

const PEOPLE_PATH = "/manager/people";
const UNIQUE_VIOLATION = "23505";
const RLS_VIOLATION = "42501";

export async function createInvite(input: CreateInviteInput): Promise<CreateInviteResult> {
  const user = await requireRole(["admin", "manager"], PEOPLE_PATH);

  const parsed = createInviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the email and role." };
  if (!rolesInvitableBy(user.role).includes(parsed.data.role)) {
    return { ok: false, error: "You cannot invite that role." };
  }

  const origin = (await headers()).get("origin");
  if (!origin) return { ok: false, error: "Could not create the invite. Try again." };

  const { token, tokenHash } = generateInviteToken();
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);

  // Runs as the signed-in user, so the invites RLS policy re-checks org and role.
  const supabase = await createClient();
  const { error } = await supabase.from("invites").insert({
    org_id: user.orgId,
    email: parsed.data.email,
    role: parsed.data.role,
    token_hash: tokenHash,
    invited_by: user.id,
    expires_at: expiresAt.toISOString(),
  });

  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, error: "That email already has a pending invite. Revoke it first." };
  }
  // Role and org are checked above, so RLS only refuses the shared demo accounts.
  if (error?.code === RLS_VIOLATION) {
    return { ok: false, error: "Invites are turned off for demo accounts." };
  }
  if (error) return { ok: false, error: "Could not create the invite. Try again." };

  revalidatePath(PEOPLE_PATH);
  return {
    ok: true,
    email: parsed.data.email,
    inviteUrl: new URL(invitePath(token), origin).toString(),
  };
}

export async function revokeInvite(formData: FormData): Promise<void> {
  await requireRole(["admin", "manager"], PEOPLE_PATH);

  const parsed = revokeInviteSchema.safeParse({ inviteId: formData.get("inviteId") });
  if (!parsed.success) return;

  const supabase = await createClient();
  await supabase.from("invites").delete().eq("id", parsed.data.inviteId).is("accepted_at", null);
  revalidatePath(PEOPLE_PATH);
}

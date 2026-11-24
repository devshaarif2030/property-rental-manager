import "server-only";

import type { UserRole } from "@/lib/auth/roles";
import { createAdminClient } from "@/lib/supabase/admin";

export type OpenInvite = {
  email: string;
  role: UserRole;
  organizationName: string;
};

/**
 * Looks up an unused, unexpired invite by token hash. Uses the service role
 * because the invitee has no account yet. Returns only what the accept page
 * needs to show.
 */
export async function findOpenInvite(tokenHash: string): Promise<OpenInvite | null> {
  const { data, error } = await createAdminClient()
    .from("invites")
    .select("email, role, expires_at, accepted_at, organizations(name)")
    .eq("token_hash", tokenHash)
    .maybeSingle();
  if (error) throw error;
  if (!data || data.accepted_at || new Date(data.expires_at) <= new Date()) return null;

  return { email: data.email, role: data.role, organizationName: data.organizations.name };
}

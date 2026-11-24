import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { homePathForRole, signInPathFor } from "./paths";
import type { UserRole } from "./roles";

export type CurrentUser = {
  id: string;
  email: string;
  orgId: string;
  role: UserRole;
  fullName: string;
};

/**
 * The signed-in user with their profile, or null. The JWT is verified by
 * getClaims; the role comes from the profiles table, never from the token.
 * Cached per request.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data: claimsData } = await supabase.auth.getClaims();
  const claims = claimsData?.claims;
  if (!claims?.sub) return null;

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("org_id, role, full_name")
    .eq("id", claims.sub)
    .maybeSingle();
  if (error) throw error;
  if (!profile) return null;

  return {
    id: claims.sub,
    email: claims.email ?? "",
    orgId: profile.org_id,
    role: profile.role,
    fullName: profile.full_name,
  };
});

/** Use at the top of every protected page and server action. */
export async function requireUser(currentPath: string): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect(signInPathFor(currentPath));
  return user;
}

/** Redirects users with any other role to their own home. */
export async function requireRole(
  allowed: readonly UserRole[],
  currentPath: string,
): Promise<CurrentUser> {
  const user = await requireUser(currentPath);
  if (!allowed.includes(user.role)) redirect(homePathForRole(user.role));
  return user;
}

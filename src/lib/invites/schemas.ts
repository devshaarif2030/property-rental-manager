import { z } from "zod";

import type { UserRole } from "@/lib/auth/roles";

export const INVITE_TTL_DAYS = 7;

const INVITABLE_ROLES: Record<UserRole, readonly UserRole[]> = {
  admin: ["admin", "manager", "tenant", "staff"],
  manager: ["tenant", "staff"],
  tenant: [],
  staff: [],
};

/** Mirrors the invites insert policy, so the form only offers what RLS allows. */
export function rolesInvitableBy(role: UserRole): readonly UserRole[] {
  return INVITABLE_ROLES[role];
}

export const createInviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email({ error: "Enter a valid email address." })),
  role: z.enum(["admin", "manager", "tenant", "staff"]),
});

export const revokeInviteSchema = z.object({
  inviteId: z.guid(),
});

export const acceptInviteSchema = z.object({
  token: z.string().regex(/^[A-Za-z0-9_-]{43}$/, { error: "This invite link is not valid." }),
  fullName: z.string().trim().min(1, { error: "Enter your name." }).max(200),
  password: z.string().min(8, { error: "Use at least 8 characters." }).max(72),
});

export type CreateInviteInput = z.input<typeof createInviteSchema>;
export type AcceptInviteInput = z.input<typeof acceptInviteSchema>;

export type CreateInviteResult =
  | { ok: true; inviteUrl: string; email: string }
  | { ok: false; error: string };

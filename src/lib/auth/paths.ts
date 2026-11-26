import type { UserRole } from "./roles";

export const SIGN_IN_PATH = "/sign-in";
export const DASHBOARD_PATH = "/dashboard";
/** Where a signed-in user without a profile row is sent. */
export const NO_PROFILE_SIGN_IN_PATH = `${SIGN_IN_PATH}?error=no_profile`;

const HOME_PATH_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  tenant: "/tenant",
  staff: "/staff",
};

/** Lease documents are served to managers and tenants alike, so they sit outside any role home. */
export const LEASES_PATH = "/leases";

/** Every role has a notifications list. */
export const NOTIFICATIONS_PATH = "/notifications";

const PROTECTED_PREFIXES = [
  DASHBOARD_PATH,
  LEASES_PATH,
  NOTIFICATIONS_PATH,
  ...Object.values(HOME_PATH_BY_ROLE),
];

export function homePathForRole(role: UserRole): string {
  return HOME_PATH_BY_ROLE[role];
}

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Returns `next` only if it is a same-origin path, so a crafted
 * `?next=https://evil.example` link cannot redirect off-site after sign in.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return DASHBOARD_PATH;
  }
  return next;
}

export function signInPathFor(next: string): string {
  return `${SIGN_IN_PATH}?${new URLSearchParams({ next }).toString()}`;
}

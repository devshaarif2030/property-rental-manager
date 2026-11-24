import type { UserRole } from "./roles";

export const SIGN_IN_PATH = "/sign-in";
export const DASHBOARD_PATH = "/dashboard";

const HOME_PATH_BY_ROLE: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  tenant: "/tenant",
  staff: "/staff",
};

const PROTECTED_PREFIXES = [DASHBOARD_PATH, ...Object.values(HOME_PATH_BY_ROLE)];

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

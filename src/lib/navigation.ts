import type { UserRole } from "@/lib/auth/roles";

export type NavIcon = "dashboard" | "properties" | "maintenance" | "people" | "notifications" | "report" | "jobs";

/** `shortLabel` is used in the phone tab bar, where space is tight. */
export type NavItem = { label: string; shortLabel?: string; href: string; icon: NavIcon };

const MANAGER_ITEMS: NavItem[] = [
  { label: "Properties", href: "/manager/properties", icon: "properties" },
  { label: "Maintenance", shortLabel: "Repairs", href: "/manager/maintenance", icon: "maintenance" },
  { label: "People", href: "/manager/people", icon: "people" },
];

const NOTIFICATIONS: NavItem = {
  label: "Notifications",
  shortLabel: "Alerts",
  href: "/notifications",
  icon: "notifications",
};

const NAV_BY_ROLE: Record<UserRole, NavItem[]> = {
  admin: [{ label: "Overview", href: "/admin", icon: "dashboard" }, ...MANAGER_ITEMS, NOTIFICATIONS],
  manager: [{ label: "Dashboard", href: "/manager", icon: "dashboard" }, ...MANAGER_ITEMS, NOTIFICATIONS],
  tenant: [
    { label: "Home", href: "/tenant", icon: "dashboard" },
    { label: "Report a problem", shortLabel: "Report", href: "/tenant/requests/new", icon: "report" },
    NOTIFICATIONS,
  ],
  staff: [{ label: "My jobs", href: "/staff", icon: "jobs" }, NOTIFICATIONS],
};

/** Navigation links for a role. Display only: every page checks access itself. */
export function navItemsForRole(role: UserRole): NavItem[] {
  return NAV_BY_ROLE[role];
}

/**
 * The item a path belongs to: the longest href that is the path or a parent
 * of it, so "/manager/properties/1" marks Properties, not Dashboard.
 */
export function activeNavHref(items: NavItem[], pathname: string): string | null {
  const matches = items.filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
  return matches.reduce<string | null>(
    (best, item) => (best === null || item.href.length > best.length ? item.href : best),
    null,
  );
}

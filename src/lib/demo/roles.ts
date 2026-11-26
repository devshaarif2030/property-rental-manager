import { z } from "zod";

/**
 * Roles with a one-click demo login on the live site, in button order.
 * Admin is never offered: the owner's real admin account lives in the demo org.
 */
export const DEMO_LOGIN_ROLES = ["manager", "tenant"] as const;

export const demoRoleSchema = z.enum(DEMO_LOGIN_ROLES);

export type DemoRole = z.infer<typeof demoRoleSchema>;

import type { Database } from "@/lib/supabase/database.types";

export type UserRole = Database["public"]["Enums"]["user_role"];

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  manager: "Property manager",
  tenant: "Tenant",
  staff: "Maintenance staff",
};

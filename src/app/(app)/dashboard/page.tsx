import { redirect } from "next/navigation";

import { DASHBOARD_PATH, homePathForRole } from "@/lib/auth/paths";
import { requireUser } from "@/lib/auth/session";

/** Sends each user to their role's home. */
export default async function DashboardPage() {
  const user = await requireUser(DASHBOARD_PATH);
  redirect(homePathForRole(user.role));
}

import { requireRole } from "@/lib/auth/session";

import { RoleHome } from "../role-home";

export default async function StaffHomePage() {
  const user = await requireRole(["staff"], "/staff");
  return <RoleHome user={user} title="My jobs" comingNext="Assigned jobs arrive in week 3." />;
}

import { requireRole } from "@/lib/auth/session";

import { RoleHome } from "../role-home";

export default async function ManagerHomePage() {
  const user = await requireRole(["admin", "manager"], "/manager");
  return <RoleHome user={user} title="Dashboard" comingNext="Properties and units arrive next." />;
}

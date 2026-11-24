import { requireRole } from "@/lib/auth/session";

import { RoleHome } from "../role-home";

export default async function ManagerHomePage() {
  const user = await requireRole(["admin", "manager"], "/manager");
  return <RoleHome user={user} title="Dashboard" comingNext="Occupancy and rent charts arrive in week 3. Start with Properties in the header." />;
}

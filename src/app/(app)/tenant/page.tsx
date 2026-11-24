import { requireRole } from "@/lib/auth/session";

import { RoleHome } from "../role-home";

export default async function TenantHomePage() {
  const user = await requireRole(["tenant"], "/tenant");
  return <RoleHome user={user} title="Home" comingNext="Your lease and rent arrive in week 2." />;
}

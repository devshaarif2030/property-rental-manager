import { requireRole } from "@/lib/auth/session";

import { RoleHome } from "../role-home";

export default async function AdminHomePage() {
  const user = await requireRole(["admin"], "/admin");
  return <RoleHome user={user} title="Organization" comingNext="Users and the audit log arrive later in the build." />;
}

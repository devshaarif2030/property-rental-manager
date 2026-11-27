import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function AdminHomePage() {
  const user = await requireRole(["admin"], "/admin");
  return <ManagerDashboard user={user} />;
}

import { ManagerDashboard } from "@/components/dashboard/manager-dashboard";
import { requireRole } from "@/lib/auth/session";

export default async function ManagerHomePage() {
  const user = await requireRole(["admin", "manager"], "/manager");
  return <ManagerDashboard user={user} />;
}

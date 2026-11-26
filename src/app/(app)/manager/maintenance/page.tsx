import { CircleCheck, Hammer, Inbox } from "lucide-react";
import type { Metadata } from "next";

import { RequestList } from "@/components/maintenance/request-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireRole } from "@/lib/auth/session";
import { listRequests } from "@/lib/maintenance/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Maintenance · Property Rental Manager" };

const hrefFor = (requestId: string) => `/manager/maintenance/${requestId}`;

export default async function ManagerMaintenancePage() {
  await requireRole(["admin", "manager"], "/manager/maintenance");
  const supabase = await createClient();
  const requests = await listRequests(supabase);

  const toTriage = requests.filter((request) => request.status === "open");
  const active = requests.filter((request) => request.status === "assigned" || request.status === "in_progress");
  const closed = requests.filter((request) => request.status === "done" || request.status === "cancelled");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Property manager"
        title="Maintenance"
        description="Confirm the suggested category and priority, then assign a technician."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" icon={Inbox} label="Needs triage" value={toTriage.length} hint="Waiting for you." />
        <StatCard icon={Hammer} label="With staff" value={active.length} hint="Assigned or in progress." />
        <StatCard icon={CircleCheck} label="Closed" value={closed.length} hint="Done or cancelled." />
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Needs triage</h2>
        <RequestList requests={toTriage} hrefFor={hrefFor} empty="Nothing waiting. New requests land here." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">With staff</h2>
        <RequestList requests={active} hrefFor={hrefFor} empty="No jobs in progress." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Closed</h2>
        <RequestList requests={closed} hrefFor={hrefFor} empty="No closed requests yet." />
      </section>
    </div>
  );
}

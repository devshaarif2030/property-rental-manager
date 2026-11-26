import { CircleCheck, ClipboardList, Hammer } from "lucide-react";

import { RequestList } from "@/components/maintenance/request-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { requireRole } from "@/lib/auth/session";
import { firstName } from "@/lib/names";
import { listRequests } from "@/lib/maintenance/queries";
import { createClient } from "@/lib/supabase/server";

const hrefFor = (requestId: string) => `/staff/jobs/${requestId}`;

export default async function StaffHomePage() {
  const user = await requireRole(["staff"], "/staff");
  const supabase = await createClient();
  // RLS returns only the jobs assigned to this staff member.
  const jobs = await listRequests(supabase);
  const open = jobs.filter((job) => job.status === "assigned" || job.status === "in_progress");
  const finished = jobs.filter((job) => job.status === "done" || job.status === "cancelled");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Maintenance staff"
        title="My jobs"
        description={`Jobs assigned to you, ${firstName(user.fullName)}. Open one to update its status.`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard tone="brand" icon={ClipboardList} label="To do" value={open.length} hint="Assigned or in progress." />
        <StatCard
          icon={Hammer}
          label="In progress"
          value={open.filter((job) => job.status === "in_progress").length}
          hint="Started and not finished."
        />
        <StatCard icon={CircleCheck} label="Finished" value={finished.length} hint="Done or cancelled." />
      </div>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">To do</h2>
        <RequestList requests={open} hrefFor={hrefFor} empty="No jobs assigned to you right now." />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Finished</h2>
        <RequestList requests={finished} hrefFor={hrefFor} empty="Nothing finished yet." />
      </section>
    </div>
  );
}

import { RequestList } from "@/components/maintenance/request-list";
import { requireRole } from "@/lib/auth/session";
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
      <div>
        <p className="text-sm text-muted-foreground">Maintenance staff</p>
        <h1 className="text-2xl font-semibold tracking-tight">My jobs</h1>
        <p className="text-muted-foreground">Signed in as {user.fullName}.</p>
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

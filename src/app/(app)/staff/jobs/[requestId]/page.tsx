import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestDetailView } from "@/components/maintenance/request-detail-view";
import { requireRole } from "@/lib/auth/session";
import { getRequestDetail } from "@/lib/maintenance/queries";
import type { RequestStatus } from "@/lib/maintenance/requests";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { JobStatusForm } from "./job-status-form";

export const metadata: Metadata = { title: "Job · Property Rental Manager" };

const NEXT_STATUS: Partial<Record<RequestStatus, "in_progress" | "done">> = {
  assigned: "in_progress",
  in_progress: "done",
};

export default async function StaffJobPage({ params }: PageProps<"/staff/jobs/[requestId]">) {
  const { requestId } = await params;
  await requireRole(["staff"], `/staff/jobs/${requestId}`);
  const id = idSchema.safeParse(requestId);
  if (!id.success) notFound();

  const supabase = await createClient();
  const request = await getRequestDetail(supabase, id.data);
  if (!request) notFound();
  const nextStatus = NEXT_STATUS[request.status];

  return (
    <div className="flex flex-col gap-6">
      <Link href="/staff" className="text-sm underline underline-offset-4">
        Back to my jobs
      </Link>
      <RequestDetailView request={request} unknownAuthor="Tenant" />
      {nextStatus && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Update the job</h2>
          <JobStatusForm requestId={request.id} nextStatus={nextStatus} />
        </section>
      )}
    </div>
  );
}

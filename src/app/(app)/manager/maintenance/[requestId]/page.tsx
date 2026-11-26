import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestDetailView } from "@/components/maintenance/request-detail-view";
import { TriageSuggestion } from "@/components/maintenance/triage-suggestion";
import { requireRole } from "@/lib/auth/session";
import { getRequestDetail, listStaff } from "@/lib/maintenance/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { TriageForm } from "./triage-form";

export const metadata: Metadata = { title: "Maintenance request · Property Rental Manager" };

export default async function ManagerRequestPage({ params }: PageProps<"/manager/maintenance/[requestId]">) {
  const { requestId } = await params;
  const user = await requireRole(["admin", "manager"], `/manager/maintenance/${requestId}`);
  const id = idSchema.safeParse(requestId);
  if (!id.success) notFound();

  const supabase = await createClient();
  const [request, staff] = await Promise.all([getRequestDetail(supabase, id.data), listStaff(supabase, user.orgId)]);
  if (!request) notFound();
  const isClosed = request.status === "done" || request.status === "cancelled";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/manager/maintenance" className="text-sm underline underline-offset-4">
        Back to maintenance
      </Link>
      <RequestDetailView request={request} unknownAuthor="Someone in your org" />
      {!isClosed && (
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold">Triage</h2>
          <TriageSuggestion request={request} />
          <TriageForm
            requestId={request.id}
            staff={staff}
            // Until the manager confirms, start from the suggestion.
            defaults={{
              category: request.category ?? request.aiCategory,
              priority: request.priority ?? request.aiPriority,
              assignedTo: request.assignedTo,
            }}
          />
        </section>
      )}
    </div>
  );
}

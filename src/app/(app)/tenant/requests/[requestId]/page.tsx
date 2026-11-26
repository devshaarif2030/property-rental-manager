import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { RequestDetailView } from "@/components/maintenance/request-detail-view";
import { requireRole } from "@/lib/auth/session";
import { getRequestDetail } from "@/lib/maintenance/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Maintenance request · Property Rental Manager" };

export default async function TenantRequestPage({
  params,
  searchParams,
}: PageProps<"/tenant/requests/[requestId]">) {
  const { requestId } = await params;
  await requireRole(["tenant"], `/tenant/requests/${requestId}`);
  const id = idSchema.safeParse(requestId);
  if (!id.success) notFound();

  const supabase = await createClient();
  const request = await getRequestDetail(supabase, id.data);
  if (!request) notFound();
  const photosFailed = (await searchParams).photos === "failed";

  return (
    <div className="flex flex-col gap-6">
      <Link href="/tenant" className="text-sm underline underline-offset-4">
        Back to home
      </Link>
      {photosFailed && (
        <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">
          Your request was sent, but a photo could not be uploaded.
        </p>
      )}
      <RequestDetailView request={request} unknownAuthor="Maintenance team" />
    </div>
  );
}

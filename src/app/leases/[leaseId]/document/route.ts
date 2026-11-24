import { NextResponse, type NextRequest } from "next/server";

import { signInPathFor } from "@/lib/auth/paths";
import { getCurrentUser } from "@/lib/auth/session";
import { LEASE_DOCUMENTS_BUCKET, SIGNED_URL_SECONDS } from "@/lib/leases/documents";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

/**
 * Opens a lease PDF through a short-lived signed URL. The lease lookup and the
 * signing both run as the signed-in user, so RLS and the storage policies
 * decide who gets a link: the org's admins and managers, and the lease's tenant.
 */
export async function GET(request: NextRequest, { params }: RouteContext<"/leases/[leaseId]/document">) {
  const { leaseId } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.redirect(new URL(signInPathFor(request.nextUrl.pathname), request.nextUrl.origin));
  }
  if (!idSchema.safeParse(leaseId).success) return notFound();

  const supabase = await createClient();
  const { data: lease, error } = await supabase
    .from("leases")
    .select("document_path")
    .eq("id", leaseId)
    .maybeSingle();
  if (error) throw error;
  if (!lease?.document_path) return notFound();

  const { data: signed, error: signError } = await supabase.storage
    .from(LEASE_DOCUMENTS_BUCKET)
    .createSignedUrl(lease.document_path, SIGNED_URL_SECONDS);
  if (signError) return notFound();

  const response = NextResponse.redirect(signed.signedUrl, 303);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

function notFound() {
  return new NextResponse("Not found", { status: 404, headers: { "Cache-Control": "private, no-store" } });
}

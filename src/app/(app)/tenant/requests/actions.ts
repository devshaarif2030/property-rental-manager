"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";

import { requireRole } from "@/lib/auth/session";
import { REQUEST_PHOTOS_BUCKET, requestPhotoPath, validatePhotos } from "@/lib/maintenance/photos";
import { newRequestSchema } from "@/lib/maintenance/requests";
import type { FormActionResult } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";
import { runTriage } from "@/lib/triage/run";

const NEW_REQUEST_PATH = "/tenant/requests/new";
const FAILED: FormActionResult = { ok: false, error: "Could not send the request. Try again." };

/**
 * A tenant reports a problem in the unit they lease, with up to three photos.
 * Everything runs as the tenant, so RLS and the storage policies check the
 * unit, the org and the photo folder.
 */
export async function createMaintenanceRequest(formData: FormData): Promise<FormActionResult> {
  const user = await requireRole(["tenant"], NEW_REQUEST_PATH);

  const parsed = newRequestSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };
  const photos = await validatePhotos(formData.getAll("photos"));
  if (!photos.ok) return photos;

  const supabase = await createClient();
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("unit_id")
    .eq("tenant_id", user.id)
    .eq("status", "active")
    .order("start_date", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (leaseError) return FAILED;
  if (!lease) return { ok: false, error: "You need an active lease to report a problem." };

  const { data: request, error: insertError } = await supabase
    .from("maintenance_requests")
    .insert({
      org_id: user.orgId,
      unit_id: lease.unit_id,
      tenant_id: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
    })
    .select("id")
    .single();
  if (insertError) return FAILED;

  // A trigger writes the "Open" timeline entry.

  const storage = supabase.storage.from(REQUEST_PHOTOS_BUCKET);
  let photosSaved = true;
  for (const photo of photos.photos) {
    const path = requestPhotoPath(user.orgId, request.id, crypto.randomUUID(), photo.extension);
    const { error: uploadError } = await storage.upload(path, photo.file, {
      contentType: photo.contentType,
      upsert: false,
    });
    if (uploadError) {
      photosSaved = false;
      continue;
    }
    const { error: photoError } = await supabase
      .from("request_photos")
      .insert({ org_id: user.orgId, request_id: request.id, storage_path: path, uploaded_by: user.id });
    if (photoError) {
      photosSaved = false;
      await storage.remove([path]);
    }
  }

  // AI triage (or the keyword fallback) runs after the response, so the
  // tenant never waits on Gemini and a Gemini outage cannot block a report.
  after(() => runTriage(request.id));

  revalidatePath("/tenant");
  // The request is saved either way; say so if a photo did not make it.
  redirect(`/tenant/requests/${request.id}${photosSaved ? "" : "?photos=failed"}`);
}

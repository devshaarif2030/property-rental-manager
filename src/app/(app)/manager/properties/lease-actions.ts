"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { LEASE_DOCUMENTS_BUCKET, leaseDocumentPath, validateLeaseDocument } from "@/lib/leases/documents";
import {
  createLeaseSchema,
  endLeaseSchema,
  updateLeaseSchema,
  type CreateLeaseInput,
  type UpdateLeaseInput,
} from "@/lib/leases/schemas";
import { idSchema, type FormActionResult } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

const PROPERTIES_PATH = "/manager/properties";
const MANAGER_ROLES = ["admin", "manager"] as const;

const UNIQUE_VIOLATION = "23505";
const CHECK_VIOLATION = "23514";

const INVALID_INPUT: FormActionResult = { ok: false, error: "Check the highlighted fields and try again." };
const NOT_FOUND: FormActionResult = { ok: false, error: "That record no longer exists." };
const FAILED: FormActionResult = { ok: false, error: "Something went wrong. Try again." };

function unitPath(propertyId: string, unitId: string): string {
  return `${PROPERTIES_PATH}/${propertyId}/units/${unitId}`;
}

// Role re-checked here; writes run as the user so RLS checks the org, and
// database triggers keep the unit status in step with its leases.

export async function createLease(unitId: string, input: CreateLeaseInput): Promise<FormActionResult> {
  const user = await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(unitId);
  const parsed = createLeaseSchema.safeParse(input);
  if (!id.success || !parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .insert({
      org_id: user.orgId,
      unit_id: id.data,
      tenant_id: parsed.data.tenantId,
      start_date: parsed.data.startDate,
      end_date: parsed.data.endDate,
      rent_amount_cents: parsed.data.rent,
      deposit_amount_cents: parsed.data.deposit,
      due_day: parsed.data.dueDay,
    })
    .select("units(property_id)")
    .single();
  if (error?.code === UNIQUE_VIOLATION) {
    return { ok: false, error: "This unit already has an active lease. End it first." };
  }
  if (error?.code === CHECK_VIOLATION) return { ok: false, error: "Choose a tenant account for this lease." };
  if (error) return FAILED;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(unitPath(data.units.property_id, id.data));
}

export async function updateLease(leaseId: string, input: UpdateLeaseInput): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(leaseId);
  const parsed = updateLeaseSchema.safeParse(input);
  if (!id.success || !parsed.success) return INVALID_INPUT;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .update({
      end_date: parsed.data.endDate,
      rent_amount_cents: parsed.data.rent,
      deposit_amount_cents: parsed.data.deposit,
      due_day: parsed.data.dueDay,
    })
    .eq("id", id.data)
    .select("unit_id, units(property_id)");
  if (error?.code === CHECK_VIOLATION) return { ok: false, error: "The end date must be after the start date." };
  if (error) return FAILED;
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(unitPath(data[0].units.property_id, data[0].unit_id));
}

export async function endLease(leaseId: string, input: { endDate: string }): Promise<FormActionResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(leaseId);
  const parsed = endLeaseSchema.safeParse(input);
  if (!id.success || !parsed.success) return { ok: false, error: "Enter a valid end date." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("leases")
    .update({ status: "ended", end_date: parsed.data.endDate })
    .eq("id", id.data)
    .eq("status", "active")
    .select("unit_id, units(property_id)");
  if (error?.code === CHECK_VIOLATION) return { ok: false, error: "The end date must be after the start date." };
  if (error) return FAILED;
  if (data.length === 0) return NOT_FOUND;

  revalidatePath(PROPERTIES_PATH, "layout");
  redirect(unitPath(data[0].units.property_id, data[0].unit_id));
}

export type UploadLeaseDocumentResult = { ok: true } | FormActionResult;

/**
 * Stores a signed lease PDF and links it to the lease, replacing any earlier
 * one. Storage policies check the org and lease folder in the object name.
 */
export async function uploadLeaseDocument(leaseId: string, formData: FormData): Promise<UploadLeaseDocumentResult> {
  await requireRole(MANAGER_ROLES, PROPERTIES_PATH);
  const id = idSchema.safeParse(leaseId);
  if (!id.success) return NOT_FOUND;
  const document = await validateLeaseDocument(formData.get("document"));
  if (!document.ok) return document;

  const supabase = await createClient();
  const { data: lease, error: leaseError } = await supabase
    .from("leases")
    .select("id, org_id, document_path")
    .eq("id", id.data)
    .maybeSingle();
  if (leaseError) return FAILED;
  if (!lease) return NOT_FOUND;

  const storage = supabase.storage.from(LEASE_DOCUMENTS_BUCKET);
  const path = leaseDocumentPath(lease.org_id, lease.id, crypto.randomUUID());
  const { error: uploadError } = await storage.upload(path, document.file, {
    contentType: "application/pdf",
    upsert: false,
  });
  if (uploadError) return FAILED;

  const { error: updateError } = await supabase.from("leases").update({ document_path: path }).eq("id", lease.id);
  if (updateError) {
    await storage.remove([path]);
    return FAILED;
  }
  // The old file is no longer linked. A failed cleanup leaves an orphan, not a leak.
  if (lease.document_path) await storage.remove([lease.document_path]);

  revalidatePath(PROPERTIES_PATH, "layout");
  return { ok: true };
}

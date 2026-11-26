"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { triageSchema, type TriageInput } from "@/lib/maintenance/requests";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

const MAINTENANCE_PATH = "/manager/maintenance";

export type TriageResult = { ok: true } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  request_not_found: "That request no longer exists.",
  request_closed: "This request is closed and cannot be changed.",
  assignee_not_staff: "Pick a maintenance staff member from your organization.",
};

/** Confirms category and priority and assigns staff. The database function re-checks the role and org. */
export async function triageRequest(requestId: string, input: TriageInput): Promise<TriageResult> {
  await requireRole(["admin", "manager"], MAINTENANCE_PATH);
  const id = idSchema.safeParse(requestId);
  if (!id.success) return { ok: false, error: ERRORS.request_not_found };
  const parsed = triageSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the form." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("triage_request", {
    p_request_id: id.data,
    p_category: parsed.data.category,
    p_priority: parsed.data.priority,
    // The generated type omits null for optional arguments; the function takes it.
    p_assigned_to: parsed.data.assignedTo ?? undefined,
  });
  if (error) return { ok: false, error: ERRORS[error.message] ?? "Could not save the triage. Try again." };

  revalidatePath(MAINTENANCE_PATH, "layout");
  return { ok: true };
}

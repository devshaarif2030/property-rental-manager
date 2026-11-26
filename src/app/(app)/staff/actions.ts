"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth/session";
import { jobStatusSchema, type JobStatusInput } from "@/lib/maintenance/requests";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

const STAFF_PATH = "/staff";

export type JobStatusResult = { ok: true } | { ok: false; error: string };

const ERRORS: Record<string, string> = {
  job_not_found: "That job is not assigned to you any more.",
  invalid_status_change: "This job has already moved on. Reload the page.",
};

/** Moves an assigned job to in progress or done. The database function checks the assignee and the order. */
export async function updateJobStatus(requestId: string, input: JobStatusInput): Promise<JobStatusResult> {
  await requireRole(["staff"], STAFF_PATH);
  const id = idSchema.safeParse(requestId);
  if (!id.success) return { ok: false, error: ERRORS.job_not_found };
  const parsed = jobStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Check the note." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_job_status", {
    p_request_id: id.data,
    p_status: parsed.data.status,
    p_note: parsed.data.note || undefined,
  });
  if (error) return { ok: false, error: ERRORS[error.message] ?? "Could not update the job. Try again." };

  revalidatePath(STAFF_PATH, "layout");
  return { ok: true };
}

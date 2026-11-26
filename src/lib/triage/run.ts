import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

import { getGeminiConfig } from "./env";
import { suggestTriage } from "./suggest";

/** Gemini calls allowed per organization per hour. Past this the keyword rules decide. */
export const AI_CALLS_PER_ORG_PER_HOUR = 20;

/**
 * Suggests a category and priority for a newly reported request and stores it
 * next to (not in) the confirmed values. Runs after the tenant's response is
 * sent. Uses the service role because clients cannot write the ai_* columns;
 * the request id comes from a row the tenant just created under RLS.
 */
export async function runTriage(requestId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: request, error } = await admin
    .from("maintenance_requests")
    .select("id, org_id, title, description, ai_source")
    .eq("id", requestId)
    .maybeSingle();
  if (error || !request || request.ai_source) return;

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("maintenance_requests")
    .select("id", { count: "exact", head: true })
    .eq("org_id", request.org_id)
    .eq("ai_source", "ai")
    .gte("created_at", since);

  const suggestion = await suggestTriage(
    { title: request.title, description: request.description },
    { gemini: getGeminiConfig(), aiAllowed: (count ?? AI_CALLS_PER_ORG_PER_HOUR) < AI_CALLS_PER_ORG_PER_HOUR },
  );

  await admin
    .from("maintenance_requests")
    .update({
      ai_category: suggestion.category,
      ai_priority: suggestion.priority,
      ai_reason: suggestion.reason,
      ai_source: suggestion.source,
    })
    .eq("id", request.id)
    .is("ai_source", null);
}

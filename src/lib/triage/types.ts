import { z } from "zod";

import { REQUEST_CATEGORIES, REQUEST_PRIORITIES } from "@/lib/maintenance/requests";

export const MAX_REASON_LENGTH = 200;

/** What Gemini must return. Anything else is treated as a failure and the rules decide. */
export const aiSuggestionSchema = z.object({
  category: z.enum(REQUEST_CATEGORIES),
  priority: z.enum(REQUEST_PRIORITIES),
  reason: z.string().trim().min(1).max(MAX_REASON_LENGTH),
});

export type TriageSuggestion = z.infer<typeof aiSuggestionSchema>;

export type TriageSource = "ai" | "rules";

export type TriageResult = TriageSuggestion & { source: TriageSource };

export type TriageRequestText = { title: string; description: string };

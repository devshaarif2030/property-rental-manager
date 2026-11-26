import { type GeminiConfig, suggestWithGemini } from "./gemini";
import { triageByRules } from "./rules";
import type { TriageRequestText, TriageResult } from "./types";

type SuggestOptions = {
  /** Null when Gemini is not configured. */
  gemini: GeminiConfig | null;
  /** False when the org has used up its hourly AI calls. */
  aiAllowed: boolean;
  fetchImpl?: typeof fetch;
};

/** Gemini first when allowed, keyword rules whenever Gemini is off, over the limit or fails. Never throws. */
export async function suggestTriage(request: TriageRequestText, options: SuggestOptions): Promise<TriageResult> {
  if (options.gemini && options.aiAllowed) {
    const suggestion = await suggestWithGemini(request, options.gemini, options.fetchImpl);
    if (suggestion) return { ...suggestion, source: "ai" };
  }
  return { ...triageByRules(request), source: "rules" };
}

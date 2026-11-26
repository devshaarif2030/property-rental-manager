import type { RequestDetail } from "@/lib/maintenance/queries";
import { CATEGORY_LABELS, PRIORITY_LABELS } from "@/lib/maintenance/requests";

const SOURCE_LABELS = { ai: "AI suggested", rules: "Keyword rules suggested" } as const;

/** The stored suggestion, shown to the manager next to the triage form. */
export function TriageSuggestion({ request }: { request: RequestDetail }) {
  if (!request.aiSource || !request.aiCategory || !request.aiPriority) {
    return <p className="text-sm text-muted-foreground">Working out a suggestion. Reload in a few seconds.</p>;
  }
  return (
    <div className="flex flex-col gap-1 rounded-md border border-dashed p-3 text-sm">
      <p>
        <span className="font-medium">{SOURCE_LABELS[request.aiSource]}:</span>{" "}
        {CATEGORY_LABELS[request.aiCategory]}, {PRIORITY_LABELS[request.aiPriority]}
      </p>
      {request.aiReason && <p className="text-muted-foreground">{request.aiReason}</p>}
      <p className="text-xs text-muted-foreground">
        {request.aiSource === "ai"
          ? "From Gemini. Check it before you confirm."
          : "Gemini was not used for this one (no key, over the hourly limit, or no valid answer)."}
      </p>
    </div>
  );
}

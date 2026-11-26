import { PRIORITY_LABELS, type RequestPriority } from "@/lib/maintenance/requests";
import { cn } from "@/lib/utils";

const PRIORITY_STYLES: Record<RequestPriority, string> = {
  emergency: "border-destructive bg-destructive text-white",
  high: "border-destructive/30 bg-danger-soft text-destructive",
  normal: "border-border bg-card text-foreground",
  low: "border-border bg-card text-muted-foreground",
};

export function PriorityBadge({ priority }: { priority: RequestPriority }) {
  return (
    <span
      className={cn("inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold", PRIORITY_STYLES[priority])}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

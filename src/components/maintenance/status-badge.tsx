import { STATUS_LABELS, type RequestStatus } from "@/lib/maintenance/requests";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RequestStatus, string> = {
  open: "bg-warning-soft text-warning",
  assigned: "bg-info-soft text-info",
  in_progress: "bg-brand-50 text-brand-600",
  done: "bg-brand-100 text-brand-900",
  cancelled: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        STATUS_STYLES[status],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status]}
    </span>
  );
}

import { STATUS_LABELS, type RequestStatus } from "@/lib/maintenance/requests";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<RequestStatus, string> = {
  open: "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100",
  assigned: "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100",
  in_progress: "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100",
  done: "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100",
  cancelled: "border-border bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-xs font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </span>
  );
}

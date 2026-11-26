import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: LucideIcon;
  /** The brand card sits on the emerald gradient with a glass icon. Use it once per row. */
  tone?: "default" | "brand";
};

export function StatCard({ label, value, hint, icon: Icon, tone = "default" }: StatCardProps) {
  const brand = tone === "brand";
  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 overflow-hidden rounded-2xl p-5 sm:p-6",
        brand ? "bg-brand-gradient text-white shadow-card" : "border border-border/70 bg-card shadow-card",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-sm font-medium", brand ? "text-brand-100" : "text-muted-foreground")}>{label}</p>
        <span
          aria-hidden
          className={cn(
            "flex size-9 items-center justify-center rounded-full",
            brand ? "glass" : "border border-border bg-background text-brand-800",
          )}
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="text-3xl font-bold tracking-tight sm:text-4xl">{value}</p>
      {hint && <p className={cn("text-xs", brand ? "text-brand-100" : "text-muted-foreground")}>{hint}</p>}
    </div>
  );
}

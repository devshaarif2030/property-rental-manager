import { House } from "lucide-react";

import { cn } from "@/lib/utils";

/** Brand mark and wordmark. `tone="light"` is for the dark gradient. */
export function Logo({ tone = "dark", className }: { tone?: "dark" | "light"; className?: string }) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <span
        aria-hidden
        className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]"
      >
        <House className="size-[18px]" strokeWidth={2.25} />
      </span>
      <span
        className={cn(
          "flex flex-col text-[15px] leading-[1.1] font-bold tracking-tight",
          tone === "light" ? "text-white" : "text-foreground",
        )}
      >
        Property Rental
        <span className={cn("font-medium", tone === "light" ? "text-brand-100" : "text-muted-foreground")}>
          Manager
        </span>
      </span>
    </span>
  );
}

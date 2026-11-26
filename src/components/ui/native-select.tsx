import * as React from "react";

import { cn } from "@/lib/utils";

/** A styled native <select>: accessible and mobile friendly with no extra script. */
function NativeSelect({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        "h-11 w-full rounded-xl border border-input bg-card px-3 py-1 text-base outline-none md:text-sm dark:bg-input/30",
        "focus-visible:border-ring focus-visible:ring-4 focus-visible:ring-ring/15",
        "aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { NativeSelect };

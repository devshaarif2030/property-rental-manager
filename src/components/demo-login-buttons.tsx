"use client";

import { ArrowRight, Building2, Loader2, UserRound, Wrench, type LucideIcon } from "lucide-react";
import { useState, useTransition } from "react";

import { signInAsDemo } from "@/app/sign-in/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { DEMO_LOGIN_ROLES, type DemoRole } from "@/lib/demo/roles";
import { cn } from "@/lib/utils";

const ROLE_DETAILS: Record<DemoRole, { icon: LucideIcon; hint: string }> = {
  manager: { icon: Building2, hint: "Portfolio, rent and the triage queue" },
  tenant: { icon: UserRound, hint: "Pay rent and report a repair" },
  staff: { icon: Wrench, hint: "Assigned jobs and notes" },
};

type DemoLoginButtonsProps = {
  /** "glass" sits on the brand gradient, "secondary" on light surfaces. */
  variant?: "glass" | "secondary";
};

/** "Try as ..." buttons that sign in as a shared demo account in one click. */
export function DemoLoginButtons({ variant = "secondary" }: DemoLoginButtonsProps) {
  const [isPending, startTransition] = useTransition();
  const [pendingRole, setPendingRole] = useState<DemoRole | null>(null);
  const [error, setError] = useState<string | null>(null);

  function tryAs(role: DemoRole) {
    setError(null);
    setPendingRole(role);
    startTransition(async () => {
      // On success the action redirects and never returns.
      const result = await signInAsDemo(role);
      if (!result.ok) setError(result.error);
      setPendingRole(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {DEMO_LOGIN_ROLES.map((role) => {
          const { icon: Icon, hint } = ROLE_DETAILS[role];
          const isThisPending = pendingRole === role;
          return (
            <li key={role}>
              <button
                type="button"
                disabled={isPending}
                onClick={() => tryAs(role)}
                className={cn(
                  "group flex w-full cursor-pointer items-center gap-3 rounded-xl p-2.5 pr-3 text-left shadow-[0_1px_0_rgb(255_255_255/0.12)_inset,0_6px_16px_-8px_rgb(7_15_41/0.5)] transition-all hover:-translate-y-px focus-visible:ring-4 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-60",
                  variant === "glass"
                    ? "bg-white text-brand-950 hover:bg-brand-50 focus-visible:ring-white/40"
                    : "bg-primary text-primary-foreground hover:bg-brand-900 focus-visible:ring-ring/25",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-lg",
                    variant === "glass" ? "bg-brand-50 text-brand-800" : "bg-white/10 text-white",
                  )}
                >
                  {isThisPending ? <Loader2 className="size-[18px] animate-spin" /> : <Icon className="size-[18px]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">Try as {ROLE_LABELS[role].toLowerCase()}</span>
                  <span
                    className={cn(
                      "text-xs leading-snug",
                      variant === "glass" ? "text-muted-foreground" : "text-brand-100",
                    )}
                  >
                    {isThisPending ? "Signing in..." : hint}
                  </span>
                </span>
                <span
                  aria-hidden
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:translate-x-0.5",
                    variant === "glass" ? "bg-brand-800 text-white" : "bg-white text-brand-900",
                  )}
                >
                  <ArrowRight className="size-4" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className={variant === "glass" ? "text-sm text-red-200" : "text-sm text-destructive"}>
          {error}
        </p>
      )}
    </div>
  );
}

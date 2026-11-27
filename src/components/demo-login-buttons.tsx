"use client";

import { Building2, ChevronRight, Loader2, UserRound, Wrench, type LucideIcon } from "lucide-react";
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
                aria-label={`Try as ${ROLE_LABELS[role].toLowerCase()}`}
                disabled={isPending}
                onClick={() => tryAs(role)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl border p-2.5 pr-4 text-left transition-colors disabled:opacity-60",
                  variant === "glass"
                    ? "border-white/10 bg-white/[0.04] hover:border-white/20 hover:bg-white/[0.09]"
                    : "border-border bg-card hover:border-brand-400/60 hover:bg-brand-50",
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-10 shrink-0 items-center justify-center rounded-xl",
                    variant === "glass" ? "bg-white/10 text-white" : "bg-accent text-brand-800",
                  )}
                >
                  {isThisPending ? <Loader2 className="size-[18px] animate-spin" /> : <Icon className="size-[18px]" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold">{ROLE_LABELS[role]}</span>
                  <span
                    className={cn(
                      "truncate text-xs",
                      variant === "glass" ? "text-brand-100/80" : "text-muted-foreground",
                    )}
                  >
                    {isThisPending ? "Signing in..." : hint}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                    variant === "glass" ? "text-white/60" : "text-muted-foreground",
                  )}
                />
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

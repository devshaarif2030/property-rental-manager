"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { signInAsDemo } from "@/app/sign-in/actions";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { DEMO_LOGIN_ROLES, type DemoRole } from "@/lib/demo/roles";

/** "Try as ..." buttons that sign in as a shared demo account in one click. */
export function DemoLoginButtons() {
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
      <div className="flex flex-wrap gap-3">
        {DEMO_LOGIN_ROLES.map((role) => (
          <Button key={role} type="button" variant="secondary" disabled={isPending} onClick={() => tryAs(role)}>
            {pendingRole === role ? "Signing in..." : `Try as ${ROLE_LABELS[role].toLowerCase()}`}
          </Button>
        ))}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

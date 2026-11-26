import type { Metadata } from "next";
import { Suspense } from "react";

import { DemoLoginButtons } from "@/components/demo-login-buttons";
import { AuthShell } from "@/components/layout/auth-shell";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Property Rental Manager" };

export default function SignInPage() {
  return (
    <AuthShell>
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Accounts are invite only. Ask your property manager for an invite.
        </p>
      </div>
      <section aria-labelledby="demo-heading" className="flex flex-col gap-3 rounded-2xl bg-accent/60 p-4">
        <h2 id="demo-heading" className="text-sm font-semibold">
          Just looking? Try the demo
        </h2>
        <p className="text-sm text-muted-foreground">
          One click signs you in to a shared demo account. Fictional data, Stripe test mode, reset every night.
        </p>
        <DemoLoginButtons />
      </section>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or sign in with your account
        <span className="h-px flex-1 bg-border" />
      </div>
      <Suspense>
        <SignInForm />
      </Suspense>
    </AuthShell>
  );
}

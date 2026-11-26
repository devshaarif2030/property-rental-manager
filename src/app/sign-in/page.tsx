import type { Metadata } from "next";
import { Suspense } from "react";

import { DemoLoginButtons } from "@/components/demo-login-buttons";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in · Property Rental Manager" };

export default function SignInPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted-foreground">
          Accounts are invite only. Ask your property manager for an invite.
        </p>
      </div>
      <section aria-labelledby="demo-heading" className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 id="demo-heading" className="text-sm font-medium">
          Just looking? Try the demo
        </h2>
        <p className="text-sm text-muted-foreground">
          One click signs you in to a shared demo account. Fictional data, Stripe test mode, reset every night.
        </p>
        <DemoLoginButtons />
      </section>
      <Suspense>
        <SignInForm />
      </Suspense>
    </main>
  );
}

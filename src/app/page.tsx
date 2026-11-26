import Link from "next/link";

import { DemoLoginButtons } from "@/components/demo-login-buttons";
import { Button } from "@/components/ui/button";
import { SIGN_IN_PATH } from "@/lib/auth/paths";

const REPOSITORY_URL = "https://github.com/devshaarif2030/property-rental-manager";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Property Rental Manager</h1>
      <p className="text-lg text-muted-foreground">
        Rent, leases and repairs for a property management company, in one place. Built for a
        fictional client as a portfolio project.
      </p>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Try it without signing up. Fictional data, Stripe test mode, reset every night.
        </p>
        <DemoLoginButtons />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href={SIGN_IN_PATH}>Sign in</Link>
        </Button>
        <Button asChild variant="outline">
          <a href={REPOSITORY_URL}>View the source on GitHub</a>
        </Button>
      </div>
    </main>
  );
}

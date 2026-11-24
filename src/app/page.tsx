import { Button } from "@/components/ui/button";

const REPOSITORY_URL = "https://github.com/devshaarif2030/property-rental-manager";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-24">
      <h1 className="text-4xl font-semibold tracking-tight">Property Rental Manager</h1>
      <p className="text-lg text-muted-foreground">
        Rent, leases and repairs for a property management company, in one place. Built for a
        fictional client as a portfolio project.
      </p>
      <div>
        <Button asChild variant="outline">
          <a href={REPOSITORY_URL}>View the source on GitHub</a>
        </Button>
      </div>
    </main>
  );
}

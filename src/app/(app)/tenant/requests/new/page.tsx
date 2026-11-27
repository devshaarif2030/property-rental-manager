import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/session";

import { RequestForm } from "./request-form";

export const metadata: Metadata = { title: "Report a problem · Property Rental Manager" };

export default async function NewRequestPage() {
  await requireRole(["tenant"], "/tenant/requests/new");
  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Maintenance</p>
        <h1 className="text-3xl font-semibold">Report a problem</h1>
        <p className="text-muted-foreground">Your property manager sees it straight away. For a gas leak or fire, call emergency services first.</p>
      </div>
      <RequestForm />
    </div>
  );
}

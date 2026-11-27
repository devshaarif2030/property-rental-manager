"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";

import { endLease } from "./lease-actions";

/** Ends the active lease on a chosen date. The unit becomes vacant. */
export function EndLeaseForm({ leaseId }: { leaseId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [endDate, setEndDate] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        End lease
      </Button>
    );
  }

  return (
    <form
      className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card shadow-card p-5"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          setError((await endLease(leaseId, { endDate })).error);
        });
      }}
    >
      <FormField
        id="end-lease-date"
        label="Last day of the lease"
        type="date"
        required
        value={endDate}
        onChange={(event) => setEndDate(event.target.value)}
      />
      <FormError message={error} />
      <div className="flex gap-2">
        <Button type="submit" variant="destructive" size="sm" disabled={isPending || endDate === ""}>
          {isPending ? "Ending..." : "End lease"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

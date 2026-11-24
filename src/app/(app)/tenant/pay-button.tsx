"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";

import { payRentCharge } from "./actions";

/** Sends the tenant to Stripe Checkout (test mode) for one charge. */
export function PayButton({ chargeId }: { chargeId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={isPending}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            setError((await payRentCharge(chargeId)).error);
          });
        }}
      >
        {isPending ? "Opening Stripe..." : "Pay now"}
      </Button>
      <FormError message={error} />
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import type { FormActionResult } from "@/lib/properties/schemas";

type DeleteButtonProps = {
  label: string;
  onDelete: () => Promise<FormActionResult>;
};

/** Two-step delete: the first click asks for confirmation inline. */
export function DeleteButton({ label, onDelete }: DeleteButtonProps) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (!isConfirming) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setIsConfirming(true)}>
        {label}
      </Button>
    );
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex gap-2">
        <Button
          type="button"
          variant="destructive"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await onDelete();
              setError(result.error);
            })
          }
        >
          {isPending ? "Deleting..." : "Yes, delete"}
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={() => setIsConfirming(false)}>
          Cancel
        </Button>
      </div>
      <FormError message={error} />
    </div>
  );
}

"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { StaffMember } from "@/lib/maintenance/queries";
import {
  CATEGORY_LABELS,
  PRIORITY_LABELS,
  REQUEST_CATEGORIES,
  REQUEST_PRIORITIES,
  triageSchema,
  type RequestCategory,
  type RequestPriority,
  type TriageInput,
  type TriageOutput,
} from "@/lib/maintenance/requests";

import { triageRequest } from "../actions";

type TriageFormProps = {
  requestId: string;
  staff: StaffMember[];
  defaults: { category: RequestCategory | null; priority: RequestPriority | null; assignedTo: string | null };
};

export function TriageForm({ requestId, staff, defaults }: TriageFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const form = useForm<TriageInput, unknown, TriageOutput>({
    resolver: zodResolver(triageSchema),
    defaultValues: {
      category: defaults.category ?? undefined,
      priority: defaults.priority ?? undefined,
      assignedTo: defaults.assignedTo ?? "",
    },
  });
  const { errors } = form.formState;

  // Validate on the client, then send the raw values: the server parses them again.
  const onSubmit = form.handleSubmit(() => {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await triageRequest(requestId, form.getValues());
      if (result.ok) setSaved(true);
      else setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-xl flex-col gap-4 rounded-md border p-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="category">Category</Label>
          <NativeSelect id="category" aria-invalid={Boolean(errors.category)} {...form.register("category")}>
            <option value="">Choose...</option>
            {REQUEST_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_LABELS[category]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="priority">Priority</Label>
          <NativeSelect id="priority" aria-invalid={Boolean(errors.priority)} {...form.register("priority")}>
            <option value="">Choose...</option>
            {REQUEST_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {PRIORITY_LABELS[priority]}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="assignedTo">Assign to</Label>
          <NativeSelect id="assignedTo" {...form.register("assignedTo")}>
            <option value="">Nobody yet</option>
            {staff.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
              </option>
            ))}
          </NativeSelect>
        </div>
      </div>
      {staff.length === 0 && (
        <p className="text-sm text-muted-foreground">No maintenance staff yet. Invite one from People.</p>
      )}
      <FormError message={error ?? errors.category?.message ?? errors.priority?.message ?? null} />
      {saved && (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      )}
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "Saving..." : "Confirm and save"}
      </Button>
    </form>
  );
}

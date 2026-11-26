"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ROLE_LABELS, type UserRole } from "@/lib/auth/roles";
import {
  createInviteSchema,
  INVITE_TTL_DAYS,
  type CreateInviteInput,
  type CreateInviteResult,
} from "@/lib/invites/schemas";

import { createInvite } from "./actions";

type InviteFormProps = {
  invitableRoles: readonly UserRole[];
};

export function InviteForm({ invitableRoles }: InviteFormProps) {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<CreateInviteResult | null>(null);
  const form = useForm<CreateInviteInput>({
    resolver: zodResolver(createInviteSchema),
    defaultValues: { email: "", role: invitableRoles[0] },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setResult(null);
    startTransition(async () => {
      const outcome = await createInvite(values);
      setResult(outcome);
      if (outcome.ok) form.reset({ email: "", role: values.role });
    });
  });

  return (
    <div className="flex flex-col gap-4">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            autoComplete="off"
            aria-invalid={Boolean(errors.email)}
            aria-describedby={errors.email ? "invite-email-error" : undefined}
            {...form.register("email")}
          />
          {errors.email && (
            <p id="invite-email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="invite-role">Role</Label>
          <select
            id="invite-role"
            className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
            {...form.register("role")}
          >
            {invitableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create invite"}
        </Button>
      </form>

      {result && !result.ok && (
        <p role="alert" className="text-sm text-destructive">
          {result.error}
        </p>
      )}
      {result?.ok && (
        <div role="status" className="flex flex-col gap-2 rounded-2xl border border-border/70 bg-card shadow-card p-5 text-sm">
          <p>
            Invite created for <span className="font-medium">{result.email}</span>. Send them this
            link. It works once and expires in {INVITE_TTL_DAYS} days.
          </p>
          <Input readOnly value={result.inviteUrl} onFocus={(event) => event.target.select()} />
        </div>
      )}
    </div>
  );
}

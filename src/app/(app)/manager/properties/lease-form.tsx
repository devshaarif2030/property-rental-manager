"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm, type FieldError, type UseFormRegisterReturn } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { TenantOption } from "@/lib/leases/queries";
import {
  createLeaseSchema,
  updateLeaseSchema,
  type CreateLeaseInput,
  type CreateLeaseOutput,
  type UpdateLeaseInput,
  type UpdateLeaseOutput,
} from "@/lib/leases/schemas";

import { createLease, updateLease } from "./lease-actions";

const SELECT_CLASS = "h-11 rounded-xl border border-input bg-card px-3 text-sm";

type TermsField = "rent" | "deposit" | "dueDay" | "endDate";

type TermsFieldsProps = {
  fields: Record<TermsField, UseFormRegisterReturn>;
  errors: Partial<Record<TermsField, FieldError>>;
};

/** Rent, deposit, due day and end date: shared by the create and edit forms. */
function TermsFields({ fields, errors }: TermsFieldsProps) {
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="rent"
          label="Monthly rent"
          inputMode="decimal"
          error={errors.rent?.message}
          {...fields.rent}
        />
        <FormField
          id="deposit"
          label="Deposit"
          inputMode="decimal"
          error={errors.deposit?.message}
          {...fields.deposit}
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="dueDay"
          label="Rent due on day (1 to 28)"
          type="number"
          inputMode="numeric"
          min={1}
          max={28}
          error={errors.dueDay?.message}
          {...fields.dueDay}
        />
        <FormField
          id="endDate"
          label="End date (optional)"
          type="date"
          error={errors.endDate?.message}
          {...fields.endDate}
        />
      </div>
    </>
  );
}

type CreateLeaseFormProps = {
  unitId: string;
  tenants: TenantOption[];
  defaultRent: string;
};

export function CreateLeaseForm({ unitId, tenants, defaultRent }: CreateLeaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<CreateLeaseInput, unknown, CreateLeaseOutput>({
    resolver: zodResolver(createLeaseSchema),
    defaultValues: { tenantId: "", startDate: "", endDate: "", rent: defaultRent, deposit: defaultRent, dueDay: "1" },
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit(() => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the unit page.
      setError((await createLease(unitId, form.getValues())).error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="tenantId">Tenant</Label>
        <select
          id="tenantId"
          className={SELECT_CLASS}
          aria-invalid={Boolean(errors.tenantId)}
          aria-describedby={errors.tenantId ? "tenantId-error" : undefined}
          {...form.register("tenantId")}
        >
          <option value="">Choose a tenant</option>
          {tenants.map((tenant) => (
            <option key={tenant.id} value={tenant.id}>
              {tenant.fullName}
              {tenant.hasActiveLease ? " (has an active lease)" : ""}
            </option>
          ))}
        </select>
        {errors.tenantId && (
          <p id="tenantId-error" className="text-sm text-destructive">
            {errors.tenantId.message}
          </p>
        )}
        {tenants.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No tenants yet. Invite one from the People page first.
          </p>
        )}
      </div>
      <FormField
        id="startDate"
        label="Start date"
        type="date"
        error={errors.startDate?.message}
        {...form.register("startDate")}
      />
      <TermsFields
        fields={{
          rent: form.register("rent"),
          deposit: form.register("deposit"),
          dueDay: form.register("dueDay"),
          endDate: form.register("endDate"),
        }}
        errors={errors}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Create lease"}
      </Button>
    </form>
  );
}

type EditLeaseFormProps = {
  leaseId: string;
  defaultValues: UpdateLeaseInput;
};

export function EditLeaseForm({ leaseId, defaultValues }: EditLeaseFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UpdateLeaseInput, unknown, UpdateLeaseOutput>({
    resolver: zodResolver(updateLeaseSchema),
    defaultValues,
  });

  const onSubmit = form.handleSubmit(() => {
    setError(null);
    startTransition(async () => {
      setError((await updateLease(leaseId, form.getValues())).error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <TermsFields
        fields={{
          rent: form.register("rent"),
          deposit: form.register("deposit"),
          dueDay: form.register("dueDay"),
          endDate: form.register("endDate"),
        }}
        errors={form.formState.errors}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : "Save changes"}
      </Button>
    </form>
  );
}

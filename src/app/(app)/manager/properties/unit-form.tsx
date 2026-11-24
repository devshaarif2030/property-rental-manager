"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { unitSchema, type UnitInput, type UnitOutput } from "@/lib/properties/schemas";

import { createUnit, updateUnit } from "./actions";

type UnitFormProps =
  | { mode: "create"; propertyId: string; unitId?: undefined; defaultValues?: undefined }
  | { mode: "edit"; propertyId?: undefined; unitId: string; defaultValues: UnitInput };

const EMPTY: UnitInput = { label: "", bedrooms: "1", bathrooms: "1", rent: "" };

export function UnitForm({ mode, propertyId, unitId, defaultValues }: UnitFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<UnitInput, unknown, UnitOutput>({
    resolver: zodResolver(unitSchema),
    defaultValues: defaultValues ?? EMPTY,
  });
  const { errors } = form.formState;

  // Submit the raw strings: the server parses them with the same schema.
  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    setError(null);
    startTransition(async () => {
      const result =
        mode === "create" ? await createUnit(propertyId, values) : await updateUnit(unitId, values);
      setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <FormField
        id="label"
        label="Unit label"
        placeholder="Flat 2B"
        error={errors.label?.message}
        {...form.register("label")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id="bedrooms"
          label="Bedrooms"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          error={errors.bedrooms?.message}
          {...form.register("bedrooms")}
        />
        <FormField
          id="bathrooms"
          label="Bathrooms"
          type="number"
          inputMode="numeric"
          min={0}
          max={20}
          error={errors.bathrooms?.message}
          {...form.register("bathrooms")}
        />
      </div>
      <FormField
        id="rent"
        label="Monthly rent"
        inputMode="decimal"
        placeholder="1250.00"
        error={errors.rent?.message}
        {...form.register("rent")}
      />
      <FormError message={error} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : mode === "create" ? "Add unit" : "Save changes"}
      </Button>
    </form>
  );
}

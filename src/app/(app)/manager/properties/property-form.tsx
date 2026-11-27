"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";

import { FormError } from "@/components/form-error";
import { FormField } from "@/components/form-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { COUNTRIES, propertySchema, type PropertyInput } from "@/lib/properties/schemas";

import { createProperty, updateProperty } from "./actions";

type PropertyFormProps =
  | { mode: "create"; defaultValues?: undefined; propertyId?: undefined }
  | { mode: "edit"; defaultValues: PropertyInput; propertyId: string };

const EMPTY: PropertyInput = { name: "", addressLine: "", city: "", postcode: "", country: "GB" };

export function PropertyForm({ mode, defaultValues, propertyId }: PropertyFormProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useForm<PropertyInput>({
    resolver: zodResolver(propertySchema),
    defaultValues: defaultValues ?? EMPTY,
  });
  const { errors } = form.formState;

  const onSubmit = form.handleSubmit((values) => {
    setError(null);
    startTransition(async () => {
      // On success the action redirects to the property page.
      const result =
        mode === "create" ? await createProperty(values) : await updateProperty(propertyId, values);
      setError(result.error);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-lg flex-col gap-4">
      <FormField id="name" label="Property name" error={errors.name?.message} {...form.register("name")} />
      <FormField
        id="addressLine"
        label="Address"
        autoComplete="address-line1"
        error={errors.addressLine?.message}
        {...form.register("addressLine")}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField id="city" label="City" error={errors.city?.message} {...form.register("city")} />
        <FormField
          id="postcode"
          label="Postcode or ZIP"
          error={errors.postcode?.message}
          {...form.register("postcode")}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="country">Country</Label>
        <select
          id="country"
          className="h-11 rounded-xl border border-input bg-card px-3 text-sm"
          {...form.register("country")}
        >
          {Object.entries(COUNTRIES).map(([code, name]) => (
            <option key={code} value={code}>
              {name}
            </option>
          ))}
        </select>
      </div>
      <FormError message={error} />
      <Button type="submit" disabled={isPending} className="self-start">
        {isPending ? "Saving..." : mode === "create" ? "Add property" : "Save changes"}
      </Button>
    </form>
  );
}

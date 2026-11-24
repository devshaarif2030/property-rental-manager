import { z } from "zod";

import { amountCents, requiredText, wholeNumber } from "@/lib/forms/fields";

export const COUNTRIES = { GB: "United Kingdom", US: "United States" } as const;

export const propertySchema = z.object({
  name: requiredText("property name", 200),
  addressLine: requiredText("address", 200),
  city: requiredText("city", 100),
  postcode: requiredText("postcode or ZIP", 20),
  country: z.enum(["GB", "US"]),
});

export const unitSchema = z.object({
  label: requiredText("unit label", 50),
  bedrooms: wholeNumber(0, 20),
  bathrooms: wholeNumber(0, 20),
  rent: amountCents({ allowZero: false, message: "Enter a monthly rent, like 1250 or 1250.50." }),
});

export const idSchema = z.guid();

export type PropertyInput = z.input<typeof propertySchema>;
export type UnitInput = z.input<typeof unitSchema>;
export type UnitOutput = z.output<typeof unitSchema>;

export type FormActionResult = { ok: false; error: string };

import { z } from "zod";

import { parseAmountToCents } from "@/lib/money/money";

const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, { error: `Enter the ${label}.` }).max(max);

export const COUNTRIES = { GB: "United Kingdom", US: "United States" } as const;

export const propertySchema = z.object({
  name: requiredText("property name", 200),
  addressLine: requiredText("address", 200),
  city: requiredText("city", 100),
  postcode: requiredText("postcode or ZIP", 20),
  country: z.enum(["GB", "US"]),
});

const roomCount = z.coerce
  .number<string>()
  .int({ error: "Use a whole number." })
  .min(0, { error: "Cannot be negative." })
  .max(20, { error: "20 at most." });

export const unitSchema = z.object({
  label: requiredText("unit label", 50),
  bedrooms: roomCount,
  bathrooms: roomCount,
  rent: z
    .string()
    .transform((value, ctx) => {
      const cents = parseAmountToCents(value);
      if (cents === null || cents === 0) {
        ctx.addIssue({ code: "custom", message: "Enter a monthly rent, like 1250 or 1250.50." });
        return z.NEVER;
      }
      return cents;
    }),
});

export const idSchema = z.uuid();

export type PropertyInput = z.input<typeof propertySchema>;
export type UnitInput = z.input<typeof unitSchema>;
export type UnitOutput = z.output<typeof unitSchema>;

export type FormActionResult = { ok: false; error: string };

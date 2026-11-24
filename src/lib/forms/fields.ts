import { z } from "zod";

import { parseAmountToCents } from "@/lib/money/money";

export const requiredText = (label: string, max: number) =>
  z.string().trim().min(1, { error: `Enter the ${label}.` }).max(max);

/** A money amount typed into a form, converted to integer cents. */
export const amountCents = ({ allowZero, message }: { allowZero: boolean; message: string }) =>
  z.string().transform((value, ctx) => {
    const cents = parseAmountToCents(value);
    if (cents === null || (!allowZero && cents === 0)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return cents;
  });

/** A calendar date from an <input type="date">, kept as YYYY-MM-DD. */
export const isoDate = (message: string) => z.iso.date({ error: message });

export const wholeNumber = (min: number, max: number) =>
  z.coerce
    .number<string>()
    .int({ error: "Use a whole number." })
    .min(min, { error: `${min} at least.` })
    .max(max, { error: `${max} at most.` });

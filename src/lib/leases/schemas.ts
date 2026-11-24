import { z } from "zod";

import { amountCents, isoDate, wholeNumber } from "@/lib/forms/fields";

const RENT_MESSAGE = "Enter a monthly rent, like 1250 or 1250.50.";
const DEPOSIT_MESSAGE = "Enter a deposit, or 0 for none.";

/** Rent is due on day 1 to 28 so every month has the day. */
const dueDay = wholeNumber(1, 28);

const optionalEndDate = z.union([z.literal(""), isoDate("Enter a valid end date.")]).transform(
  (value) => (value === "" ? null : value),
);

export const createLeaseSchema = z
  .object({
    tenantId: z.guid({ error: "Choose a tenant." }),
    startDate: isoDate("Enter a valid start date."),
    endDate: optionalEndDate,
    rent: amountCents({ allowZero: false, message: RENT_MESSAGE }),
    deposit: amountCents({ allowZero: true, message: DEPOSIT_MESSAGE }),
    dueDay,
  })
  .refine((lease) => lease.endDate === null || lease.endDate > lease.startDate, {
    error: "The end date must be after the start date.",
    path: ["endDate"],
  });

/** Unit, tenant and start date are fixed once a lease exists. */
export const updateLeaseSchema = z.object({
  endDate: optionalEndDate,
  rent: amountCents({ allowZero: false, message: RENT_MESSAGE }),
  deposit: amountCents({ allowZero: true, message: DEPOSIT_MESSAGE }),
  dueDay,
});

export const endLeaseSchema = z.object({
  endDate: isoDate("Enter a valid end date."),
});

export type CreateLeaseInput = z.input<typeof createLeaseSchema>;
export type CreateLeaseOutput = z.output<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.input<typeof updateLeaseSchema>;
export type UpdateLeaseOutput = z.output<typeof updateLeaseSchema>;

import type { Database } from "@/lib/supabase/database.types";

type ChargeStatus = Database["public"]["Enums"]["rent_charge_status"];

export type ChargeRow = { periodMonth: string; amountCents: number; status: ChargeStatus };

export type MonthCollection = { month: string; billedCents: number; collectedCents: number };

/** The first day of each of the `count` months ending with the month of `today`, oldest first. */
export function monthsEnding(today: Date, count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const month = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (count - 1 - index), 1));
    return month.toISOString().slice(0, 10);
  });
}

/** Rent billed and collected per month. Months with no charges show as zero. */
export function collectionByMonth(charges: ChargeRow[], months: string[]): MonthCollection[] {
  return months.map((month) => {
    const inMonth = charges.filter((charge) => charge.periodMonth === month);
    return {
      month,
      billedCents: inMonth.reduce((total, charge) => total + charge.amountCents, 0),
      collectedCents: inMonth
        .filter((charge) => charge.status === "paid")
        .reduce((total, charge) => total + charge.amountCents, 0),
    };
  });
}

/** Whole percent, 0 when there is nothing to divide by. */
export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}

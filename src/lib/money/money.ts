const AMOUNT_PATTERN = /^\d{1,7}(\.\d{1,2})?$/;

/** "1250" or "1250.5" or "1250.50" to 125050 cents. Null if not a valid amount. */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, "");
  if (!AMOUNT_PATTERN.test(trimmed)) return null;
  const [whole, fraction = ""] = trimmed.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}

/** 125050 to "1250.50", for prefilling forms. */
export function centsToAmountInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function formatCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(cents / 100);
}

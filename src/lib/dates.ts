const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

/** "2026-12-01" to "1 Dec 2026". Dates are calendar days, so format in UTC. */
export function formatIsoDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

const monthFormat = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-12-01" to "December 2026", for rent periods. */
export function formatIsoMonth(isoDate: string): string {
  return monthFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

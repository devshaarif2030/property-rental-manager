import { formatCents } from "@/lib/money/money";
import { percent, type MonthCollection } from "@/lib/dashboard/summary";

const monthLabel = new Intl.DateTimeFormat("en-GB", { month: "short", timeZone: "UTC" });
const monthLong = new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" });

type CollectionChartProps = { months: MonthCollection[]; currency: string };

/**
 * Rent billed (hatched track) and collected (solid fill) per month, on one
 * shared scale. Hover shows the numbers; a table carries them for screen readers.
 */
export function CollectionChart({ months, currency }: CollectionChartProps) {
  const maxBilled = Math.max(1, ...months.map((month) => month.billedCents));
  const latest = months.at(-1);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-2.5 rounded-sm bg-brand-600" /> Collected
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="bg-hatched size-2.5 rounded-sm" /> Billed
        </span>
      </div>
      <div aria-hidden className="grid h-48 grid-cols-6 items-end gap-3 sm:gap-5">
        {months.map((month) => {
          const date = new Date(`${month.month}T00:00:00Z`);
          const isLatest = month === latest;
          return (
            <div
              key={month.month}
              className="group relative flex h-full flex-col items-center justify-end gap-2"
              title={`${monthLong.format(date)}: ${formatCents(month.collectedCents, currency)} collected of ${formatCents(month.billedCents, currency)} billed`}
            >
              {isLatest && month.billedCents > 0 && (
                <span className="rounded-full border border-border bg-card px-2 py-0.5 text-[11px] font-semibold">
                  {percent(month.collectedCents, month.billedCents)}%
                </span>
              )}
              <div
                className="bg-hatched relative flex w-full max-w-14 flex-col justify-end overflow-hidden rounded-full"
                style={{ height: `${Math.max(6, (month.billedCents / maxBilled) * 100)}%` }}
              >
                <div
                  className="animate-grow-up w-full origin-bottom rounded-full bg-gradient-to-t from-brand-900 to-brand-600 transition-opacity group-hover:opacity-90"
                  style={{ height: `${month.billedCents === 0 ? 0 : (month.collectedCents / month.billedCents) * 100}%` }}
                />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{monthLabel.format(date)}</span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>Rent billed and collected by month</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Billed</th>
            <th scope="col">Collected</th>
          </tr>
        </thead>
        <tbody>
          {months.map((month) => (
            <tr key={month.month}>
              <th scope="row">{monthLong.format(new Date(`${month.month}T00:00:00Z`))}</th>
              <td>{formatCents(month.billedCents, currency)}</td>
              <td>{formatCents(month.collectedCents, currency)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

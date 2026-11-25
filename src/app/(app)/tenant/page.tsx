import Link from "next/link";

import { TestModeNotice } from "@/components/test-mode-notice";
import { requireRole } from "@/lib/auth/session";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money/money";
import {
  getTenantLease,
  listOpenCharges,
  listPaymentHistory,
  type OpenCharge,
  type PaymentHistoryRow,
  type TenantLease,
} from "@/lib/payments/queries";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

import { PayButton } from "./pay-button";

function LeaseCard({ lease, currency }: { lease: TenantLease | null; currency: string }) {
  if (!lease) {
    return <p className="text-sm text-muted-foreground">You have no active lease. Your manager will set one up.</p>;
  }
  return (
    <div className="flex flex-col gap-3 rounded-md border p-4 text-sm">
      <div>
        <p className="font-medium">
          {lease.propertyName}, {lease.unitLabel}
        </p>
        <p className="text-muted-foreground">{lease.propertyAddress}</p>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div>
          <dt className="text-muted-foreground">Rent</dt>
          <dd>
            {formatCents(lease.rentAmountCents, currency)} a month, due on day {lease.dueDay}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Period</dt>
          <dd>
            {formatIsoDate(lease.startDate)} to {lease.endDate ? formatIsoDate(lease.endDate) : "rolling"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Signed lease</dt>
          <dd>
            {lease.hasDocument ? (
              <a
                href={`/leases/${lease.id}/document`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium underline underline-offset-4"
              >
                View PDF
              </a>
            ) : (
              "Not uploaded yet"
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function RentToPay({ charges, currency }: { charges: OpenCharge[]; currency: string }) {
  if (charges.length === 0) return <p className="text-sm text-muted-foreground">You are all paid up.</p>;
  return (
    <ul className="divide-y rounded-md border">
      {charges.map((charge) => (
        <li key={charge.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
          <div className="flex flex-col">
            <span className="font-medium">
              {formatIsoMonth(charge.periodMonth)} · {formatCents(charge.amountCents, currency)}
            </span>
            <span className="text-muted-foreground">
              {charge.propertyName}, {charge.unitLabel} ·{" "}
              {charge.status === "overdue" ? (
                <span className="font-medium text-destructive">overdue since {formatIsoDate(charge.dueDate)}</span>
              ) : (
                <>due {formatIsoDate(charge.dueDate)}</>
              )}
            </span>
          </div>
          <PayButton chargeId={charge.id} />
        </li>
      ))}
    </ul>
  );
}

function PaymentHistory({ payments, currency }: { payments: PaymentHistoryRow[]; currency: string }) {
  if (payments.length === 0) return <p className="text-sm text-muted-foreground">No payments yet.</p>;
  return (
    <ul className="divide-y rounded-md border">
      {payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
          <span className="font-medium">Rent, {formatIsoMonth(payment.periodMonth)}</span>
          <span className="flex items-center gap-3 text-muted-foreground">
            {formatCents(payment.amountCents, currency)} · paid {formatIsoDate(payment.paidAt.slice(0, 10))}
            <Link
              href={`/tenant/payments/${payment.sessionId}`}
              className="font-medium text-foreground underline underline-offset-4"
            >
              Receipt
            </Link>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function TenantHomePage() {
  const user = await requireRole(["tenant"], "/tenant");
  const supabase = await createClient();
  const [lease, charges, payments, currency] = await Promise.all([
    getTenantLease(supabase, user.id),
    listOpenCharges(supabase),
    listPaymentHistory(supabase),
    getOrganizationCurrency(supabase, user.orgId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="text-sm text-muted-foreground">Tenant</p>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-muted-foreground">Signed in as {user.fullName}.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Your home</h2>
        <LeaseCard lease={lease} currency={currency} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rent to pay</h2>
        <TestModeNotice />
        <RentToPay charges={charges} currency={currency} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Payment history</h2>
        <PaymentHistory payments={payments} currency={currency} />
      </section>
    </div>
  );
}

import { CalendarDays, CircleCheck, House, Plus, Receipt, Wallet, Wrench } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { RequestList } from "@/components/maintenance/request-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { TestModeNotice } from "@/components/test-mode-notice";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { firstName } from "@/lib/names";
import { listRequests } from "@/lib/maintenance/queries";
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
    return (
      <EmptyState icon={House} title="No active lease" description="Your property manager will set one up for you." />
    );
  }
  return (
    <div className="flex flex-col gap-5 rounded-2xl border border-border/70 bg-card p-5 text-sm shadow-card sm:p-6">
      <div className="flex items-start gap-3">
        <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-accent text-brand-800">
          <House className="size-5" />
        </span>
        <div>
          <p className="text-base font-semibold">
            {lease.propertyName}, {lease.unitLabel}
          </p>
          <p className="text-muted-foreground">{lease.propertyAddress}</p>
        </div>
      </div>
      <dl className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted-foreground">Rent</dt>
          <dd>
            {formatCents(lease.rentAmountCents, currency)} a month, due on day {lease.dueDay}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Period</dt>
          <dd>
            {formatIsoDate(lease.startDate)} to {lease.endDate ? formatIsoDate(lease.endDate) : "rolling"}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Signed lease</dt>
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
  if (charges.length === 0) {
    return <EmptyState icon={CircleCheck} title="You are all paid up" description="New rent charges appear here each month." />;
  }
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      {charges.map((charge) => (
        <li key={charge.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 text-sm">
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
  if (payments.length === 0) {
    return <EmptyState icon={Receipt} title="No payments yet" description="Receipts for paid rent appear here." />;
  }
  return (
    <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
      {payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
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
  const [lease, charges, payments, currency, requests] = await Promise.all([
    getTenantLease(supabase, user.id),
    listOpenCharges(supabase),
    listPaymentHistory(supabase),
    getOrganizationCurrency(supabase, user.orgId),
    listRequests(supabase),
  ]);

  const amountToPayCents = charges.reduce((total, charge) => total + charge.amountCents, 0);
  const overdueCount = charges.filter((charge) => charge.status === "overdue").length;
  const openRequests = requests.filter((request) => request.status !== "done" && request.status !== "cancelled");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Tenant"
        title={`Hello, ${firstName(user.fullName)}`}
        description="Your lease, rent and repairs in one place."
        actions={
          lease && (
            <Button asChild>
              <Link href="/tenant/requests/new">
                <Plus aria-hidden />
                Report a problem
              </Link>
            </Button>
          )
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        <StatCard
          tone="brand"
          className="col-span-2 sm:col-span-1"
          icon={Wallet}
          label="Rent to pay"
          value={formatCents(amountToPayCents, currency)}
          hint={
            charges.length === 0
              ? "You are all paid up."
              : overdueCount > 0
                ? `${overdueCount} overdue. Pay below.`
                : `Next due ${formatIsoDate(charges[0].dueDate)}.`
          }
        />
        <StatCard
          icon={CalendarDays}
          label="Monthly rent"
          value={lease ? formatCents(lease.rentAmountCents, currency) : "None"}
          hint={lease ? `Due on day ${lease.dueDay} of each month.` : "No active lease."}
        />
        <StatCard
          icon={Wrench}
          label="Open repairs"
          value={openRequests.length}
          hint={`${requests.length - openRequests.length} finished so far.`}
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr]">
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Rent to pay</h2>
            <TestModeNotice />
            <RentToPay charges={charges} currency={currency} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Maintenance</h2>
            <RequestList
              requests={requests}
              hrefFor={(requestId) => `/tenant/requests/${requestId}`}
              empty="No maintenance requests yet."
            />
          </section>
        </div>
        <div className="flex flex-col gap-8">
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Your home</h2>
            <LeaseCard lease={lease} currency={currency} />
          </section>
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-semibold">Payment history</h2>
            <PaymentHistory payments={payments} currency={currency} />
          </section>
        </div>
      </div>
    </div>
  );
}

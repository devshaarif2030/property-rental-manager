import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { getUnitWithLeases, listLeaseCharges, type LeaseRow, type RentChargeRow } from "@/lib/leases/queries";
import { formatCents } from "@/lib/money/money";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { EndLeaseForm } from "../../../end-lease-form";
import { LeaseDocumentForm } from "../../../lease-document-form";

function DocumentLink({ lease }: { lease: LeaseRow }) {
  if (!lease.hasDocument) return null;
  return (
    <a
      href={`/leases/${lease.id}/document`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-sm font-medium underline underline-offset-4"
    >
      View lease PDF
    </a>
  );
}

const CHARGE_STATUS_STYLES: Record<RentChargeRow["status"], string> = {
  due: "bg-muted text-foreground",
  paid: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  overdue: "bg-destructive/10 text-destructive",
};

function RentCharges({ charges, currency }: { charges: RentChargeRow[]; currency: string }) {
  return (
    <section className="flex flex-col gap-3">
      <div>
        <h2 className="text-lg font-semibold">Rent charges</h2>
        <p className="text-sm text-muted-foreground">
          Created automatically each night for the current month. Unpaid charges turn overdue the day after they
          are due.
        </p>
      </div>
      {charges.length === 0 ? (
        <p className="text-sm text-muted-foreground">No charges yet. The first one appears tonight.</p>
      ) : (
        <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
          {charges.map((charge) => (
            <li key={charge.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-4 text-sm">
              <span className="font-medium">{formatIsoMonth(charge.periodMonth)}</span>
              <span className="flex items-center gap-3 text-muted-foreground">
                {formatCents(charge.amountCents, currency)} · due {formatIsoDate(charge.dueDate)}
                <span className={`rounded px-2 py-0.5 text-xs font-medium capitalize ${CHARGE_STATUS_STYLES[charge.status]}`}>
                  {charge.status}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function leasePeriod(lease: LeaseRow): string {
  return `${formatIsoDate(lease.startDate)} to ${lease.endDate ? formatIsoDate(lease.endDate) : "rolling"}`;
}

export default async function UnitPage({ params }: PageProps<"/manager/properties/[propertyId]/units/[unitId]">) {
  const { propertyId, unitId } = await params;
  const user = await requireRole(["admin", "manager"], `/manager/properties/${propertyId}/units/${unitId}`);
  if (!idSchema.safeParse(unitId).success) notFound();

  const supabase = await createClient();
  const [unit, currency] = await Promise.all([
    getUnitWithLeases(supabase, unitId),
    getOrganizationCurrency(supabase, user.orgId),
  ]);
  if (!unit || unit.propertyId !== propertyId) notFound();

  const basePath = `/manager/properties/${propertyId}/units/${unitId}`;
  const lease = unit.activeLease;
  const charges = lease ? await listLeaseCharges(supabase, lease.id) : [];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/manager/properties/${propertyId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {unit.propertyName}
        </Link>
        <h1 className="text-3xl font-bold">{unit.label}</h1>
        <p className="text-muted-foreground">
          {unit.bedrooms} bed, {unit.bathrooms} bath · {formatCents(unit.rentAmountCents, currency)} a month ·{" "}
          <span className="capitalize">{unit.status}</span>
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Current lease</h2>
        {lease ? (
          <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card shadow-card p-5">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Tenant</dt>
                <dd className="font-medium">{lease.tenantName}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Period</dt>
                <dd>{leasePeriod(lease)}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Rent</dt>
                <dd>
                  {formatCents(lease.rentAmountCents, currency)}, due on day {lease.dueDay}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Deposit</dt>
                <dd>{formatCents(lease.depositAmountCents, currency)}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-muted-foreground">Signed lease</dt>
                <dd>{lease.hasDocument ? <DocumentLink lease={lease} /> : "Not uploaded yet"}</dd>
              </div>
            </dl>
            <LeaseDocumentForm leaseId={lease.id} hasDocument={lease.hasDocument} />
            <div className="flex flex-wrap items-start gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`${basePath}/leases/${lease.id}/edit`}>Edit terms</Link>
              </Button>
              <EndLeaseForm leaseId={lease.id} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-dashed bg-card/60 p-6">
            <p className="text-sm text-muted-foreground">This unit is vacant.</p>
            <Button asChild size="sm">
              <Link href={`${basePath}/leases/new`}>Create lease</Link>
            </Button>
          </div>
        )}
      </section>

      {lease && <RentCharges charges={charges} currency={currency} />}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Past leases</h2>
        {unit.pastLeases.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y divide-border/70 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card">
            {unit.pastLeases.map((pastLease) => (
              <li key={pastLease.id} className="flex flex-col gap-1 px-5 py-4 text-sm sm:flex-row sm:justify-between">
                <span className="font-medium">{pastLease.tenantName}</span>
                <span className="flex flex-wrap gap-3 text-muted-foreground">
                  {leasePeriod(pastLease)} · {formatCents(pastLease.rentAmountCents, currency)}
                  <DocumentLink lease={pastLease} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

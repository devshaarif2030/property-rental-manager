import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatIsoDate } from "@/lib/dates";
import { getUnitWithLeases, type LeaseRow } from "@/lib/leases/queries";
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

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link
          href={`/manager/properties/${propertyId}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          {unit.propertyName}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{unit.label}</h1>
        <p className="text-muted-foreground">
          {unit.bedrooms} bed, {unit.bathrooms} bath · {formatCents(unit.rentAmountCents, currency)} a month ·{" "}
          <span className="capitalize">{unit.status}</span>
        </p>
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Current lease</h2>
        {lease ? (
          <div className="flex flex-col gap-4 rounded-md border p-4">
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
          <div className="flex flex-col items-start gap-3 rounded-md border border-dashed p-6">
            <p className="text-sm text-muted-foreground">This unit is vacant.</p>
            <Button asChild size="sm">
              <Link href={`${basePath}/leases/new`}>Create lease</Link>
            </Button>
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Past leases</h2>
        {unit.pastLeases.length === 0 ? (
          <p className="text-sm text-muted-foreground">None yet.</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {unit.pastLeases.map((pastLease) => (
              <li key={pastLease.id} className="flex flex-col gap-1 px-4 py-3 text-sm sm:flex-row sm:justify-between">
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

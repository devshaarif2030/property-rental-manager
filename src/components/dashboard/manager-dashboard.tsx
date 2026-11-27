import { AlertTriangle, ArrowRight, Building2, CircleCheck, DoorOpen, Inbox, Plus, Wallet } from "lucide-react";
import Link from "next/link";

import { CollectionChart } from "@/components/dashboard/collection-chart";
import { EmptyState } from "@/components/empty-state";
import { RequestList } from "@/components/maintenance/request-list";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { CurrentUser } from "@/lib/auth/session";
import { getOccupancy, listChargesSince, listOverdueCharges } from "@/lib/dashboard/queries";
import { collectionByMonth, monthsEnding, percent } from "@/lib/dashboard/summary";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { listRequests } from "@/lib/maintenance/queries";
import { formatCents } from "@/lib/money/money";
import { firstName } from "@/lib/names";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

const CHART_MONTHS = 6;

/** Portfolio overview for managers and admins: rent, occupancy, arrears and repairs. */
export async function ManagerDashboard({ user }: { user: CurrentUser }) {
  const supabase = await createClient();
  const months = monthsEnding(new Date(), CHART_MONTHS);
  const [occupancy, charges, overdue, requests, currency] = await Promise.all([
    getOccupancy(supabase),
    listChargesSince(supabase, months[0]),
    listOverdueCharges(supabase),
    listRequests(supabase),
    getOrganizationCurrency(supabase, user.orgId),
  ]);

  const collection = collectionByMonth(charges, months);
  const thisMonth = collection[collection.length - 1];
  const overdueCents = overdue.reduce((total, charge) => total + charge.amountCents, 0);
  const toTriage = requests.filter((request) => request.status === "open");
  const active = requests.filter((request) => request.status !== "done" && request.status !== "cancelled");

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow={ROLE_LABELS[user.role]}
        title={`Welcome back, ${firstName(user.fullName)}`}
        description="Rent, occupancy and repairs across your portfolio."
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/manager/maintenance">Triage queue</Link>
            </Button>
            <Button asChild>
              <Link href="/manager/properties/new">
                <Plus aria-hidden />
                Add property
              </Link>
            </Button>
          </>
        }
      />

      <div className="stagger grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard
          tone="brand"
          className="col-span-2 xl:col-span-1"
          icon={Wallet}
          label={`Collected in ${formatIsoMonth(thisMonth.month).split(" ")[0]}`}
          value={formatCents(thisMonth.collectedCents, currency)}
          hint={`${percent(thisMonth.collectedCents, thisMonth.billedCents)}% of ${formatCents(thisMonth.billedCents, currency)} billed`}
        />
        <StatCard
          icon={DoorOpen}
          label="Occupancy"
          value={`${percent(occupancy.occupied, occupancy.total)}%`}
          hint={`${occupancy.occupied} of ${occupancy.total} units let`}
        />
        <StatCard
          icon={AlertTriangle}
          label="Overdue rent"
          value={formatCents(overdueCents, currency)}
          hint={overdue.length === 1 ? "1 charge past due" : `${overdue.length} charges past due`}
        />
        <StatCard
          icon={Inbox}
          label="Needs triage"
          value={toTriage.length}
          hint={`${active.length} repairs open in total`}
        />
      </div>

      <div className="stagger grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Rent collection</CardTitle>
              <CardDescription>Last {CHART_MONTHS} months, paid through Stripe test mode.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <CollectionChart months={collection} currency={currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-1">
              <CardTitle>Overdue rent</CardTitle>
              <CardDescription>Oldest first.</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {overdue.length === 0 ? (
              <EmptyState icon={CircleCheck} title="Nothing overdue" description="Every charge is paid or not yet due." />
            ) : (
              <ul className="flex flex-col gap-3">
                {overdue.slice(0, 5).map((charge) => (
                  <li key={charge.id} className="flex items-center justify-between gap-3 rounded-xl bg-background p-3">
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-sm font-semibold">{charge.tenantName}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {charge.propertyName}, {charge.unitLabel} · due {formatIsoDate(charge.dueDate)}
                      </span>
                    </div>
                    <span className="rounded-full bg-danger-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                      {formatCents(charge.amountCents, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Open repairs</h2>
          <Button asChild variant="ghost" size="sm">
            <Link href="/manager/maintenance">
              All maintenance
              <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
        <RequestList
          requests={active.slice(0, 5)}
          hrefFor={(requestId) => `/manager/maintenance/${requestId}`}
          empty="No open repairs."
        />
      </section>

      {occupancy.total === 0 && (
        <EmptyState
          icon={Building2}
          title="Start with a property"
          description="Add a property and its units, then create leases to start billing rent."
          action={
            <Button asChild>
              <Link href="/manager/properties/new">Add property</Link>
            </Button>
          }
        />
      )}
    </div>
  );
}

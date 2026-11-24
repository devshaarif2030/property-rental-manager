import { TestModeNotice } from "@/components/test-mode-notice";
import { requireRole } from "@/lib/auth/session";
import { formatIsoDate, formatIsoMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money/money";
import { listOpenCharges } from "@/lib/payments/queries";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

import { PayButton } from "./pay-button";

export default async function TenantHomePage() {
  const user = await requireRole(["tenant"], "/tenant");
  const supabase = await createClient();
  const [charges, currency] = await Promise.all([
    listOpenCharges(supabase),
    getOrganizationCurrency(supabase, user.orgId),
  ]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Tenant</p>
        <h1 className="text-2xl font-semibold tracking-tight">Home</h1>
        <p className="text-muted-foreground">Signed in as {user.fullName}.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Rent to pay</h2>
        <TestModeNotice />
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">You are all paid up.</p>
        ) : (
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
        )}
      </section>
    </div>
  );
}

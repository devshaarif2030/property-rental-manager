import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { formatIsoDate } from "@/lib/dates";
import { getLease } from "@/lib/leases/queries";
import { centsToAmountInput } from "@/lib/money/money";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { EditLeaseForm } from "../../../../../../lease-form";

export default async function EditLeasePage({
  params,
}: PageProps<"/manager/properties/[propertyId]/units/[unitId]/leases/[leaseId]/edit">) {
  const { propertyId, unitId, leaseId } = await params;
  await requireRole(
    ["admin", "manager"],
    `/manager/properties/${propertyId}/units/${unitId}/leases/${leaseId}/edit`,
  );
  if (!idSchema.safeParse(leaseId).success) notFound();

  const lease = await getLease(await createClient(), leaseId);
  if (!lease || lease.unitId !== unitId || lease.propertyId !== propertyId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold">Edit lease terms</h1>
        <p className="text-muted-foreground">
          {lease.tenantName}, {lease.unitLabel}, from {formatIsoDate(lease.startDate)}. To change the
          tenant or start date, end this lease and create a new one.
        </p>
      </div>
      <EditLeaseForm
        leaseId={lease.id}
        defaultValues={{
          endDate: lease.endDate ?? "",
          rent: centsToAmountInput(lease.rentAmountCents),
          deposit: centsToAmountInput(lease.depositAmountCents),
          dueDay: String(lease.dueDay),
        }}
      />
    </div>
  );
}

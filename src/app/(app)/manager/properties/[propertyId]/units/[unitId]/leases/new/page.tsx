import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getUnitWithLeases, listTenantOptions } from "@/lib/leases/queries";
import { centsToAmountInput } from "@/lib/money/money";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { CreateLeaseForm } from "../../../../../lease-form";

export default async function NewLeasePage({
  params,
}: PageProps<"/manager/properties/[propertyId]/units/[unitId]/leases/new">) {
  const { propertyId, unitId } = await params;
  await requireRole(["admin", "manager"], `/manager/properties/${propertyId}/units/${unitId}/leases/new`);
  if (!idSchema.safeParse(unitId).success) notFound();

  const supabase = await createClient();
  const [unit, tenants] = await Promise.all([getUnitWithLeases(supabase, unitId), listTenantOptions(supabase)]);
  if (!unit || unit.propertyId !== propertyId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        New lease for {unit.label}, {unit.propertyName}
      </h1>
      {unit.activeLease ? (
        <p className="text-sm text-muted-foreground">
          This unit already has an active lease with {unit.activeLease.tenantName}. End it first.
        </p>
      ) : (
        <CreateLeaseForm unitId={unit.id} tenants={tenants} defaultRent={centsToAmountInput(unit.rentAmountCents)} />
      )}
    </div>
  );
}

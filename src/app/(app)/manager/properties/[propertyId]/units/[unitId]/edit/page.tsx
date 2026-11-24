import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { centsToAmountInput } from "@/lib/money/money";
import { getUnit } from "@/lib/properties/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { UnitForm } from "../../../../unit-form";

export default async function EditUnitPage({
  params,
}: PageProps<"/manager/properties/[propertyId]/units/[unitId]/edit">) {
  const { propertyId, unitId } = await params;
  await requireRole(["admin", "manager"], `/manager/properties/${propertyId}/units/${unitId}/edit`);
  if (!idSchema.safeParse(unitId).success) notFound();

  const unit = await getUnit(await createClient(), unitId);
  if (!unit || unit.property_id !== propertyId) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        Edit {unit.label}, {unit.properties.name}
      </h1>
      <UnitForm
        mode="edit"
        unitId={unit.id}
        defaultValues={{
          label: unit.label,
          bedrooms: String(unit.bedrooms),
          bathrooms: String(unit.bathrooms),
          rent: centsToAmountInput(unit.rent_amount_cents),
        }}
      />
    </div>
  );
}

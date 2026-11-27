import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getPropertyDetail } from "@/lib/properties/queries";
import { idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { UnitForm } from "../../../unit-form";

export default async function NewUnitPage({ params }: PageProps<"/manager/properties/[propertyId]/units/new">) {
  const { propertyId } = await params;
  await requireRole(["admin", "manager"], `/manager/properties/${propertyId}/units/new`);
  if (!idSchema.safeParse(propertyId).success) notFound();

  const property = await getPropertyDetail(await createClient(), propertyId);
  if (!property) notFound();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Add a unit to {property.name}</h1>
      <UnitForm mode="create" propertyId={property.id} />
    </div>
  );
}

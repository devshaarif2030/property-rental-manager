import { notFound } from "next/navigation";

import { requireRole } from "@/lib/auth/session";
import { getPropertyDetail } from "@/lib/properties/queries";
import { idSchema, type PropertyInput } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { PropertyForm } from "../../property-form";

export default async function EditPropertyPage({ params }: PageProps<"/manager/properties/[propertyId]/edit">) {
  const { propertyId } = await params;
  await requireRole(["admin", "manager"], `/manager/properties/${propertyId}/edit`);
  if (!idSchema.safeParse(propertyId).success) notFound();

  const property = await getPropertyDetail(await createClient(), propertyId);
  if (!property) notFound();

  const defaultValues: PropertyInput = {
    name: property.name,
    addressLine: property.addressLine,
    city: property.city,
    postcode: property.postcode,
    country: property.country === "US" ? "US" : "GB",
  };

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit {property.name}</h1>
      <PropertyForm mode="edit" propertyId={property.id} defaultValues={defaultValues} />
    </div>
  );
}

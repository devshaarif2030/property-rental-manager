import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatCents } from "@/lib/money/money";
import { getOrganizationCurrency, getPropertyDetail } from "@/lib/properties/queries";
import { COUNTRIES, idSchema } from "@/lib/properties/schemas";
import { createClient } from "@/lib/supabase/server";

import { deleteProperty, deleteUnit } from "../actions";
import { DeleteButton } from "../delete-button";

export default async function PropertyPage({ params }: PageProps<"/manager/properties/[propertyId]">) {
  const { propertyId } = await params;
  const user = await requireRole(["admin", "manager"], `/manager/properties/${propertyId}`);
  if (!idSchema.safeParse(propertyId).success) notFound();

  const supabase = await createClient();
  const [property, currency] = await Promise.all([
    getPropertyDetail(supabase, propertyId),
    getOrganizationCurrency(supabase, user.orgId),
  ]);
  if (!property) notFound();

  const basePath = `/manager/properties/${property.id}`;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link href="/manager/properties" className="text-sm font-medium text-brand-600 hover:text-brand-900">
            ← Properties
          </Link>
          <h1 className="text-3xl font-semibold">{property.name}</h1>
          <p className="text-muted-foreground">
            {property.addressLine}, {property.city} {property.postcode},{" "}
            {COUNTRIES[property.country as keyof typeof COUNTRIES]}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`${basePath}/edit`}>Edit</Link>
          </Button>
          <DeleteButton label="Delete property" onDelete={deleteProperty.bind(null, property.id)} />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Units</h2>
          <Button asChild size="sm">
            <Link href={`${basePath}/units/new`}>Add unit</Link>
          </Button>
        </div>

        {property.units.length === 0 ? (
          <p className="rounded-2xl border border-dashed bg-card/60 p-8 text-center text-sm text-muted-foreground">
            No units yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-border/70 bg-card shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-muted text-left text-muted-foreground">
                <tr>
                  <th className="px-4 py-2 font-medium">Unit</th>
                  <th className="px-4 py-2 font-medium">Beds / baths</th>
                  <th className="px-4 py-2 font-medium">Rent</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Tenant</th>
                  <th className="px-4 py-2">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {property.units.map((unit) => (
                  <tr key={unit.id}>
                    <td className="px-5 py-4 font-medium">
                      <Link href={`${basePath}/units/${unit.id}`} className="underline-offset-4 hover:underline">
                        {unit.label}
                      </Link>
                    </td>
                    <td className="px-5 py-4">
                      {unit.bedrooms} / {unit.bathrooms}
                    </td>
                    <td className="px-5 py-4">{formatCents(unit.rentAmountCents, currency)}</td>
                    <td className="px-5 py-4 capitalize">{unit.status}</td>
                    <td className="px-5 py-4">{unit.currentTenantName ?? "None"}</td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`${basePath}/units/${unit.id}/edit`}>Edit</Link>
                        </Button>
                        <DeleteButton label="Delete" onDelete={deleteUnit.bind(null, unit.id)} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

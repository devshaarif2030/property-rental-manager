import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listProperties } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Properties · Property Rental Manager" };

export default async function PropertiesPage() {
  await requireRole(["admin", "manager"], "/manager/properties");
  const properties = await listProperties(await createClient());

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold tracking-tight">Properties</h1>
        <Button asChild>
          <Link href="/manager/properties/new">Add property</Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          No properties yet. Add your first one to start adding units.
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {properties.map((property) => (
            <li key={property.id}>
              <Link
                href={`/manager/properties/${property.id}`}
                className="flex flex-col gap-1 px-4 py-3 hover:bg-muted sm:flex-row sm:items-center sm:justify-between"
              >
                <span>
                  <span className="font-medium">{property.name}</span>
                  <span className="block text-sm text-muted-foreground">
                    {property.addressLine}, {property.city} {property.postcode}
                  </span>
                </span>
                <span className="text-sm text-muted-foreground">
                  {property.unitCount === 0
                    ? "No units"
                    : `${property.occupiedCount} of ${property.unitCount} units occupied`}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

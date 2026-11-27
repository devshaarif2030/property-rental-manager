import { Building2, DoorOpen, MapPin, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { listProperties } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Properties · Property Rental Manager" };

export default async function PropertiesPage() {
  await requireRole(["admin", "manager"], "/manager/properties");
  const properties = await listProperties(await createClient());

  return (
    <div className="flex flex-col gap-8">
      <PageHeader
        eyebrow="Property manager"
        title="Properties"
        description="Every building you manage, with how many units are let."
        actions={
          <Button asChild>
            <Link href="/manager/properties/new">
              <Plus aria-hidden />
              Add property
            </Link>
          </Button>
        }
      />

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start adding units and leases."
        />
      ) : (
        <ul className="stagger grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => {
            const occupancy = property.unitCount === 0 ? 0 : property.occupiedCount / property.unitCount;
            return (
              <li key={property.id}>
                <Link
                  href={`/manager/properties/${property.id}`}
                  className="group hover-lift flex h-full flex-col overflow-hidden rounded-2xl border border-border/70 bg-card shadow-card hover:shadow-lg"
                >
                  <div className="bg-brand-gradient relative flex h-28 items-end p-4">
                    <span className="glass flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold text-white">
                      <DoorOpen className="size-3.5" aria-hidden />
                      {property.unitCount === 1 ? "1 unit" : `${property.unitCount} units`}
                    </span>
                    <Building2
                      aria-hidden
                      className="absolute top-4 right-4 size-10 text-white/25 transition-transform group-hover:scale-110"
                    />
                  </div>
                  <div className="flex flex-1 flex-col gap-4 p-5">
                    <div>
                      <p className="text-lg font-semibold">{property.name}</p>
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <MapPin className="size-3.5" aria-hidden />
                        {property.addressLine}, {property.city} {property.postcode}
                      </p>
                    </div>
                    <div className="mt-auto flex flex-col gap-2">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-muted-foreground">Occupancy</span>
                        <span>
                          {property.unitCount === 0
                            ? "No units"
                            : `${property.occupiedCount} of ${property.unitCount} let`}
                        </span>
                      </div>
                      <div
                        role="meter"
                        aria-label={`${property.name} occupancy`}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-valuenow={Math.round(occupancy * 100)}
                        className="h-2 overflow-hidden rounded-full bg-muted"
                      >
                        <div
                          className="h-full rounded-full bg-brand-600"
                          style={{ width: `${Math.round(occupancy * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

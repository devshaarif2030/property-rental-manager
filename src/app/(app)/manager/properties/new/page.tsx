import type { Metadata } from "next";

import { requireRole } from "@/lib/auth/session";

import { PropertyForm } from "../property-form";

export const metadata: Metadata = { title: "Add property · Property Rental Manager" };

export default async function NewPropertyPage() {
  await requireRole(["admin", "manager"], "/manager/properties/new");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-3xl font-semibold">Add property</h1>
      <PropertyForm mode="create" />
    </div>
  );
}

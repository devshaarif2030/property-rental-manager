import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getPropertyDetail, getUnit, listProperties } from "@/lib/properties/queries";
import type { Database } from "@/lib/supabase/database.types";

// Runs against a local Supabase stack started with `pnpm db:start`.
// Exercises the same queries the property pages use, as real signed-in users.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SEED_ORG_ID = "10000000-0000-0000-0000-000000000001";

async function signedInAs(email: string) {
  const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "demo-password" });
  if (error) throw error;
  return { supabase, userId: data.user.id };
}

describe("properties and units", () => {
  it("a manager creates a property with units and reads them back", async () => {
    const { supabase, userId } = await signedInAs("manager@demo.test");
    const name = `Test House ${Date.now()}`;

    const { data: property, error: propertyError } = await supabase
      .from("properties")
      .insert({
        org_id: SEED_ORG_ID,
        name,
        address_line: "5 Test Road",
        city: "Leeds",
        postcode: "LS2 2BB",
        country: "GB",
        manager_id: userId,
      })
      .select("id")
      .single();
    expect(propertyError).toBeNull();

    const { error: unitsError } = await supabase.from("units").insert([
      { org_id: SEED_ORG_ID, property_id: property!.id, label: "Flat 2", rent_amount_cents: 95000 },
      { org_id: SEED_ORG_ID, property_id: property!.id, label: "Flat 1", rent_amount_cents: 120000 },
    ]);
    expect(unitsError).toBeNull();

    const summaries = await listProperties(supabase);
    const summary = summaries.find((item) => item.id === property!.id);
    expect(summary).toMatchObject({ name, unitCount: 2, occupiedCount: 0 });

    const detail = await getPropertyDetail(supabase, property!.id);
    expect(detail?.units.map((unit) => unit.label)).toEqual(["Flat 1", "Flat 2"]);
    expect(detail?.units[0]).toMatchObject({ rentAmountCents: 120000, status: "vacant", currentTenantName: null });

    const unit = await getUnit(supabase, detail!.units[0].id);
    expect(unit?.properties.name).toBe(name);
  });

  it("rejects a duplicate unit label in the same property", async () => {
    const { supabase, userId } = await signedInAs("manager@demo.test");
    const { data: property } = await supabase
      .from("properties")
      .insert({
        org_id: SEED_ORG_ID,
        name: `Dup House ${Date.now()}`,
        address_line: "6 Test Road",
        city: "Leeds",
        postcode: "LS2 2BB",
        country: "GB",
        manager_id: userId,
      })
      .select("id")
      .single();
    const unit = { org_id: SEED_ORG_ID, property_id: property!.id, label: "Flat 1", rent_amount_cents: 1000 };

    await supabase.from("units").insert(unit);
    const { error } = await supabase.from("units").insert(unit);
    expect(error?.code).toBe("23505");
  });

  it("tenants and staff cannot create properties", async () => {
    for (const email of ["tenant@demo.test", "staff@demo.test"]) {
      const { supabase, userId } = await signedInAs(email);
      const { error } = await supabase.from("properties").insert({
        org_id: SEED_ORG_ID,
        name: "Not allowed",
        address_line: "7 Test Road",
        city: "Leeds",
        postcode: "LS2 2BB",
        country: "GB",
        manager_id: userId,
      });
      expect(error).not.toBeNull();
    }
  });

  it("a tenant without a lease sees no properties", async () => {
    const { supabase } = await signedInAs("tenant@demo.test");
    expect(await listProperties(supabase)).toEqual([]);
  });
});

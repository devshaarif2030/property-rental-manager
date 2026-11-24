import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";

import { getLease, getUnitWithLeases, listTenantOptions } from "@/lib/leases/queries";
import type { Database } from "@/lib/supabase/database.types";

// Runs against a local Supabase stack started with `pnpm db:start`.
// Exercises the lease queries and database rules as real signed-in users.

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";
const SEED_ORG_ID = "10000000-0000-0000-0000-000000000001";
const SEED_TENANT_ID = "10000000-0000-0000-0000-0000000000a3";
const SEED_STAFF_ID = "10000000-0000-0000-0000-0000000000a4";

async function signedInAs(email: string) {
  const supabase = createClient<Database>(SUPABASE_URL, PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.signInWithPassword({ email, password: "demo-password" });
  if (error) throw error;
  return { supabase, userId: data.user.id };
}

async function createVacantUnit() {
  const { supabase, userId } = await signedInAs("manager@demo.test");
  const { data: property } = await supabase
    .from("properties")
    .insert({
      org_id: SEED_ORG_ID,
      name: `Lease House ${Date.now()}`,
      address_line: "9 Lease Lane",
      city: "York",
      postcode: "YO1 1AA",
      country: "GB",
      manager_id: userId,
    })
    .select("id")
    .single();
  const { data: unit } = await supabase
    .from("units")
    .insert({ org_id: SEED_ORG_ID, property_id: property!.id, label: "Flat 1", rent_amount_cents: 110000 })
    .select("id")
    .single();
  return { supabase, unitId: unit!.id };
}

function leaseFor(unitId: string, tenantId: string) {
  return {
    org_id: SEED_ORG_ID,
    unit_id: unitId,
    tenant_id: tenantId,
    start_date: "2026-12-01",
    rent_amount_cents: 110000,
    deposit_amount_cents: 110000,
    due_day: 1,
  };
}

describe("leases", () => {
  it("creating and ending a lease moves the unit between occupied and vacant", async () => {
    const { supabase, unitId } = await createVacantUnit();

    const { data: lease, error } = await supabase
      .from("leases")
      .insert(leaseFor(unitId, SEED_TENANT_ID))
      .select("id")
      .single();
    expect(error).toBeNull();

    const occupied = await getUnitWithLeases(supabase, unitId);
    expect(occupied?.status).toBe("occupied");
    expect(occupied?.activeLease).toMatchObject({ tenantName: "Taylor Tenant", dueDay: 1 });

    const { error: secondError } = await supabase.from("leases").insert(leaseFor(unitId, SEED_TENANT_ID));
    expect(secondError?.code).toBe("23505");

    await supabase.from("leases").update({ status: "ended", end_date: "2027-05-31" }).eq("id", lease!.id);
    const vacant = await getUnitWithLeases(supabase, unitId);
    expect(vacant?.status).toBe("vacant");
    expect(vacant?.activeLease).toBeNull();
    expect(vacant?.pastLeases.map((past) => past.id)).toEqual([lease!.id]);

    const loaded = await getLease(supabase, lease!.id);
    expect(loaded).toMatchObject({ unitId, unitLabel: "Flat 1", endDate: "2027-05-31" });
  });

  it("rejects a staff member as tenant", async () => {
    const { supabase, unitId } = await createVacantUnit();
    const { error } = await supabase.from("leases").insert(leaseFor(unitId, SEED_STAFF_ID));
    expect(error?.code).toBe("23514");
  });

  it("lists only tenants as lease options", async () => {
    const { supabase } = await signedInAs("manager@demo.test");
    const tenants = await listTenantOptions(supabase);
    expect(tenants.map((tenant) => tenant.id)).toContain(SEED_TENANT_ID);
    expect(tenants.map((tenant) => tenant.id)).not.toContain(SEED_STAFF_ID);
  });

  it("the tenant reads their own lease and unit", async () => {
    const { supabase: manager, unitId } = await createVacantUnit();
    await manager.from("leases").insert(leaseFor(unitId, SEED_TENANT_ID));

    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    const unit = await getUnitWithLeases(tenant, unitId);
    expect(unit?.activeLease?.tenantName).toBe("Taylor Tenant");
  });
});

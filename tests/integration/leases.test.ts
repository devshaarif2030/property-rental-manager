import { describe, expect, it } from "vitest";

import { getLease, getUnitWithLeases, listTenantOptions } from "@/lib/leases/queries";

import { createVacantUnit, leaseFor, SEED_STAFF_ID, SEED_TENANT_ID, signedInAs } from "./helpers";

// Runs against a local Supabase stack started with `pnpm db:start`.
// Exercises the lease queries and database rules as real signed-in users.

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

import { describe, expect, it } from "vitest";

import { countUnreadNotifications, listNotifications } from "@/lib/notifications/queries";

import { createVacantUnit, leaseFor, SEED_ORG_ID, SEED_STAFF_ID, SEED_TENANT_ID, signedInAs } from "./helpers";

// Runs against a local Supabase stack. A tenant reports a request and the
// manager assigns it; the staff member then finds the job in their list.

async function assignedRequest() {
  const { supabase: manager, unitId } = await createVacantUnit();
  const { error: leaseError } = await manager.from("leases").insert(leaseFor(unitId, SEED_TENANT_ID));
  if (leaseError) throw leaseError;

  const { supabase: tenant } = await signedInAs("tenant@demo.test");
  const title = `Notify test ${crypto.randomUUID().slice(0, 8)}`;
  const { data: request, error } = await tenant
    .from("maintenance_requests")
    .insert({ org_id: SEED_ORG_ID, unit_id: unitId, tenant_id: SEED_TENANT_ID, title, description: "Broken." })
    .select("id")
    .single();
  if (error) throw error;

  const { error: triageError } = await manager.rpc("triage_request", {
    p_request_id: request.id,
    p_category: "other",
    p_priority: "normal",
    p_assigned_to: SEED_STAFF_ID,
  });
  if (triageError) throw triageError;
  return { requestId: request.id, title, tenant };
}

describe("notifications", () => {
  it("tells the staff member about a new job and lets them mark it read", async () => {
    const { requestId, title } = await assignedRequest();
    const { supabase: staff } = await signedInAs("staff@demo.test");

    const list = await listNotifications(staff);
    const job = list.find((notification) => notification.link === `/staff/jobs/${requestId}`);
    expect(job).toMatchObject({ title: `New job: "${title}"`, read: false });
    const unreadBefore = await countUnreadNotifications(staff);
    expect(unreadBefore).toBeGreaterThan(0);

    const { error } = await staff.from("notifications").update({ read_at: new Date().toISOString() }).eq("id", job!.id);
    expect(error).toBeNull();
    expect(await countUnreadNotifications(staff)).toBe(unreadBefore - 1);
  });

  it("tells the tenant their request was assigned", async () => {
    const { requestId, title, tenant } = await assignedRequest();
    const list = await listNotifications(tenant);
    expect(list.find((notification) => notification.link === `/tenant/requests/${requestId}`)?.title).toBe(
      `"${title}" is assigned to a technician`,
    );
  });

  it("does not let one user read or change another's notifications", async () => {
    const { requestId } = await assignedRequest();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    const { data } = await tenant.from("notifications").select("id").eq("link", `/staff/jobs/${requestId}`);
    expect(data).toEqual([]);

    const { data: updated } = await tenant
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("link", `/staff/jobs/${requestId}`)
      .select("id");
    expect(updated).toEqual([]);
  });
});

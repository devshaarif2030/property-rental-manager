import { describe, expect, it } from "vitest";

import { REQUEST_PHOTOS_BUCKET, requestPhotoPath } from "@/lib/maintenance/photos";

import { createVacantUnit, leaseFor, SEED_ORG_ID, SEED_TENANT_ID, signedInAs } from "./helpers";

// Runs against a local Supabase stack with Storage. Reports a request with a
// photo as the seeded tenant, the way createMaintenanceRequest does, and checks
// who can see the photo.

const SAMPLE_JPEG = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46])], {
  type: "image/jpeg",
});

async function reportedRequest() {
  const { supabase: manager, unitId } = await createVacantUnit();
  const { error: leaseError } = await manager.from("leases").insert(leaseFor(unitId, SEED_TENANT_ID));
  if (leaseError) throw leaseError;

  const { supabase: tenant, userId } = await signedInAs("tenant@demo.test");
  const { data: request, error } = await tenant
    .from("maintenance_requests")
    .insert({
      org_id: SEED_ORG_ID,
      unit_id: unitId,
      tenant_id: userId,
      title: "Leak under the sink",
      description: "Water pooling in the cupboard.",
    })
    .select("id")
    .single();
  if (error) throw error;

  const path = requestPhotoPath(SEED_ORG_ID, request.id, crypto.randomUUID(), "jpg");
  const { error: uploadError } = await tenant.storage
    .from(REQUEST_PHOTOS_BUCKET)
    .upload(path, SAMPLE_JPEG, { contentType: "image/jpeg" });
  if (uploadError) throw uploadError;
  const { error: photoError } = await tenant
    .from("request_photos")
    .insert({ org_id: SEED_ORG_ID, request_id: request.id, storage_path: path, uploaded_by: userId });
  if (photoError) throw photoError;

  return { manager, tenant, requestId: request.id, path };
}

describe("maintenance requests with photos", () => {
  it("the tenant and the manager get a working signed link to the photo", async () => {
    const { manager, tenant, path } = await reportedRequest();
    for (const client of [tenant, manager]) {
      const { data, error } = await client.storage.from(REQUEST_PHOTOS_BUCKET).createSignedUrl(path, 60);
      expect(error).toBeNull();
      const response = await fetch(data!.signedUrl);
      expect(response.status).toBe(200);
    }
  });

  it("staff who are not assigned cannot see the photo", async () => {
    const { path } = await reportedRequest();
    const { supabase: staff } = await signedInAs("staff@demo.test");
    const { data, error } = await staff.storage.from(REQUEST_PHOTOS_BUCKET).createSignedUrl(path, 60);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("the bucket refuses files that are not images", async () => {
    const { tenant, requestId } = await reportedRequest();
    const { error } = await tenant.storage
      .from(REQUEST_PHOTOS_BUCKET)
      .upload(requestPhotoPath(SEED_ORG_ID, requestId, crypto.randomUUID(), "jpg"), new Blob(["<html>"]), {
        contentType: "text/html",
      });
    expect(error).not.toBeNull();
  });

  it("the tenant cannot report on a unit they do not lease", async () => {
    const { unitId } = await createVacantUnit();
    const { supabase: tenant, userId } = await signedInAs("tenant@demo.test");
    const { error } = await tenant.from("maintenance_requests").insert({
      org_id: SEED_ORG_ID,
      unit_id: unitId,
      tenant_id: userId,
      title: "Not my flat",
      description: "Should fail.",
    });
    expect(error).not.toBeNull();
  });
});

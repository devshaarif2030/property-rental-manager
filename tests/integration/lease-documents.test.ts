import { describe, expect, it } from "vitest";

import { LEASE_DOCUMENTS_BUCKET, leaseDocumentPath } from "@/lib/leases/documents";

import { createVacantUnit, leaseFor, SEED_ORG_ID, SEED_TENANT_ID, signedInAs } from "./helpers";

// Runs against a local Supabase stack with Storage. Uploads a sample PDF as the
// seeded manager and checks who can get a signed link to it.

const SAMPLE_PDF = new Blob(["%PDF-1.7\n% Sample lease for tests\n%%EOF\n"], { type: "application/pdf" });

async function leaseWithDocument() {
  const { supabase: manager, unitId } = await createVacantUnit();
  const { data: lease, error } = await manager
    .from("leases")
    .insert(leaseFor(unitId, SEED_TENANT_ID))
    .select("id")
    .single();
  if (error) throw error;

  const path = leaseDocumentPath(SEED_ORG_ID, lease.id, crypto.randomUUID());
  const { error: uploadError } = await manager.storage
    .from(LEASE_DOCUMENTS_BUCKET)
    .upload(path, SAMPLE_PDF, { contentType: "application/pdf" });
  if (uploadError) throw uploadError;

  const { error: linkError } = await manager.from("leases").update({ document_path: path }).eq("id", lease.id);
  if (linkError) throw linkError;
  return { manager, leaseId: lease.id, path };
}

describe("lease documents", () => {
  it("the manager and the lease's tenant get a working signed link", async () => {
    const { manager, path } = await leaseWithDocument();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");

    for (const client of [manager, tenant]) {
      const { data, error } = await client.storage.from(LEASE_DOCUMENTS_BUCKET).createSignedUrl(path, 60);
      expect(error).toBeNull();
      const response = await fetch(data!.signedUrl);
      expect(response.status).toBe(200);
      expect((await response.text()).startsWith("%PDF-")).toBe(true);
    }
  });

  it("staff cannot get a link to a lease document", async () => {
    const { path } = await leaseWithDocument();
    const { supabase: staff } = await signedInAs("staff@demo.test");
    const { data, error } = await staff.storage.from(LEASE_DOCUMENTS_BUCKET).createSignedUrl(path, 60);
    expect(data).toBeNull();
    expect(error).not.toBeNull();
  });

  it("the tenant cannot upload into their lease folder", async () => {
    const { leaseId } = await leaseWithDocument();
    const { supabase: tenant } = await signedInAs("tenant@demo.test");
    const { error } = await tenant.storage
      .from(LEASE_DOCUMENTS_BUCKET)
      .upload(leaseDocumentPath(SEED_ORG_ID, leaseId, crypto.randomUUID()), SAMPLE_PDF, {
        contentType: "application/pdf",
      });
    expect(error).not.toBeNull();
  });

  it("the bucket refuses files that are not PDFs", async () => {
    const { manager, leaseId } = await leaseWithDocument();
    const { error } = await manager.storage
      .from(LEASE_DOCUMENTS_BUCKET)
      .upload(leaseDocumentPath(SEED_ORG_ID, leaseId, crypto.randomUUID()), new Blob(["hello"]), {
        contentType: "text/plain",
      });
    expect(error).not.toBeNull();
  });

  it("a lease cannot point at a file outside its own folder", async () => {
    const { manager, leaseId } = await leaseWithDocument();
    const { error } = await manager
      .from("leases")
      .update({ document_path: `${SEED_ORG_ID}/${crypto.randomUUID()}/${crypto.randomUUID()}.pdf` })
      .eq("id", leaseId);
    expect(error?.code).toBe("23514");
  });
});

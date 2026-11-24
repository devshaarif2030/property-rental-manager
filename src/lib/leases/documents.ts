import { z } from "zod";

/** Private bucket; files are only ever served through short-lived signed URLs. */
export const LEASE_DOCUMENTS_BUCKET = "lease-documents";

/** Matches the bucket's file_size_limit in the migration. */
export const MAX_LEASE_DOCUMENT_BYTES = 5 * 1024 * 1024;

export const SIGNED_URL_SECONDS = 60;

const PDF_MAGIC = "%PDF-";

/** Storage object name: <org_id>/<lease_id>/<file_id>.pdf, as the storage policies expect. */
export function leaseDocumentPath(orgId: string, leaseId: string, fileId: string): string {
  return `${orgId}/${leaseId}/${fileId}.pdf`;
}

export const leaseDocumentFileSchema = z
  .instanceof(File, { error: "Choose a PDF to upload." })
  .refine((file) => file.size > 0, "Choose a PDF to upload.")
  .refine((file) => file.size <= MAX_LEASE_DOCUMENT_BYTES, "The PDF must be 5 MB or smaller.")
  .refine((file) => file.type === "application/pdf", "Upload a PDF file.");

/** Checks the file really is a PDF, not just named like one. */
export async function hasPdfSignature(file: Blob): Promise<boolean> {
  const head = new Uint8Array(await file.slice(0, PDF_MAGIC.length).arrayBuffer());
  return new TextDecoder().decode(head) === PDF_MAGIC;
}

export type LeaseDocumentCheck = { ok: true; file: File } | { ok: false; error: string };

/** Validates an uploaded lease document from form data. */
export async function validateLeaseDocument(value: unknown): Promise<LeaseDocumentCheck> {
  const parsed = leaseDocumentFileSchema.safeParse(value);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Upload a PDF file." };
  if (!(await hasPdfSignature(parsed.data))) return { ok: false, error: "That file is not a valid PDF." };
  return { ok: true, file: parsed.data };
}

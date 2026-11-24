import { describe, expect, it } from "vitest";

import { leaseDocumentPath, MAX_LEASE_DOCUMENT_BYTES, validateLeaseDocument } from "./documents";

function pdf(body = "%PDF-1.7\n%sample\n", type = "application/pdf", name = "lease.pdf") {
  return new File([body], name, { type });
}

describe("validateLeaseDocument", () => {
  it("accepts a small PDF", async () => {
    expect(await validateLeaseDocument(pdf())).toMatchObject({ ok: true });
  });

  it("asks for a file when none is given", async () => {
    expect(await validateLeaseDocument(null)).toEqual({ ok: false, error: "Choose a PDF to upload." });
    expect(await validateLeaseDocument(pdf(""))).toEqual({ ok: false, error: "Choose a PDF to upload." });
  });

  it("rejects files over the size limit", async () => {
    const big = pdf("%PDF-" + "x".repeat(MAX_LEASE_DOCUMENT_BYTES));
    expect(await validateLeaseDocument(big)).toEqual({ ok: false, error: "The PDF must be 5 MB or smaller." });
  });

  it("rejects other file types", async () => {
    expect(await validateLeaseDocument(pdf("hello", "text/plain", "lease.txt"))).toEqual({ ok: false, error: "Upload a PDF file." });
  });

  it("rejects a file labelled as PDF that is not one", async () => {
    expect(await validateLeaseDocument(pdf("<html></html>"))).toEqual({ ok: false, error: "That file is not a valid PDF." });
  });
});

describe("leaseDocumentPath", () => {
  it("puts the file in its org and lease folder", () => {
    expect(leaseDocumentPath("org", "lease", "file")).toBe("org/lease/file.pdf");
  });
});

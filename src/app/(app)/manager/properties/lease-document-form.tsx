"use client";

import { useRef, useState, useTransition } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { uploadLeaseDocument } from "./lease-actions";

/** Uploads the signed lease PDF, or replaces the current one. */
export function LeaseDocumentForm({ leaseId, hasDocument }: { leaseId: string; hasDocument: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [hasFile, setHasFile] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const inputId = `lease-document-${leaseId}`;

  return (
    <form
      ref={formRef}
      className="flex flex-col gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        setError(null);
        setSaved(false);
        startTransition(async () => {
          const result = await uploadLeaseDocument(leaseId, formData);
          if (result.ok) {
            formRef.current?.reset();
            setHasFile(false);
            setSaved(true);
          } else {
            setError(result.error);
          }
        });
      }}
    >
      <Label htmlFor={inputId}>{hasDocument ? "Replace lease PDF" : "Upload signed lease (PDF, up to 5 MB)"}</Label>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          id={inputId}
          name="document"
          type="file"
          accept="application/pdf"
          required
          onChange={(event) => setHasFile((event.target.files?.length ?? 0) > 0)}
        />
        <Button type="submit" size="sm" variant="outline" disabled={isPending || !hasFile}>
          {isPending ? "Uploading..." : "Upload"}
        </Button>
      </div>
      <FormError message={error} />
      {saved && (
        <p className="text-sm text-muted-foreground" role="status">
          Lease PDF saved.
        </p>
      )}
    </form>
  );
}

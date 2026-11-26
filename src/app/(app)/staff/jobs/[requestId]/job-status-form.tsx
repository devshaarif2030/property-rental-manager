"use client";

import { useState, useTransition } from "react";

import { FormError } from "@/components/form-error";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { updateJobStatus } from "../../actions";

type NextStatus = "in_progress" | "done";

const BUTTON_LABELS: Record<NextStatus, string> = { in_progress: "Start job", done: "Mark as done" };

/** One button for the next step of the job, with an optional note for the timeline. */
export function JobStatusForm({ requestId, nextStatus }: { requestId: string; nextStatus: NextStatus }) {
  const [isPending, startTransition] = useTransition();
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex max-w-xl flex-col gap-3 rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await updateJobStatus(requestId, { status: nextStatus, note });
          if (result.ok) setNote("");
          else setError(result.error);
        });
      }}
    >
      <Label htmlFor="note">Note for the timeline (optional)</Label>
      <Textarea
        id="note"
        value={note}
        maxLength={2000}
        placeholder={nextStatus === "done" ? "What did you fix?" : "When will you be there?"}
        onChange={(event) => setNote(event.target.value)}
      />
      <FormError message={error} />
      <Button type="submit" className="self-start" disabled={isPending}>
        {isPending ? "Saving..." : BUTTON_LABELS[nextStatus]}
      </Button>
    </form>
  );
}

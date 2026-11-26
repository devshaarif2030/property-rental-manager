import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { TestModeNotice } from "@/components/test-mode-notice";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { formatIsoMonth } from "@/lib/dates";
import { formatCents } from "@/lib/money/money";
import { getReceiptBySession } from "@/lib/payments/queries";
import { getOrganizationCurrency } from "@/lib/properties/queries";
import { createClient } from "@/lib/supabase/server";

const sessionIdSchema = z.string().regex(/^cs_(test|live)_[A-Za-z0-9]{1,255}$/);

const paidAtFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });

/** Stripe sends the tenant here after Checkout. The webhook may land a moment later. */
export default async function ReceiptPage({ params }: PageProps<"/tenant/payments/[sessionId]">) {
  const { sessionId } = await params;
  const user = await requireRole(["tenant"], `/tenant/payments/${sessionId}`);
  if (!sessionIdSchema.safeParse(sessionId).success) notFound();

  const supabase = await createClient();
  const [receipt, currency] = await Promise.all([
    getReceiptBySession(supabase, sessionId),
    getOrganizationCurrency(supabase, user.orgId),
  ]);
  if (!receipt) notFound();

  if (receipt.status !== "succeeded") {
    return (
      <div className="flex max-w-lg flex-col gap-4">
        <h1 className="text-3xl font-bold">
          {receipt.status === "pending" ? "Confirming your payment" : "Payment not completed"}
        </h1>
        <p className="text-muted-foreground">
          {receipt.status === "pending"
            ? "Stripe is confirming the payment. Refresh this page in a few seconds to see your receipt."
            : "This checkout was not completed, so nothing was charged. You can pay from your home page."}
        </p>
        <Button asChild variant="outline" className="self-start">
          <Link href="/tenant">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <article className="flex max-w-lg flex-col gap-4 rounded-2xl border border-border/70 bg-card shadow-card p-6">
      <div>
        <p className="text-sm text-muted-foreground">Receipt</p>
        <h1 className="text-3xl font-bold">Rent paid</h1>
      </div>
      <dl className="grid gap-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Amount</dt>
          <dd className="font-medium">{formatCents(receipt.amountCents, currency)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">For</dt>
          <dd>Rent, {formatIsoMonth(receipt.periodMonth)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Home</dt>
          <dd className="text-right">
            {receipt.propertyName}, {receipt.unitLabel}
            <br />
            {receipt.propertyAddress}
          </dd>
        </div>
        {receipt.paidAt && (
          <div className="flex justify-between gap-4">
            <dt className="text-muted-foreground">Paid</dt>
            <dd>{paidAtFormat.format(new Date(receipt.paidAt))} UTC</dd>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Reference</dt>
          <dd className="font-mono text-xs">{receipt.paymentId}</dd>
        </div>
      </dl>
      <TestModeNotice />
      <Button asChild variant="outline" className="self-start">
        <Link href="/tenant">Back to home</Link>
      </Button>
    </article>
  );
}

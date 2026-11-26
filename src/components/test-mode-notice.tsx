/** Shown wherever money appears. Payments run in Stripe test mode only. */
export function TestModeNotice() {
  return (
    <p role="note" className="rounded-xl border border-dashed border-brand-400/50 bg-brand-50 px-3 py-2 text-xs text-muted-foreground">
      Stripe test mode. No real money moves. Pay with the test card 4242 4242 4242 4242, any future date and any
      CVC.
    </p>
  );
}

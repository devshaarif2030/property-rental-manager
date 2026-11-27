/** Shown the moment a link is clicked, while the next page loads. */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="h-4 w-28 rounded-md bg-muted" />
        <div className="h-8 w-64 max-w-full rounded-md bg-muted" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 rounded-2xl border border-border/70 bg-card shadow-card" />
        ))}
      </div>
      <div className="h-64 rounded-2xl border border-border/70 bg-card shadow-card" />
    </div>
  );
}

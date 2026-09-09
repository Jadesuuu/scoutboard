/**
 * One-line notice shown on the public portfolio deployment so visitors know
 * why the data looks synthetic. Rendered only when NEXT_PUBLIC_DEMO_MODE=true.
 */
export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div role="note" className="border-line bg-surface-muted w-full border-b">
      <p className="text-quiet mx-auto max-w-6xl px-4 py-2 text-xs sm:px-6">
        <span className="text-ink font-bold">Portfolio demo.</span> Listings are
        seeded sample data, a simulator posts offers every few minutes, and the
        AI analysis has a small shared daily budget.
      </p>
    </div>
  );
}

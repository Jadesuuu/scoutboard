/**
 * One-line notice shown on the public portfolio deployment so visitors know
 * why the data looks synthetic. Rendered only when NEXT_PUBLIC_DEMO_MODE=true.
 */
export default function DemoBanner() {
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== "true") return null;

  return (
    <div
      role="note"
      className="w-full border-b border-amber-200 bg-amber-50 text-amber-900"
    >
      <p className="mx-auto max-w-6xl px-6 py-2 text-xs">
        <span className="font-semibold">Portfolio demo.</span> Listings are
        seeded sample data, a simulator posts offers every few minutes, and the
        AI analysis has a small shared daily budget.
      </p>
    </div>
  );
}

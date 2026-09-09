import { Skeleton } from "../ui/skeleton";

/**
 * Placeholder for the detail page while the listing loads. It mirrors the real
 * layout — header, photo mosaic, metric tiles, offer list, sidebar — so the
 * page fills in where the shapes already are instead of jumping.
 */
export default function ListingDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading listing"
      className="animate-sb-fade-in pb-24 lg:pb-0"
    >
      {/* Header */}
      <div className="border-line bg-surface border-b">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
          <Skeleton className="mb-4 h-4 w-28 sm:mb-5" />
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Skeleton className="h-14 w-14 rounded-[15px] sm:h-[68px] sm:w-[68px]" />
            <div className="min-w-0 flex-1 basis-60">
              <Skeleton className="h-8 w-3/5 sm:h-10" />
              <Skeleton className="mt-2.5 h-3.5 w-2/5" />
            </div>
          </div>
        </div>
      </div>

      {/* Photo mosaic */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-[14px] sm:grid-cols-3 sm:grid-rows-2">
          <Skeleton className="min-h-48 sm:col-span-2 sm:row-span-2 sm:min-h-[clamp(190px,28vw,330px)]" />
          <Skeleton className="hidden min-h-[90px] sm:block sm:min-h-[clamp(90px,13vw,161px)]" />
          <Skeleton className="hidden min-h-[90px] sm:block sm:min-h-[clamp(90px,13vw,161px)]" />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-6 px-4 pt-6 pb-14 sm:px-6 sm:pt-8 md:gap-10">
        {/* Left column */}
        <section className="min-w-0 flex-1 basis-[400px]">
          {/* Metrics */}
          <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="border-line bg-surface rounded-xl border px-4 py-3.5"
              >
                <Skeleton className="mb-2.5 h-2.5 w-20" />
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>

          <Skeleton className="mb-4 h-5 w-44" />
          <div className="mb-7 space-y-2.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-3/5" />
          </div>

          {/* Offer history */}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3.5 w-40" />
          </div>
          <div className="border-line bg-surface overflow-hidden rounded-[13px] border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="border-line-soft flex items-center gap-2.5 border-b px-4 py-3 last:border-b-0"
              >
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-12 rounded-full" />
                <Skeleton className="ml-auto h-3.5 w-28" />
              </div>
            ))}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="min-w-0 flex-1 basis-[300px] md:sticky md:top-[78px] md:max-w-[372px]">
          <div className="border-line bg-surface overflow-hidden rounded-2xl border p-5 shadow-[0_8px_22px_rgba(20,32,27,0.07)]">
            <Skeleton className="mb-2.5 h-2.5 w-24" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="mt-3 h-3.5 w-36" />
            <Skeleton className="mt-4 h-11 w-full rounded-[10px]" />
            <Skeleton className="mt-2.5 h-11 w-full rounded-[10px]" />
          </div>
        </aside>
      </div>
    </div>
  );
}

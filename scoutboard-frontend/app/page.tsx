"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { useLiveListingUpdates } from "@/components/hooks/use-live-listing-updates";
import ListingCard from "@/components/listing/listing-card";
import ListingRow from "@/components/listing/listing-row";
import FeaturedListing from "@/components/listing/featured-listing";
import MarketStats from "@/components/listing/market-stats";
import WakingUpNotice from "@/components/ui/waking-up-notice";
import { Skeleton } from "@/components/ui/skeleton";
import { HERO_PHOTO } from "@/lib/photos";
import { INDUSTRIES, listingMetrics, type Listing } from "@/lib/listing";

type ViewMode = "grid" | "list";

type SortKey = "views" | "priceAsc" | "priceDesc" | "multiple" | "offers";

const SORTS: { value: SortKey; label: string }[] = [
  { value: "views", label: "Most watched" },
  { value: "priceAsc", label: "Price: low to high" },
  { value: "priceDesc", label: "Price: high to low" },
  { value: "multiple", label: "Lowest multiple" },
  { value: "offers", label: "Most offers" },
];

/** Listings without a revenue figure have no multiple, so they sort last. */
function multipleOf(listing: Listing) {
  return listingMetrics(listing).askingMultiple ?? Number.POSITIVE_INFINITY;
}

function sortListings(listings: Listing[], sort: SortKey) {
  const sorted = [...listings];
  switch (sort) {
    case "priceAsc":
      return sorted.sort((a, b) => a.askingPrice - b.askingPrice);
    case "priceDesc":
      return sorted.sort((a, b) => b.askingPrice - a.askingPrice);
    case "multiple":
      return sorted.sort((a, b) => multipleOf(a) - multipleOf(b));
    case "offers":
      return sorted.sort((a, b) => b.offersCount - a.offersCount);
    case "views":
    default:
      return sorted.sort((a, b) => b.views - a.views);
  }
}

export default function Home() {
  // New listings arrive over the socket and are written straight into this
  // query's cache, so the grid stays live without polling.
  useLiveListingUpdates();

  const {
    data: listingData,
    isLoading: isListLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["businessList"],
    queryFn: async (): Promise<Listing[]> => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/listings`);
      if (!res.ok) {
        throw new Error(`API Error:  ${res.status}`);
      }

      return await res.json();
    },
  });

  const [view, setView] = useState<ViewMode>(() => {
    if (typeof window === "undefined") return "grid";
    const saved = localStorage.getItem("browse-view");
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  const [industry, setIndustry] = useState<string>("All");
  const [sort, setSort] = useState<SortKey>("views");

  // Save whenever it changes
  useEffect(() => {
    localStorage.setItem("browse-view", view);
  }, [view]);

  // Memoised so the fallback doesn't get a fresh array identity on every
  // render, which would defeat the three memos below it.
  const listings = useMemo(() => listingData ?? [], [listingData]);

  /** Only offer a chip for an industry that actually has listings. */
  const chips = useMemo(() => {
    const present = new Set(listings.map((l) => l.industry?.toLowerCase()));
    return [
      { value: "All", label: "All" },
      ...INDUSTRIES.filter((i) => present.has(i.value)),
    ];
  }, [listings]);

  const visible = useMemo(() => {
    const filtered =
      industry === "All"
        ? listings
        : listings.filter((l) => l.industry?.toLowerCase() === industry);
    return sortListings(filtered, sort);
  }, [listings, industry, sort]);

  const featured = useMemo(
    () => sortListings(listings, "views")[0] ?? null,
    [listings],
  );

  const totalOffers = listings.reduce((sum, l) => sum + (l.offersCount ?? 0), 0);
  const industryLabel = chips.find((c) => c.value === industry)?.label;

  return (
    <div className="animate-sb-fade-in">
      {/* Hero */}
      <section className="bg-brand relative overflow-hidden">
        <Image
          src={HERO_PHOTO.src}
          alt=""
          aria-hidden
          fill
          preload
          sizes="100vw"
          placeholder="blur"
          blurDataURL={HERO_PHOTO.blurDataURL}
          className="object-cover"
        />
        {/* Keeps the headline legible over whatever the photo is doing. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(96deg,#0f4433_0%,rgba(15,68,51,0.94)_48%,rgba(15,68,51,0.62)_100%)]"
        />
        <div className="relative mx-auto flex max-w-6xl flex-wrap items-center gap-8 px-4 py-8 sm:px-6 sm:py-14 md:gap-12">
          <div className="min-w-0 flex-1 basis-[380px]">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-bold tracking-[0.04em] text-white uppercase sm:mb-5">
              <span className="animate-sb-blink h-1.5 w-1.5 rounded-full bg-[#8fe0b0]" />
              {totalOffers} live offers on the book
            </div>
            <h1 className="m-0 max-w-[16ch] text-[clamp(32px,6.4vw,60px)] leading-[1.02] font-extrabold tracking-[-0.04em] text-white">
              Buy a real business with real numbers.
            </h1>
            <p className="text-brand-on-dark mt-4 mb-6 max-w-[48ch] text-[clamp(15px,1.7vw,18px)] leading-relaxed sm:mt-4 sm:mb-7">
              Independent shops, verified revenue, and every offer visible on
              the listing. No brokers between you and the seller.
            </p>
            <div className="flex flex-wrap gap-2.5">
              <a
                href="#listings"
                className="text-brand rounded-[10px] bg-white px-5 py-3 text-[14.5px] font-bold transition-colors hover:bg-[#eef5f1]"
              >
                Browse all listings
              </a>
              <Link
                href="/create-listing"
                className="rounded-[10px] border-[1.5px] border-white/30 px-5 py-3 text-[14.5px] font-bold text-white transition-colors hover:border-white hover:bg-white/10"
              >
                List yours
              </Link>
            </div>
          </div>

          <div className="min-w-0 flex-1 basis-[320px] md:max-w-[420px]">
            {featured ? (
              <FeaturedListing listing={featured} />
            ) : (
              <div className="bg-surface rounded-2xl p-5 shadow-[0_18px_44px_rgba(6,26,19,0.28)]">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="mt-4 h-12 w-full" />
                <Skeleton className="mt-4 h-16 w-full" />
              </div>
            )}
          </div>
        </div>
      </section>

      <MarketStats listings={listings} loading={isListLoading} />

      {/* Listings */}
      <div
        id="listings"
        className="mx-auto max-w-6xl px-4 pt-6 pb-20 sm:px-6 sm:pt-8"
      >
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0 flex-1 basis-64">
            <h2 className="m-0 text-[clamp(20px,3vw,26px)] tracking-[-0.03em]">
              Businesses for sale
            </h2>
            {isListLoading ? (
              <Skeleton className="mt-2 h-3.5 w-28" />
            ) : (
              <div className="text-quiet mt-1 text-[13px]">
                {visible.length}{" "}
                {visible.length === 1 ? "business" : "businesses"}
                {industry === "All" ? "" : ` in ${industryLabel}`}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <label className="sr-only" htmlFor="sort">
              Sort listings
            </label>
            <select
              id="sort"
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="border-line-strong bg-surface text-ink focus:border-brand cursor-pointer rounded-[9px] border px-2.5 py-2 text-[13px] font-semibold focus:outline-none"
            >
              {SORTS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="flex gap-[3px] rounded-[9px] bg-[#e7e5de] p-[3px]">
              {(
                [
                  ["grid", "Cards"],
                  ["list", "Rows"],
                ] as const
              ).map(([mode, label]) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setView(mode)}
                  aria-pressed={view === mode}
                  className={`rounded-[7px] px-3.5 py-1.5 text-[12.5px] font-bold transition-colors ${
                    view === mode
                      ? "bg-surface text-ink shadow-[0_1px_2px_rgba(20,32,27,0.14)]"
                      : "text-quiet hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Industry filter */}
        {chips.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-1.5">
            {chips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                onClick={() => setIndustry(chip.value)}
                aria-pressed={industry === chip.value}
                className={`rounded-full border px-3.5 py-2 text-[12.5px] font-bold whitespace-nowrap transition-colors ${
                  industry === chip.value
                    ? "border-brand bg-brand text-white"
                    : "border-line-strong bg-surface text-quiet hover:text-ink"
                }`}
              >
                {chip.label}
              </button>
            ))}
          </div>
        )}

        {isListLoading && (
          <WakingUpNotice>
            <div
              role="status"
              aria-label="Loading listings"
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="border-line bg-surface overflow-hidden rounded-[14px] border"
                >
                  <Skeleton className="aspect-[16/10] w-full rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              ))}
            </div>
          </WakingUpNotice>
        )}

        {isError && (
          <p className="text-negative mt-6 text-sm font-semibold">
            {(error as Error).message}
          </p>
        )}

        {!isListLoading && !isError && listings.length === 0 && (
          <p className="text-quiet mt-6 text-sm">No listings found.</p>
        )}

        {!isListLoading && !isError && listings.length > 0 && (
          <>
            {view === "grid" && (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((listing) => (
                  <ListingCard key={listing._id} {...listing} />
                ))}
              </div>
            )}

            {view === "list" && (
              <div className="border-line bg-surface overflow-hidden rounded-[14px] border">
                {visible.map((listing) => (
                  <ListingRow key={listing._id} {...listing} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

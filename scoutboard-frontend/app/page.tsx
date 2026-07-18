"use client";

import { ListingProps as Listing } from "@/components/hooks/use-live-listing-updates";
import ListingCard from "@/components/listing/listing-card";
import ListingRow from "@/components/listing/listing-row";
import { colorFromString } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

export default function Home() {
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

  const [view, setView] = useState<"grid" | "list">(() => {
    if (typeof window === "undefined") return "grid";
    const saved = localStorage.getItem("browse-view");
    return saved === "grid" || saved === "list" ? saved : "grid";
  });

  // Save whenever it changes
  useEffect(() => {
    localStorage.setItem("browse-view", view);
  }, [view]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {/* Hero */}
      <h1 className="font-serif text-4xl text-stone-900">
        Own a business you&apos;ll love running.
      </h1>
      <p className="mt-3 max-w-xl text-stone-500">
        Browse independent shops for sale from owners ready to hand over the
        keys. Make an offer in a couple of clicks.
      </p>

      {/* Toolbar: count + view toggle */}
      <div className="mt-8 flex items-center justify-between">
        <p className="text-sm text-stone-500">
          {listingData?.length ?? 0} businesses for sale
        </p>

        <div className="flex rounded-lg bg-stone-100 p-1">
          <button
            onClick={() => setView("grid")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === "grid"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Grid
          </button>
          <button
            onClick={() => setView("list")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              view === "list"
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            List
          </button>
        </div>
      </div>

      {isListLoading && <p className="mt-6">loading...</p>}
      {isError && (
        <p className="mt-6 text-red-500">{(error as Error).message}</p>
      )}
      {!isListLoading && !isError && listingData?.length === 0 && (
        <p className="mt-6">No listings found.</p>
      )}

      {/* Grid view */}
      {view === "grid" && (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {listingData?.map((listing) => (
            <ListingCard
              key={listing._id}
              color={colorFromString(listing._id)}
              {...listing}
            />
          ))}
        </div>
      )}

      {/* List view */}
      {view === "list" && (
        <div className="mt-6">
          {listingData?.map((listing) => (
            <ListingRow
              key={listing._id}
              color={colorFromString(listing._id)}
              {...listing}
            />
          ))}
        </div>
      )}
    </div>
  );
}

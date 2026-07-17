"use client";

import { useQuery } from "@tanstack/react-query";
import { OfferProps } from "../hooks/use-live-offer-updates";
import { ListingCardProps } from "./listing-card";
import { Card, CardContent } from "../ui/card";
import { SpinnerEmpty } from "../ui/empty-content-spinner";
import Link from "next/link";
import { Button } from "../ui/button";
import { timeAgo } from "@/lib/utils";

export default function ListingDetail({ id }: { id: string }) {
  const {
    data: listing,
    isLoading: isListingLoading,
    isError: isListingError,
  } = useQuery({
    queryKey: ["listingDetail", id],
    queryFn: async (): Promise<ListingCardProps> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}`,
      );
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  const { data: offerData, isLoading: isOfferLoading } = useQuery({
    queryKey: ["offers", id],
    queryFn: async (): Promise<OfferProps[]> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}/offers`,
      );
      if (!res.ok) {
        throw new Error(`API Error: ${res.status}`);
      }
      return res.json();
    },
    refetchOnWindowFocus: false,
  });

  if (isListingLoading && isOfferLoading) return <SpinnerEmpty />;
  if (isListingError) return <p>Error loading listing details.</p>;

  return (
    <div className="mx-auto w-6xl px-6 py-10">
      {/* Back link */}
      <Link href="/" className="text-sm text-stone-400 hover:text-stone-600">
        ← Back to listings
      </Link>

      <div className="mt-6 flex gap-12">
        {/* LEFT COLUMN */}
        <div className="flex-1">
          {/* Header */}
          <div className="flex items-center gap-4">
            <div
              className="flex h-14 w-14 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#E8E0CC" }}
            >
              <span
                className="font-serif text-2xl"
                style={{ color: "rgba(0,0,0,0.3)" }}
              >
                T
              </span>
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-stone-900">
                {listing?.title}
              </h1>
              <p className="text-sm text-stone-400">
                {listing?.industry} · {listing?.location}
              </p>
            </div>
          </div>

          {/* About */}
          <div className="mt-8">
            <h2 className="text-sm font-semibold text-stone-900">
              About this business
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-500">
              {listing?.description}
            </p>
          </div>

          {/* Stats */}
          <div className="mt-8 flex gap-10">
            <div>
              <p className="text-xs text-stone-400">Monthly revenue</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {listing?.monthlyRevenue?.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Established</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {listing?.establishedYear}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Offers received</p>
              <p className="mt-1 text-sm font-semibold text-stone-900">
                {listing?.offersCount}
              </p>
            </div>
          </div>

          {/* Offers */}
          <div className="mt-8">
            {listing?.offersCount === 0 ? (
              <p className="text-sm text-stone-400">No offers yet.</p>
            ) : (
              <>
                <h2 className="text-sm font-semibold text-stone-900">Offers</h2>
                <div className="mt-3 divide-y divide-stone-100">
                  {offerData?.map((offers) => (
                    <div
                      key={offers._id}
                      className="flex items-center justify-between py-3"
                    >
                      <span className="text-sm font-semibold text-stone-900">
                        ${offers.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-stone-400">
                        {offers.bidderName} · {timeAgo(offers.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN - Sidebar */}
        <div className="w-64 shrink-0 mt-30">
          <Card className="rounded-lg border border-stone-200 bg-white w-80 h-60">
            <CardContent className="p-5 rounded-lg -mt-5">
              <p className="text-xs text-stone-400">Asking price</p>
              <p className="mt-1 text-3xl font-bold text-stone-900">$145,000</p>
              <p className="mt-1 text-xs text-stone-400">
                313 views · 2 offers
              </p>

              <Button className="mt-4 w-full bg-[#c0603a] text-white hover:bg-[#a85230] rounded-lg ">
                Make an offer
              </Button>

              <Button
                variant="outline"
                className="mt-1 w-full text-sm text-[#c0603a] rounded-lg"
              >
                ✦ Analyze with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

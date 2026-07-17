"use client";

import ListingCard from "@/components/listing/listing-card";
import { colorFromString } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";

interface Listing {
  _id: string;
  title: string;
  industry: string;
  location: string;
  askingPrice: number;
  monthlyRevenue: number;
  description: string;
  createdAt: string;
  updatedAt: string;
  offersCount: number;
  views: number;
  establishedYear: number;
}

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
    // will add websocket later
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      {isListLoading && <p>loading...</p>}
      {isError && <p className="text-red-500">{(error as Error).message}</p>}
      {!isListLoading && !isError && listingData?.length === 0 && (
        <p>No listings found.</p>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {listingData?.map((listing) => (
          <ListingCard
            key={listing._id}
            color={colorFromString(listing._id)}
            {...listing}
          />
        ))}
      </div>
    </div>
  );
}

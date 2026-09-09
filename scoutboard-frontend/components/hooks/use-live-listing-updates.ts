"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

import type { Listing } from "@/lib/listing";

/** Kept as a named re-export; `Listing` in lib/listing.ts is the source shape. */
export type ListingProps = Listing;

export function useLiveListingUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL!);

    socket.on("listingUpdate", (list: ListingProps) => {
      queryClient.setQueryData<ListingProps[]>(["businessList"], (oldlists) =>
        oldlists ? [list, ...oldlists] : [list],
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}

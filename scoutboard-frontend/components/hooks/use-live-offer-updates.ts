"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";
import type { ListingCardProps } from "../listing/listing-card";

export interface OfferProps {
  _id: string;
  listingId: string;
  amount: number;
  bidderName: string;
  createdAt: string;
}

export function useLiveOfferUpdates() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_API_URL!);

    socket.on("offerUpdate", (offer: OfferProps) => {
      let isNew = false;

      queryClient.setQueryData<OfferProps[]>(
        ["offers", offer.listingId],
        (oldOffers) => {
          if (!oldOffers) {
            isNew = true;
            return [offer];
          }
          // The window that posted the offer also invalidates + refetches
          // ['offers', id], so this same offer can arrive twice. Dedupe by _id
          // so we never double-render or double-count.
          if (oldOffers.some((o) => o._id === offer._id)) {
            return oldOffers;
          }
          isNew = true;
          return [offer, ...oldOffers];
        },
      );

      // Keep the denormalized offersCount live in the receiving window. The
      // listing detail query is never refetched on a socket event, so without
      // this its count (and the "No offers yet" gate) would stay stale.
      if (isNew) {
        queryClient.setQueryData<ListingCardProps>(
          ["listingDetail", offer.listingId],
          (oldListing) =>
            oldListing
              ? { ...oldListing, offersCount: (oldListing.offersCount ?? 0) + 1 }
              : oldListing,
        );
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}

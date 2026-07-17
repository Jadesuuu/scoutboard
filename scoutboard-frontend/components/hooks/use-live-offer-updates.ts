"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

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
      queryClient.setQueryData<OfferProps[]>(
        ["offers", offer.listingId],
        (oldOffers) => (oldOffers ? [offer, ...oldOffers] : [offer]),
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [queryClient]);
}

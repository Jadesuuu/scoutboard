"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { io } from "socket.io-client";

export interface ListingProps {
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

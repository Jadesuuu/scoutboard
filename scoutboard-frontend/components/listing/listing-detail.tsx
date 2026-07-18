"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  OfferProps,
  useLiveOfferUpdates,
} from "../hooks/use-live-offer-updates";
import { ListingCardProps } from "./listing-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { SpinnerEmpty } from "../ui/empty-content-spinner";
import Link from "next/link";
import { Button } from "../ui/button";
import { timeAgo } from "@/lib/utils";
import { useState } from "react";
import { Input } from "@base-ui/react/input";
import { toast } from "sonner";
import { Skeleton } from "../ui/skeleton";
import { useRouter } from "next/navigation";

interface createOfferBody {
  amount: number;
  bidderName: string;
}

interface AIAnalysisResult {
  verdict: string;
  fairValueLow: number;
  fairValueHigh: number;
  points: string[];
  suggestedOffer: number;
}

export default function ListingDetail({ id }: { id: string }) {
  useLiveOfferUpdates();

  const queryClient = useQueryClient();
  const router = useRouter();

  const [showOfferCard, setShowOfferCard] = useState<boolean>(false);
  const [offerForm, setOfferForm] = useState<createOfferBody>({
    amount: 0,
    bidderName: "",
  });

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

  const { mutate: mutateOffer } = useMutation({
    mutationFn: async (formData: createOfferBody) => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}/offers`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        },
      );

      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    },

    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers", id] });
      setOfferForm({
        amount: 0,
        bidderName: "",
      });
      toast.success("Successfully posted offer", {
        position: "bottom-right",
      });
    },

    onError: () => {
      toast.error("Failed to post offer", {
        position: "bottom-right",
      });
    },
  });

  const {
    mutate: analyze,
    data: analysis,
    isPending: isAnalyzing,
  } = useMutation({
    mutationFn: async (): Promise<AIAnalysisResult> => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}/analyze`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return res.json();
    },
  });

  const { mutate: mutateDelete, isPending: isDeleting } = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/listings/${id}/delete`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
    },
    onSuccess: () => {
      toast.success("Successfully deleted business", {
        position: "bottom-right",
      });
      router.back();
    },
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
            <Button
              variant="outline"
              id="delButton"
              onClick={() => mutateDelete()}
              disabled={isDeleting}
              className="rounded-lg outline-red-500"
            >
              Delete
            </Button>
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
            {!offerData || offerData.length === 0 ? (
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
        <div className="w-80 shrink-0">
          <Card className="rounded-lg border border-stone-200 bg-white">
            <CardContent className="p-5">
              <p className="text-xs text-stone-400">Asking price</p>
              <p className="mt-1 text-3xl font-bold text-stone-900">
                ${listing?.askingPrice?.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-stone-400">
                {listing?.views} views · {listing?.offersCount} offers
              </p>

              <Button
                className="mt-4 w-full bg-[#c0603a] text-white hover:bg-[#a85230] rounded-lg"
                onClick={() => setShowOfferCard(true)}
              >
                Make an offer
              </Button>

              <Button
                variant="outline"
                className="mt-2 w-full text-sm text-[#c0603a] rounded-lg"
                onClick={() => analyze()}
                disabled={isAnalyzing}
              >
                ✦ Analyze with AI
              </Button>

              {/* Loading skeletons */}
              {isAnalyzing && (
                <div className="mt-5 border-t border-stone-100 pt-5">
                  <p className="text-xs font-semibold tracking-wide text-[#c0603a]">
                    ✦ AI ANALYSIS
                  </p>
                  <Skeleton className="mt-3 h-7 w-32 rounded-full" />{" "}
                  {/* verdict badge */}
                  <Skeleton className="mt-4 h-3 w-24" />{" "}
                  {/* "Estimated fair value" */}
                  <Skeleton className="mt-2 h-6 w-44" /> {/* price range */}
                  <div className="mt-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/6" />
                  </div>
                </div>
              )}

              {/* Loaded analysis */}
              {analysis && !isAnalyzing && (
                <div className=" pt-5">
                  <p className="text-xs font-semibold tracking-wide text-[#c0603a]">
                    ✦ AI ANALYSIS
                  </p>
                  <span className="mt-3 inline-block rounded-full bg-stone-100 px-3 py-1 text-sm font-semibold text-stone-700">
                    {analysis.verdict}
                  </span>
                  <p className="mt-4 text-xs text-stone-400">
                    Estimated fair value
                  </p>
                  <p className="text-lg font-bold text-stone-900">
                    ${analysis.fairValueLow.toLocaleString()} – $
                    {analysis.fairValueHigh.toLocaleString()}
                  </p>
                  <ul className="mt-3 space-y-2">
                    {analysis.points.map((point, i) => (
                      <li key={i} className="flex gap-2 text-sm text-stone-600">
                        <span className="text-[#c0603a]">•</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 flex gap-2 text-sm text-stone-600">
                    <span className="text-[#c0603a]">•</span>
                    Suggested opening offer: $
                    {analysis.suggestedOffer.toLocaleString()}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* add offer card */}
      {showOfferCard && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={() => setShowOfferCard(false)}
        >
          <Card
            className="w-105 rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle className="font-serif text-2xl font-normal">
                Make an offer
              </CardTitle>
              <CardDescription>
                on {listing?.title} · asking $
                {listing?.askingPrice.toLocaleString()}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-semibold text-stone-900">
                  Your name
                </p>
                <Input
                  value={offerForm.bidderName}
                  id="bidderName"
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, bidderName: e.target.value })
                  }
                  className="pl-7 min-w-90 min-h-10 rounded-lg outline-2"
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-semibold text-stone-900">
                  Your offer
                </p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-400">
                    $
                  </span>
                  <Input
                    type="number"
                    value={offerForm.amount}
                    id="amount"
                    className="pl-7 min-w-90 min-h-10 rounded-lg outline-2"
                    onChange={(e) =>
                      setOfferForm({
                        ...offerForm,
                        amount: Number(e.target.value),
                      })
                    }
                  />
                </div>
              </div>
            </CardContent>

            <CardFooter className="gap-3">
              <Button
                className="flex-1 bg-[#c0603a] text-white hover:bg-[#a85230] rounded-lg"
                disabled={isOfferLoading}
                onClick={() => {
                  mutateOffer(offerForm);
                  setShowOfferCard(false);
                }}
              >
                Submit offer
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowOfferCard(false);
                  setOfferForm({ amount: 0, bidderName: "" });
                }}
                className="rounded-lg"
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}

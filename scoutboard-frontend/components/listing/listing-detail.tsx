"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import {
  OfferProps,
  useLiveOfferUpdates,
} from "../hooks/use-live-offer-updates";
import ListingPhoto, { ListingMonogram } from "./listing-photo";
import VerifiedBadge from "./verified-badge";
import FairValueBand from "./fair-value-band";
import ListingDetailSkeleton from "./listing-detail-skeleton";
import WakingUpNotice from "../ui/waking-up-notice";
import { Skeleton } from "../ui/skeleton";
import { timeAgo } from "@/lib/utils";
import { industryMeta, listingMetrics, type Listing } from "@/lib/listing";
import {
  money,
  multiple,
  offersLabelLower,
  percentOfAsk,
  shortMoney,
  watchingLabel,
} from "@/lib/format";

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

/** The API answers with this shape when AI is unconfigured or over budget. */
interface AIAnalysisError {
  error: string;
}

type AnalyzeResponse = AIAnalysisResult | AIAnalysisError;

const isAnalysisError = (r: AnalyzeResponse): r is AIAnalysisError =>
  "error" in r;

/** Public portfolio deployment: hide destructive controls from visitors. */
const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

/**
 * Colour the verdict from where the asking price actually falls in the range,
 * not by pattern-matching the model's wording — the label is free text and a
 * red pill on a fair price would be worse than a neutral one.
 */
function verdictTone(analysis: AIAnalysisResult, askingPrice: number) {
  if (askingPrice > analysis.fairValueHigh) {
    return "bg-[#f6e3dd] text-[#8e2f1d]";
  }
  return "bg-brand-tint-strong text-brand";
}

export default function ListingDetail({ id }: { id: string }) {
  useLiveOfferUpdates();

  const queryClient = useQueryClient();
  const router = useRouter();

  const [showOfferCard, setShowOfferCard] = useState<boolean>(false);
  // True only while a mouse press that began on the backdrop itself is in
  // flight. A drag that starts inside the card (e.g. selecting the amount)
  // and releases over the backdrop fires a click on the backdrop, and must
  // not close the modal.
  const pressStartedOnBackdrop = useRef(false);
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
    queryFn: async (): Promise<Listing> => {
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
    mutationFn: async (): Promise<AnalyzeResponse> => {
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

  /** Highest offer first — the leading bid is the one that matters. */
  const offers = useMemo(
    () => [...(offerData ?? [])].sort((a, b) => b.amount - a.amount),
    [offerData],
  );
  const leadingOffer = offers[0];

  if (isListingError)
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <p className="text-negative text-sm font-semibold">
          Error loading listing details.
        </p>
      </div>
    );

  // The listing is the page's subject — until it lands there is nothing for
  // the rest of the page to hang off, so everything waits behind the skeleton.
  if (isListingLoading || !listing)
    return (
      <div className="pb-6">
        <ListingDetailSkeleton />
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <WakingUpNotice />
        </div>
      </div>
    );

  const metrics = listingMetrics(listing);
  const industry = industryMeta(listing.industry);
  const offerCount = listing.offersCount;

  return (
    <div className="animate-sb-fade-in pb-24 lg:pb-0">
      {/* Header */}
      <div className="border-line bg-surface border-b">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-5 sm:px-6 sm:pt-5 sm:pb-6">
          <Link
            href="/"
            className="text-quiet hover:text-brand mb-4 inline-block text-[13px] font-bold no-underline sm:mb-5"
          >
            ← Back to listings
          </Link>
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <ListingMonogram
              listing={listing}
              className="h-14 w-14 rounded-[15px] text-[23px] tracking-[-0.03em] sm:h-[68px] sm:w-[68px] sm:text-[29px]"
            />
            <div className="min-w-0 flex-1 basis-60">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <h1 className="m-0 text-[clamp(25px,5vw,38px)] leading-none tracking-[-0.038em]">
                  {listing.title}
                </h1>
                {listing.verified && (
                  <VerifiedBadge variant="detail" label="Financials verified" />
                )}
              </div>
              <div className="text-quiet text-[13.5px]">
                {industry.label} · {listing.location} · Established{" "}
                {listing.establishedYear}
              </div>
            </div>
            {!DEMO_MODE && (
              <button
                type="button"
                id="delButton"
                onClick={() => mutateDelete()}
                disabled={isDeleting}
                className="border-line-strong text-negative hover:border-negative rounded-[9px] border px-3 py-2 text-[13px] font-bold transition-colors disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo mosaic */}
      <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 sm:pt-6">
        <div className="grid grid-cols-1 gap-2 overflow-hidden rounded-[14px] sm:grid-cols-3 sm:grid-rows-2">
          <ListingPhoto
            listing={listing}
            index={0}
            eager
            sizes="(max-width: 640px) 100vw, 66vw"
            className="min-h-48 sm:col-span-2 sm:row-span-2 sm:min-h-[clamp(190px,28vw,330px)]"
          />
          <ListingPhoto
            listing={listing}
            index={1}
            showInitial={false}
            sizes="(max-width: 640px) 100vw, 33vw"
            className="hidden min-h-[90px] sm:block sm:min-h-[clamp(90px,13vw,161px)]"
          />
          <ListingPhoto
            listing={listing}
            index={2}
            showInitial={false}
            sizes="(max-width: 640px) 100vw, 33vw"
            className="hidden min-h-[90px] sm:block sm:min-h-[clamp(90px,13vw,161px)]"
          />
        </div>
      </div>

      <div className="mx-auto flex max-w-6xl flex-wrap items-start gap-6 px-4 pt-6 pb-14 sm:px-6 sm:pt-8 md:gap-10">
        {/* Left column */}
        <section className="min-w-0 flex-1 basis-[400px]">
          {/* Metrics */}
          <dl className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MetricTile
              label="Revenue / yr"
              value={shortMoney(metrics.annualRevenue)}
            />
            <MetricTile
              label="Cash flow / yr"
              value={shortMoney(metrics.annualCashFlow)}
            />
            <MetricTile
              label="Asking multiple"
              value={multiple(metrics.askingMultiple, 2)}
            />
            <MetricTile
              label="Cash flow multiple"
              value={multiple(metrics.cashFlowMultiple, 2)}
            />
            <MetricTile
              label="Established"
              value={String(listing.establishedYear)}
            />
            <MetricTile
              label="Leading offer"
              value={leadingOffer ? shortMoney(leadingOffer.amount) : "—"}
            />
          </dl>

          <h2 className="m-0 mb-2.5 text-[19px] tracking-[-0.028em]">
            About this business
          </h2>
          <p className="text-ink-soft m-0 mb-7 text-[16px] leading-relaxed text-pretty">
            {listing.description}
          </p>

          {/* Offers */}
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="m-0 text-[19px] tracking-[-0.028em]">
              Offer history
            </h2>
            <span className="text-quiet text-[12.5px] font-semibold">
              {leadingOffer
                ? `Leading offer ${money(leadingOffer.amount)} · ${percentOfAsk(leadingOffer.amount, listing.askingPrice)}`
                : "Open to first offer"}
            </span>
          </div>

          {isOfferLoading && !offerData ? (
            <div className="border-line bg-surface space-y-3 rounded-[13px] border p-4">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-6 w-32" />
            </div>
          ) : offers.length === 0 ? (
            <div className="border-line-strong text-quiet bg-surface rounded-[13px] border border-dashed p-7 text-center text-sm">
              No offers yet. Yours would be the first on the book.
            </div>
          ) : (
            <ul className="border-line bg-surface list-none overflow-hidden rounded-[13px] border p-0">
              {offers.map((offer, i) => (
                <li
                  key={offer._id}
                  className={`border-line-soft flex flex-wrap items-center gap-2.5 border-b px-4 py-3 last:border-b-0 ${
                    i === 0 ? "bg-[#fafcfa]" : ""
                  }`}
                >
                  <span className="tabular text-[17px] font-extrabold tracking-[-0.028em]">
                    {money(offer.amount)}
                  </span>
                  <span
                    className={`tabular inline-block rounded-full px-2.5 py-0.5 text-[11px] font-extrabold ${
                      i === 0
                        ? "bg-brand-tint-strong text-brand"
                        : "bg-line-soft text-quiet"
                    }`}
                  >
                    {percentOfAsk(offer.amount, listing.askingPrice)}
                  </span>
                  {i === 0 && offers.length > 1 && (
                    <span className="bg-brand rounded-full px-2.5 py-0.5 text-[10px] font-extrabold tracking-[0.05em] text-white uppercase">
                      Leading
                    </span>
                  )}
                  <span className="text-quiet ml-auto text-right text-[12.5px]">
                    {offer.bidderName} · {timeAgo(offer.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Sidebar */}
        <aside className="min-w-0 flex-1 basis-[300px] md:sticky md:top-[78px] md:max-w-[372px]">
          <div className="border-line bg-surface overflow-hidden rounded-2xl border shadow-[0_8px_22px_rgba(20,32,27,0.07)]">
            <div className="p-5">
              <div className="text-faint mb-1.5 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
                Asking price
              </div>
              <div className="tabular text-[clamp(30px,5.5vw,37px)] leading-none font-extrabold tracking-[-0.04em]">
                {money(listing.askingPrice)}
              </div>
              <div className="text-quiet mt-2.5 text-[12.5px]">
                {watchingLabel(listing.views)} · {offersLabelLower(offerCount)}
              </div>

              <button
                type="button"
                className="bg-brand hover:bg-brand-hover mt-4 w-full rounded-[10px] px-4 py-3 text-[14.5px] font-bold text-white transition-colors"
                onClick={() => setShowOfferCard(true)}
              >
                Make an offer
              </button>

              <button
                type="button"
                className="text-brand hover:border-brand mt-2.5 w-full rounded-[10px] border-[1.5px] border-[#c4d8cd] bg-white px-4 py-3 text-[13.5px] font-bold transition-colors hover:bg-[#f3f8f5] disabled:opacity-60"
                onClick={() => analyze()}
                disabled={isAnalyzing}
              >
                ✦ Analyze with AI
              </button>
            </div>

            {/* Loading skeletons */}
            {isAnalyzing && (
              <div className="border-line-soft bg-surface-muted border-t p-5">
                <p className="text-brand mb-3.5 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
                  ✦ AI ANALYSIS
                </p>
                <Skeleton className="h-7 w-32 rounded-full" />
                <Skeleton className="mt-4 h-3 w-24" />
                <Skeleton className="mt-2 h-6 w-44" />
                <div className="mt-4 space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              </div>
            )}

            {/* AI unavailable (unconfigured / daily budget spent) */}
            {analysis && !isAnalyzing && isAnalysisError(analysis) && (
              <div className="border-line-soft bg-surface-muted border-t p-5">
                <p className="text-brand mb-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
                  ✦ AI ANALYSIS
                </p>
                <p className="text-quiet text-sm">{analysis.error}</p>
              </div>
            )}

            {/* Loaded analysis */}
            {analysis && !isAnalyzing && !isAnalysisError(analysis) && (
              <div className="border-line-soft bg-surface-muted animate-sb-rise border-t p-5">
                <p className="text-brand mb-3 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
                  ✦ AI ANALYSIS
                </p>
                <span
                  className={`inline-block rounded-full px-3 py-1.5 text-[12.5px] font-extrabold ${verdictTone(
                    analysis,
                    listing.askingPrice,
                  )}`}
                >
                  {analysis.verdict}
                </span>

                <div className="mt-4">
                  <FairValueBand
                    low={analysis.fairValueLow}
                    high={analysis.fairValueHigh}
                    askingPrice={listing.askingPrice}
                  />
                </div>

                <ul className="mt-4 list-none space-y-2.5 border-t border-[#e4e2da] p-0 pt-3.5">
                  {analysis.points.map((point, i) => (
                    <li
                      key={i}
                      className="text-ink-soft flex gap-2 text-[13px] leading-normal"
                    >
                      <span className="text-brand shrink-0 font-extrabold">
                        ·
                      </span>
                      {point}
                    </li>
                  ))}
                  <li className="text-ink-soft flex gap-2 text-[13px] leading-normal">
                    <span className="text-brand shrink-0 font-extrabold">
                      ·
                    </span>
                    Suggested opening offer: {money(analysis.suggestedOffer)}
                  </li>
                </ul>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/*
        Mobile-only action bar. On desktop the sticky sidebar already keeps the
        price and CTA on screen, so repeating them there would be noise.
      */}
      <div className="border-line bg-surface fixed inset-x-0 bottom-0 z-30 flex items-center gap-3 border-t px-4 py-2.5 shadow-[0_-4px_18px_rgba(20,32,27,0.08)] lg:hidden">
        <div className="min-w-0">
          <div className="text-faint text-[10px] font-extrabold tracking-[0.08em] uppercase">
            Asking
          </div>
          <div className="tabular text-[19px] font-extrabold tracking-[-0.035em]">
            {money(listing.askingPrice)}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowOfferCard(true)}
          className="bg-brand hover:bg-brand-hover ml-auto rounded-[10px] px-5 py-3 text-[14px] font-bold whitespace-nowrap text-white transition-colors"
        >
          Make an offer
        </button>
      </div>

      {/* Offer modal */}
      {showOfferCard && (
        <div
          className="animate-sb-fade-in fixed inset-0 z-70 flex items-center justify-center bg-[rgba(11,26,20,0.5)] p-0 sm:p-6"
          onMouseDown={(e) => {
            pressStartedOnBackdrop.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            const releasedOnBackdrop = e.target === e.currentTarget;
            if (releasedOnBackdrop && pressStartedOnBackdrop.current) {
              setShowOfferCard(false);
            }
            pressStartedOnBackdrop.current = false;
          }}
        >
          <div
            className="animate-sb-rise bg-surface w-full max-w-[420px] overflow-hidden rounded-[18px] shadow-[0_24px_60px_rgba(0,0,0,0.3)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-brand px-5 py-4 text-white sm:px-6">
              <div className="mb-1 text-[10.5px] font-extrabold tracking-[0.11em] text-[#a9cdbb] uppercase">
                Make an offer
              </div>
              <div className="text-[20px] font-extrabold tracking-[-0.032em]">
                {listing.title}
              </div>
              <div className="text-brand-on-dark mt-0.5 text-[12.5px]">
                on {listing.title} · asking{" "}
                {money(listing.askingPrice)} ·{" "}
                {offersLabelLower(offerCount)}
              </div>
            </div>

            <div className="space-y-4 px-5 py-5 sm:px-6">
              <div className="space-y-2">
                <label
                  htmlFor="bidderName"
                  className="text-faint block text-[10.5px] font-extrabold tracking-[0.1em] uppercase"
                >
                  Your name
                </label>
                <input
                  value={offerForm.bidderName}
                  id="bidderName"
                  onChange={(e) =>
                    setOfferForm({ ...offerForm, bidderName: e.target.value })
                  }
                  className="border-line-strong text-ink focus:border-brand w-full rounded-[10px] border-[1.5px] bg-white px-3 py-3 text-[14.5px] focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="amount"
                  className="text-faint block text-[10.5px] font-extrabold tracking-[0.1em] uppercase"
                >
                  Your offer (USD)
                </label>
                <input
                  type="number"
                  min={1}
                  placeholder={listing.askingPrice.toString()}
                  value={offerForm.amount === 0 ? "" : offerForm.amount}
                  id="amount"
                  className="tabular border-line-strong text-ink focus:border-brand w-full rounded-[10px] border-[1.5px] bg-white px-3.5 py-3.5 text-[25px] font-extrabold tracking-[-0.03em] focus:outline-none"
                  onChange={(e) =>
                    setOfferForm({
                      ...offerForm,
                      amount: Number(e.target.value),
                    })
                  }
                />
                {/* Immediate feedback on how the offer reads against the ask. */}
                {offerForm.amount > 0 && (
                  <p className="text-quiet text-[12.5px] font-semibold">
                    {percentOfAsk(offerForm.amount, listing.askingPrice)}
                    {offerForm.amount < listing.askingPrice &&
                      ` · ${money(listing.askingPrice - offerForm.amount)} below ask`}
                    {offerForm.amount > listing.askingPrice &&
                      ` · ${money(offerForm.amount - listing.askingPrice)} above ask`}
                    {offerForm.amount === listing.askingPrice && " · at ask"}
                  </p>
                )}
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  className="bg-brand hover:bg-brand-hover flex-1 rounded-[10px] px-4 py-3 text-[14.5px] font-bold text-white transition-colors disabled:opacity-60"
                  disabled={isOfferLoading}
                  onClick={() => {
                    mutateOffer(offerForm);
                    setShowOfferCard(false);
                  }}
                >
                  Submit offer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowOfferCard(false);
                    setOfferForm({ amount: 0, bidderName: "" });
                  }}
                  className="border-line-strong text-ink hover:border-muted rounded-[10px] border-[1.5px] bg-white px-5 py-3 text-[14.5px] font-bold transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MetricTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-line bg-surface rounded-xl border px-4 py-3.5">
      <dt className="text-faint mb-1.5 text-[10px] font-extrabold tracking-[0.09em] uppercase">
        {label}
      </dt>
      <dd className="tabular text-[20px] font-extrabold tracking-[-0.03em]">
        {value}
      </dd>
    </div>
  );
}

import Link from "next/link";
import { ListingMonogram } from "./listing-photo";
import VerifiedBadge from "./verified-badge";
import { industryMeta, listingMetrics, type Listing } from "@/lib/listing";
import {
  multiple,
  offersLabel,
  shortMoney,
  watchingLabel,
} from "@/lib/format";

/**
 * The dense alternative to the card grid. Same figures, one line each, so a
 * buyer can compare multiples down a column instead of across cards.
 */
export default function ListingRow(listing: Listing) {
  const { annualRevenue, annualCashFlow, askingMultiple } =
    listingMetrics(listing);
  const industry = industryMeta(listing.industry);
  const hasOffers = listing.offersCount > 0;

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="border-line-soft hover:bg-surface-muted flex flex-wrap items-center gap-3 border-b px-3 py-3 transition-colors last:border-b-0 sm:gap-4 sm:px-4 sm:py-3.5"
    >
      <ListingMonogram
        listing={listing}
        className="h-[46px] w-[46px] text-[19px]"
      />

      <span className="min-w-0 flex-1 basis-44">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-[17px] font-extrabold tracking-[-0.028em]">
            {listing.title}
          </span>
          {listing.verified && <VerifiedBadge variant="inline" />}
        </span>
        <span className="text-quiet mt-0.5 block text-[12.5px]">
          {industry.label} · {listing.location} · {watchingLabel(listing.views)}
        </span>
      </span>

      <span className="ml-auto flex shrink-0 flex-wrap items-center gap-4 sm:gap-6">
        <RowMetric label="Revenue/yr" value={shortMoney(annualRevenue)} />
        <RowMetric label="Cash flow" value={shortMoney(annualCashFlow)} />
        <RowMetric label="Multiple" value={multiple(askingMultiple)} />
        <span className="text-right">
          <span className="text-faint block text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
            Asking
          </span>
          <span className="tabular block text-[19px] font-extrabold tracking-[-0.035em]">
            {shortMoney(listing.askingPrice)}
          </span>
        </span>
        <span
          className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${
            hasOffers
              ? "bg-brand-tint-strong text-brand"
              : "bg-line-soft text-quiet"
          }`}
        >
          {offersLabel(listing.offersCount)}
        </span>
      </span>
    </Link>
  );
}

function RowMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="hidden text-right sm:block">
      <span className="text-faint block text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
        {label}
      </span>
      <span className="tabular block text-[14.5px] font-bold tracking-[-0.02em]">
        {value}
      </span>
    </span>
  );
}

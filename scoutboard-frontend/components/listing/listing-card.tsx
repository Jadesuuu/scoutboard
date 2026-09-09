import Link from "next/link";
import ListingPhoto from "./listing-photo";
import VerifiedBadge from "./verified-badge";
import { industryMeta, listingMetrics, type Listing } from "@/lib/listing";
import {
  multiple,
  offersLabel,
  shortMoney,
  watchingLabel,
} from "@/lib/format";

/** Kept as the shared listing prop type; `Listing` is the canonical shape. */
export type ListingCardProps = Listing;

export default function ListingCard(listing: ListingCardProps) {
  const { annualRevenue, annualCashFlow, askingMultiple } =
    listingMetrics(listing);
  const industry = industryMeta(listing.industry);
  const hasOffers = listing.offersCount > 0;

  return (
    <Link
      href={`/listings/${listing._id}`}
      className="border-line bg-surface hover:border-line-strong group flex flex-col overflow-hidden rounded-[14px] border transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_26px_rgba(20,32,27,0.1)]"
    >
      {/* Photo */}
      <div className="relative aspect-[16/10]">
        <ListingPhoto
          listing={listing}
          className="absolute inset-0"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {listing.verified && (
          <span className="absolute top-3 right-3">
            <VerifiedBadge variant="onPhoto" />
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 px-4 pt-4 pb-4">
        <div>
          <div className="text-[18px] leading-tight font-extrabold tracking-[-0.03em]">
            {listing.title}
          </div>
          <div className="text-quiet mt-1 text-[12.5px]">
            {industry.label} · {listing.location}
          </div>
        </div>

        {/* The three figures buyers screen on */}
        <dl className="border-line-soft grid grid-cols-3 gap-1.5 border-y py-2.5">
          <Metric label="Revenue/yr" value={shortMoney(annualRevenue)} />
          <Metric label="Cash flow" value={shortMoney(annualCashFlow)} />
          <Metric label="Multiple" value={multiple(askingMultiple)} />
        </dl>

        <div className="mt-auto flex items-end justify-between gap-2.5">
          <div>
            <div className="eyebrow mb-0.5">Asking</div>
            <div className="tabular text-[21px] leading-none font-extrabold tracking-[-0.035em]">
              {shortMoney(listing.askingPrice)}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-extrabold whitespace-nowrap ${
                hasOffers
                  ? "bg-brand-tint-strong text-brand"
                  : "bg-line-soft text-quiet"
              }`}
            >
              {offersLabel(listing.offersCount)}
            </span>
            <div className="tabular text-faint mt-1.5 text-[11.5px]">
              {watchingLabel(listing.views)}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-faint mb-0.5 text-[9.5px] font-extrabold tracking-[0.07em] uppercase">
        {label}
      </dt>
      <dd className="tabular text-[14px] font-extrabold tracking-[-0.02em]">
        {value}
      </dd>
    </div>
  );
}

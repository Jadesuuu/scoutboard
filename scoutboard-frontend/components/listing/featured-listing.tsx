import Link from "next/link";
import { ListingMonogram } from "./listing-photo";
import { industryMeta, listingMetrics, type Listing } from "@/lib/listing";
import { multiple, money, shortMoney, watchingLabel } from "@/lib/format";

/**
 * The "most watched" card floating over the hero. Deliberately shows the same
 * three figures as a grid card so the hero teaches the card vocabulary before
 * a buyer reaches the grid.
 */
export default function FeaturedListing({ listing }: { listing: Listing }) {
  const { annualRevenue, annualCashFlow, askingMultiple } =
    listingMetrics(listing);
  const industry = industryMeta(listing.industry);

  return (
    <div className="bg-surface text-ink rounded-2xl p-4 shadow-[0_18px_44px_rgba(6,26,19,0.28)] sm:p-5">
      <div className="mb-3.5 flex items-center justify-between gap-2.5">
        <span className="text-quiet text-[11px] font-extrabold tracking-[0.11em] uppercase">
          Most watched
        </span>
        <span className="bg-brand-tint text-brand tabular rounded-full px-2.5 py-1 text-[11.5px] font-bold">
          {watchingLabel(listing.views)}
        </span>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <ListingMonogram
          listing={listing}
          className="h-[46px] w-[46px] text-[19px]"
        />
        <span className="min-w-0">
          <span className="block text-[18px] leading-tight font-extrabold tracking-[-0.025em]">
            {listing.title}
          </span>
          <span className="text-quiet mt-0.5 block text-[12.5px]">
            {industry.label} · {listing.location}
          </span>
        </span>
      </div>

      <dl className="border-line-soft mb-3.5 grid grid-cols-3 gap-2 border-y py-3">
        <Metric label="Revenue/yr" value={shortMoney(annualRevenue)} />
        <Metric label="Cash flow" value={shortMoney(annualCashFlow)} />
        <Metric label="Multiple" value={multiple(askingMultiple)} />
      </dl>

      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="eyebrow mb-0.5">Asking</div>
          <div className="tabular text-[26px] leading-none font-extrabold tracking-[-0.035em]">
            {money(listing.askingPrice)}
          </div>
        </div>
        <Link
          href={`/listings/${listing._id}`}
          className="bg-brand hover:bg-brand-hover rounded-[9px] px-4 py-2.5 text-[13.5px] font-bold whitespace-nowrap text-white transition-colors"
        >
          View deal
        </Link>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-faint mb-0.5 text-[10px] font-extrabold tracking-[0.08em] uppercase">
        {label}
      </dt>
      <dd className="tabular text-[15px] font-extrabold tracking-[-0.02em]">
        {value}
      </dd>
    </div>
  );
}

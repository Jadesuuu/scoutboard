import { listingMetrics, median, type Listing } from "@/lib/listing";
import { multiple, shortMoney } from "@/lib/format";

/**
 * The market summary strip under the hero. Medians rather than averages: one
 * unusually expensive listing shouldn't move the headline number.
 */
export default function MarketStats({ listings }: { listings: Listing[] }) {
  const askingPrices = listings.map((l) => l.askingPrice).filter(Boolean);
  const totalOffers = listings.reduce((sum, l) => sum + (l.offersCount ?? 0), 0);

  const multiples = listings
    .map((l) => listingMetrics(l).askingMultiple)
    .filter((m): m is number => m !== null);

  const stats = [
    { label: "Businesses listed", value: String(listings.length) },
    { label: "Median asking", value: shortMoney(median(askingPrices)) },
    { label: "Live offers", value: String(totalOffers) },
    {
      label: "Median multiple",
      value: multiples.length ? multiple(median(multiples)) : "—",
    },
  ];

  return (
    <div className="border-line bg-surface border-b">
      <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-4 sm:gap-5 sm:px-6">
        {stats.map((stat) => (
          <div key={stat.label}>
            <dt className="text-faint mb-1 text-[10.5px] font-extrabold tracking-[0.1em] uppercase">
              {stat.label}
            </dt>
            <dd className="tabular text-[17px] font-extrabold tracking-[-0.025em] sm:text-[21px]">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

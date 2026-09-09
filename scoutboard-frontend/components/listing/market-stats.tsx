import { Skeleton } from "@/components/ui/skeleton";
import { listingMetrics, median, type Listing } from "@/lib/listing";
import { multiple, shortMoney } from "@/lib/format";

/**
 * The market summary strip under the hero. Medians rather than averages: one
 * unusually expensive listing shouldn't move the headline number.
 *
 * While the listings are in flight the values are skeletons rather than the
 * zeros an empty array would compute to — a real "0 businesses listed" reads
 * as a fact, and it would be the wrong one.
 */
export default function MarketStats({
  listings,
  loading,
}: {
  listings: Listing[];
  loading: boolean;
}) {
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
            {loading ? (
              <dd className="m-0">
                <Skeleton className="h-[21px] w-16 sm:h-[26px] sm:w-20" />
              </dd>
            ) : (
              <dd className="tabular text-[17px] font-extrabold tracking-[-0.025em] sm:text-[21px]">
                {stat.value}
              </dd>
            )}
          </div>
        ))}
      </dl>
    </div>
  );
}

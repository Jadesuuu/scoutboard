import Link from "next/link";

export interface ListingCardProps {
  _id: string;
  title: string;
  industry: string;
  location: string;
  askingPrice: number;
  monthlyRevenue: number;
  description: string;
  color?: string;
  views: number;
  offersCount: number;
  establishedYear: number;
}

export default function ListingCard(Listing: ListingCardProps) {
  return (
    <Link href={`/listings/${Listing._id}`} className="block">
      <div className="overflow-hidden rounded-xl border border-stone-200 bg-white cursor-pointer hover:border-stone-300 hover:shadow-md transition-all h-80">
        {/* Thumbnail */}
        <div
          className="flex h-28 items-center justify-center"
          style={{ backgroundColor: Listing.color }}
        >
          <span
            className="font-serif text-5xl"
            style={{ color: "rgba(0,0,0,0.3)" }}
          >
            {Listing.title[0]}
          </span>
        </div>

        {/* Body */}
        <div className="p-4">
          <p className="text-sm font-semibold text-stone-900">
            {Listing.title}
          </p>
          <p className="mt-0.5 text-xs capitalize text-stone-400">
            {Listing.industry} · {Listing.location}
          </p>

          <p className="mt-2 line-clamp-2 text-xs text-stone-500">
            {Listing.description}
          </p>

          <p className="mt-3 text-lg font-semibold text-stone-900">
            ${Listing.askingPrice.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400">
            ${Listing.monthlyRevenue.toLocaleString()}/mo revenue
          </p>

          {/* Footer */}
          <div className="mt-3 flex justify-between border-t border-stone-100 pt-3">
            <div className="flex justify-between w-full text-xs text-stone-400">
              <span>
                {!Listing.offersCount
                  ? "No offers"
                  : Listing.offersCount === 1
                    ? "1 offer"
                    : `${Listing.offersCount} offers`}
              </span>
              <span>{Listing.views} views</span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

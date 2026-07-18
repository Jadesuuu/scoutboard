import { Card } from "@/components/ui/card";
import type { ListingCardProps } from "../listing/listing-card";
import Link from "next/link";

export default function ListingRow({
  _id,
  title,
  industry,
  location,
  askingPrice,
  offersCount,
  views,
  color,
}: ListingCardProps) {
  return (
    <Link href={`/listings/${_id}`} className="block">
      <Card className="mb-3 flex flex-row items-center gap-4 p-4 cursor-pointer hover:border-stone-300 hover:shadow-md transition-all rounded-lg min-w-6xl">
        {/* Thumbnail */}
        <div
          className="flex h-13 w-13 shrink-0 items-center justify-center rounded-lg"
          style={{ backgroundColor: color }}
        >
          <span
            className="font-serif text-xl"
            style={{ color: "rgba(0,0,0,0.3)" }}
          >
            {title[0]}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-stone-900">{title}</p>
          <p className="text-xs text-stone-400">
            {industry} · {location}
          </p>
        </div>

        {/* Price */}
        <div className="shrink-0 text-right">
          <p className="text-sm font-semibold text-stone-900">
            ${askingPrice.toLocaleString()}
          </p>
          <p className="text-xs text-stone-400">
            {offersCount === 0
              ? "No offers"
              : offersCount === 1
                ? "1 offer"
                : `${offersCount} offers`}{" "}
            · {views} views
          </p>
        </div>
      </Card>
    </Link>
  );
}

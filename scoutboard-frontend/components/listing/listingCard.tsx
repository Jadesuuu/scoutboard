export interface ListingCardProps {
  title: string
  industry: string
  location: string
  askingPrice: number
  monthlyRevenue: number
  description: string
  color: string
  offers?: number // backend will add this later
}

export default function ListingCard({
  title, industry, location, askingPrice, monthlyRevenue, description, color, offers,
}: ListingCardProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-stone-200 bg-white cursor-pointer hover:border-stone-300 hover:shadow-md transition-all">

      {/* Thumbnail */}
      <div
        className="flex h-28 items-center justify-center"
        style={{ backgroundColor: color }}
      >
        <span className="font-serif text-5xl" style={{ color: "rgba(0,0,0,0.3)" }}>
          {title[0]}
        </span>
      </div>

      {/* Body */}
      <div className="p-4">
        <p className="text-sm font-semibold text-stone-900">{title}</p>
        <p className="mt-0.5 text-xs capitalize text-stone-400">{industry} · {location}</p>

        <p className="mt-2 line-clamp-2 text-xs text-stone-500">{description}</p>

        <p className="mt-3 text-lg font-semibold text-stone-900">
          ${askingPrice.toLocaleString()}
        </p>
        <p className="text-xs text-stone-400">
          ${monthlyRevenue.toLocaleString()}/mo revenue
        </p>

        {/* Footer */}
        <div className="mt-3 flex justify-between border-t border-stone-100 pt-3">
          <span className="text-xs text-stone-400">
            {!offers ? "No offers" : offers === 1 ? "1 offer" : `${offers} offers`}
          </span>
        </div>
      </div>

    </div>
  )
}

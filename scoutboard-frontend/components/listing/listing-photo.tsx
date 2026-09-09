import Image from "next/image";
import { photosForListing, type Photo } from "@/lib/photos";
import { industryMeta, type Listing } from "@/lib/listing";
import { cn } from "@/lib/utils";

type PhotoSubject = Pick<Listing, "_id" | "title" | "industry">;

/**
 * A listing's photo, with the industry tint behind it as the loading ground
 * and the business's initial as the fallback if no photo resolves.
 *
 * Photos are chosen from a committed CC0 library (see lib/photos.ts) keyed off
 * the listing's own name — real listings on a marketplace like this would carry
 * seller-uploaded images, and this stands in for that without leaving grey
 * boxes across the grid.
 */
export default function ListingPhoto({
  listing,
  index = 0,
  className,
  sizes,
  preload = false,
  eager = false,
  showInitial = true,
}: {
  listing: PhotoSubject;
  /** Which photo from the listing's set — the detail mosaic uses 0, 1 and 2. */
  index?: number;
  className?: string;
  sizes?: string;
  /**
   * Emit a `<link rel=preload>`. Only for a single, unambiguous LCP image —
   * Next 16 replaced the old `priority` prop with this.
   */
  preload?: boolean;
  /**
   * Load immediately without preloading. The right choice when several images
   * could be the LCP element depending on viewport, as in the detail mosaic.
   */
  eager?: boolean;
  showInitial?: boolean;
}) {
  const { tintBg, tintFg } = industryMeta(listing.industry);
  const photos = photosForListing(listing, index + 1);
  const photo: Photo | undefined = photos[index];
  const initial = (listing.title?.charAt(0) ?? "?").toUpperCase();

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ backgroundColor: tintBg }}
    >
      {photo ? (
        <Image
          src={photo.src}
          alt={`${listing.title} — ${photo.title ?? "business photo"}`}
          fill
          sizes={sizes ?? "(max-width: 640px) 100vw, 33vw"}
          preload={preload}
          {...(eager
            ? { loading: "eager" as const, fetchPriority: "high" as const }
            : {})}
          placeholder="blur"
          blurDataURL={photo.blurDataURL}
          className="object-cover"
        />
      ) : (
        showInitial && (
          <span
            aria-hidden
            className="absolute inset-0 flex items-center justify-center text-5xl font-extrabold tracking-[-0.045em] opacity-50"
            style={{ color: tintFg }}
          >
            {initial}
          </span>
        )
      )}
    </div>
  );
}

/**
 * The square tinted monogram used where a photo would be too small to read —
 * list rows and the detail-page header.
 */
export function ListingMonogram({
  listing,
  className,
}: {
  listing: PhotoSubject;
  className?: string;
}) {
  const { tintBg, tintFg } = industryMeta(listing.industry);
  const initial = (listing.title?.charAt(0) ?? "?").toUpperCase();

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-[11px] font-extrabold",
        className,
      )}
      style={{ backgroundColor: tintBg, color: tintFg }}
    >
      {initial}
    </span>
  );
}

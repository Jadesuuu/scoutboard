import { cn } from "@/lib/utils";

type Variant = "onPhoto" | "inline" | "detail";

const VARIANTS: Record<Variant, string> = {
  /** Sits on top of a listing photo, so it needs its own opaque ground. */
  onPhoto: "bg-white/95 text-brand px-2.5 py-1 text-[10.5px]",
  /** Beside a listing title in a row or card. */
  inline: "bg-brand-tint text-brand px-2 py-0.5 text-[10px]",
  /** Beside the detail-page headline. */
  detail: "bg-brand-tint text-brand px-2.5 py-1 text-[11px]",
};

/**
 * Shown when the platform has checked a seller's books. Absent rather than
 * negative for unverified listings — "not yet verified" on every other card
 * would read as an accusation.
 */
export default function VerifiedBadge({
  variant = "inline",
  label = "Verified",
  className,
}: {
  variant?: Variant;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full font-extrabold tracking-[0.04em] uppercase",
        VARIANTS[variant],
        className,
      )}
    >
      <svg
        viewBox="0 0 12 12"
        aria-hidden
        className="h-2.5 w-2.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M2 6.4 4.6 9 10 3.2" />
      </svg>
      {label}
    </span>
  );
}

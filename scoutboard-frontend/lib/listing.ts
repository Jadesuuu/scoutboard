/**
 * The listing shape the API returns, plus the derived figures the UI shows.
 *
 * Buyers on a marketplace like this filter on numbers first, so the derived
 * multiples live here rather than being recomputed in each component.
 */

export interface Listing {
  _id: string;
  title: string;
  industry: string;
  location: string;
  askingPrice: number;
  monthlyRevenue: number;
  /** Absent on listings created before the field existed. */
  monthlyCashFlow?: number;
  description: string;
  views: number;
  offersCount: number;
  establishedYear: number;
  /** Granted by the platform after a books check; absent means unverified. */
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * The five industries the API accepts (`CreateListingDto`'s `@IsIn`), with the
 * display label and the tint used when a listing has no photo of its own.
 */
export const INDUSTRIES = [
  { value: "food", label: "Food", tintBg: "#F0E2C4", tintFg: "#6B4C18" },
  { value: "retail", label: "Retail", tintBg: "#CFE1E0", tintFg: "#1B4442" },
  { value: "services", label: "Services", tintBg: "#D5DCE6", tintFg: "#2B3A50" },
  { value: "tech", label: "Tech", tintBg: "#E0DCEC", tintFg: "#3A2E5C" },
  { value: "others", label: "Others", tintBg: "#E1E0D8", tintFg: "#454F49" },
] as const;

export type IndustryValue = (typeof INDUSTRIES)[number]["value"];

const FALLBACK_INDUSTRY = {
  value: "others",
  label: "Other",
  tintBg: "#E1E0D8",
  tintFg: "#454F49",
} as const;

/** Label and tint for an industry, tolerant of values outside the enum. */
export function industryMeta(industry: string | undefined) {
  if (!industry) return FALLBACK_INDUSTRY;
  return (
    INDUSTRIES.find((i) => i.value === industry.toLowerCase()) ?? {
      ...FALLBACK_INDUSTRY,
      // An unknown value is still worth showing, just title-cased.
      label: industry.charAt(0).toUpperCase() + industry.slice(1),
    }
  );
}

export interface ListingMetrics {
  annualRevenue: number | null;
  annualCashFlow: number | null;
  /** Asking price ÷ annual revenue — the headline multiple buyers screen on. */
  askingMultiple: number | null;
  /** Asking price ÷ annual cash flow, i.e. years to earn the price back. */
  cashFlowMultiple: number | null;
  /** Cash flow as a share of revenue, 0–1. */
  margin: number | null;
}

/**
 * Derive the figures shown on cards and the detail page. Every field is
 * nullable: a listing with no cash-flow figure must render an em dash, not a
 * zero that reads as "this business makes nothing".
 */
export function listingMetrics(
  listing: Pick<Listing, "askingPrice" | "monthlyRevenue" | "monthlyCashFlow">,
): ListingMetrics {
  const { askingPrice, monthlyRevenue, monthlyCashFlow } = listing;

  const annualRevenue = monthlyRevenue > 0 ? monthlyRevenue * 12 : null;
  const annualCashFlow =
    monthlyCashFlow && monthlyCashFlow > 0 ? monthlyCashFlow * 12 : null;

  return {
    annualRevenue,
    annualCashFlow,
    askingMultiple:
      annualRevenue && askingPrice > 0 ? askingPrice / annualRevenue : null,
    cashFlowMultiple:
      annualCashFlow && askingPrice > 0 ? askingPrice / annualCashFlow : null,
    margin: annualRevenue && annualCashFlow ? annualCashFlow / annualRevenue : null,
  };
}

/** Median of a numeric list; 0 for an empty list. */
export function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

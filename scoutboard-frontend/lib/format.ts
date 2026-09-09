/** Number and label formatting shared across the listing views. */

/** Full currency, e.g. `$145,000`. Used where precision matters. */
export function money(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

/**
 * Compact currency for dense metric slots, e.g. `$1.2M`, `$145k`.
 * Cards show several figures side by side, and full numbers wrap.
 */
export function shortMoney(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  const n = Math.abs(value);
  if (n >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(value / 1_000)}k`;
  return `$${Math.round(value)}`;
}

/** A multiple, e.g. `2.4×`. `places` is 1 on cards, 2 on the detail page. */
export function multiple(value: number | null | undefined, places = 1) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return "—";
  }
  return `${value.toFixed(places)}×`;
}

/** `No offers` / `1 offer` / `7 offers`. */
export function offersLabel(count: number | null | undefined) {
  if (!count) return "No offers";
  return count === 1 ? "1 offer" : `${count} offers`;
}

/** Lowercase variant for mid-sentence use, e.g. "312 watching · 2 offers". */
export function offersLabelLower(count: number | null | undefined) {
  if (!count) return "no offers";
  return count === 1 ? "1 offer" : `${count} offers`;
}

/** The design frames views as attention rather than a raw counter. */
export function watchingLabel(views: number | null | undefined) {
  return `${(views ?? 0).toLocaleString("en-US")} watching`;
}

/** An offer as a share of the asking price, e.g. `95% of ask`. */
export function percentOfAsk(amount: number, askingPrice: number) {
  if (!askingPrice) return "—";
  return `${Math.round((amount / askingPrice) * 100)}% of ask`;
}

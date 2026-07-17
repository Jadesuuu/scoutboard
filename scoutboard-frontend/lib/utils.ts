import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Deterministic pastel color from any string (e.g. a listing id).
// Same input always yields the same color, so cards don't flicker on re-render.
export function colorFromString(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0;
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 82%)`;
}

const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

// Approximate relative time, e.g. "5 minutes ago", "2 hours ago", "yesterday".
export function timeAgo(date: string | Date) {
  const seconds = Math.round((new Date(date).getTime() - Date.now()) / 1000);

  const divisions: [number, Intl.RelativeTimeFormatUnit][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.34524, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = seconds;
  for (const [amount, unit] of divisions) {
    if (Math.abs(value) < amount) return rtf.format(Math.round(value), unit);
    value /= amount;
  }
  return rtf.format(Math.round(value), "year");
}

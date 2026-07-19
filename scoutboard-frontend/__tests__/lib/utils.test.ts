import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cn, colorFromString, timeAgo } from "@/lib/utils";

describe("cn", () => {
  it("merges class names and resolves tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("colorFromString", () => {
  it("is deterministic for the same seed", () => {
    expect(colorFromString("abc123")).toBe(colorFromString("abc123"));
  });

  it("returns an hsl pastel string", () => {
    expect(colorFromString("listing-id")).toMatch(/^hsl\(\d{1,3} 65% 82%\)$/);
  });

  it("handles the empty string (hash 0)", () => {
    expect(colorFromString("")).toBe("hsl(0 65% 82%)");
  });
});

describe("timeAgo", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-19T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats seconds", () => {
    expect(timeAgo(new Date("2026-07-19T11:59:30Z"))).toBe("30 seconds ago");
  });

  it("formats minutes", () => {
    expect(timeAgo(new Date("2026-07-19T11:55:00Z"))).toBe("5 minutes ago");
  });

  it("formats hours", () => {
    expect(timeAgo(new Date("2026-07-19T10:00:00Z"))).toBe("2 hours ago");
  });

  it("formats days", () => {
    expect(timeAgo(new Date("2026-07-17T12:00:00Z"))).toBe("2 days ago");
  });

  it("formats weeks", () => {
    expect(timeAgo(new Date("2026-07-05T12:00:00Z"))).toBe("2 weeks ago");
  });

  it("formats months", () => {
    expect(timeAgo(new Date("2026-05-19T12:00:00Z"))).toBe("2 months ago");
  });

  it("formats years", () => {
    expect(timeAgo(new Date("2024-07-19T12:00:00Z"))).toBe("2 years ago");
  });

  it("accepts ISO strings and handles future dates", () => {
    expect(timeAgo("2026-07-19T12:00:30Z")).toBe("in 30 seconds");
  });

  it("throws on an unparseable date (NaN falls through every division)", () => {
    // NaN < amount is false for every division, so the loop exhausts and the
    // final rtf.format(NaN, 'year') call rejects the non-finite value.
    expect(() => timeAgo("not-a-date")).toThrow(RangeError);
  });
});

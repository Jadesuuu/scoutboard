import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/app/page";
import type { ListingProps } from "@/components/hooks/use-live-listing-updates";

// The browse page opens a socket for live listing pushes.
const { io } = vi.hoisted(() => ({
  io: vi.fn(() => ({ on: vi.fn(), disconnect: vi.fn() })),
}));
vi.mock("socket.io-client", () => ({ io }));

const listing = (over: Partial<ListingProps> = {}): ListingProps => ({
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  monthlyCashFlow: 1500,
  description: "A cozy cafe",
  createdAt: "2026-07-19T00:00:00Z",
  updatedAt: "2026-07-19T00:00:00Z",
  offersCount: 2,
  views: 42,
  establishedYear: 2015,
  verified: false,
  ...over,
});

/** Only rows fold watchers into the meta line, so this tells the views apart. */
const ROW_META = /Food · NYC · 42 watching/;

function renderHome() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <Home />
    </QueryClientProvider>,
  );
}

const mockFetchListings = (listings: ListingProps[]) => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => listings,
    }),
  );
};

describe("Home", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it("shows the loading skeletons while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderHome();
    expect(
      screen.getByRole("status", { name: "Loading listings" }),
    ).toBeInTheDocument();
  });

  it("shows the error message when the API fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 500 }),
    );
    renderHome();
    // Note: testing-library normalizes the double space in "API Error:  500".
    expect(await screen.findByText("API Error: 500")).toBeInTheDocument();
  });

  it("shows the empty state when there are no listings", async () => {
    mockFetchListings([]);
    renderHome();
    expect(await screen.findByText("No listings found.")).toBeInTheDocument();
    expect(screen.getByText("0 businesses")).toBeInTheDocument();
  });

  it("renders listings as cards in the default grid view", async () => {
    mockFetchListings([listing(), listing({ _id: "l2", title: "Bookstore" })]);
    renderHome();

    // The most-watched listing also appears in the hero, so match all.
    expect((await screen.findAllByText("Copper Kettle")).length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("Bookstore")).toBeInTheDocument();
    expect(screen.getByText("2 businesses")).toBeInTheDocument();
    expect(screen.queryByText(ROW_META)).not.toBeInTheDocument();
  });

  it("renders the market summary from the listings", async () => {
    mockFetchListings([listing(), listing({ _id: "l2", askingPrice: 80000 })]);
    renderHome();

    await screen.findAllByText("Copper Kettle");
    expect(screen.getByText("Businesses listed")).toBeInTheDocument();
    expect(screen.getByText("Median asking")).toBeInTheDocument();
    expect(screen.getByText("Median multiple")).toBeInTheDocument();
    // Two listings, two offers each.
    expect(screen.getByText("Live offers")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("switches to list view and back, persisting the choice", async () => {
    mockFetchListings([listing()]);
    renderHome();
    await screen.findAllByText("Copper Kettle");

    fireEvent.click(screen.getByRole("button", { name: "Rows" }));
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("list"),
    );
    expect(screen.getByText(ROW_META)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Cards" }));
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("grid"),
    );
    expect(screen.queryByText(ROW_META)).not.toBeInTheDocument();
  });

  it("restores a saved list view from localStorage", async () => {
    localStorage.setItem("browse-view", "list");
    mockFetchListings([listing()]);
    renderHome();

    expect(await screen.findByText(ROW_META)).toBeInTheDocument();
  });

  it("falls back to grid for a garbage localStorage value", async () => {
    localStorage.setItem("browse-view", "sideways");
    mockFetchListings([listing()]);
    renderHome();

    await screen.findAllByText("Copper Kettle");
    expect(screen.queryByText(ROW_META)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("grid"),
    );
  });

  it("filters by industry and reflects the count", async () => {
    mockFetchListings([
      listing(),
      listing({ _id: "l2", title: "Pixel Studio", industry: "tech" }),
    ]);
    renderHome();
    await screen.findByText("2 businesses");

    fireEvent.click(screen.getByRole("button", { name: "Tech" }));

    expect(screen.getByText("1 business in Tech")).toBeInTheDocument();
    expect(screen.getByText("Pixel Studio")).toBeInTheDocument();
    // The filter drops it from the grid. The hero highlights the most-watched
    // listing market-wide, so its one remaining mention is that card.
    expect(screen.getAllByText("Copper Kettle")).toHaveLength(1);
  });

  it("sorts by asking price when asked", async () => {
    mockFetchListings([
      listing({ _id: "cheap", title: "Cheap Co", askingPrice: 10000 }),
      listing({ _id: "pricey", title: "Pricey Co", askingPrice: 900000 }),
    ]);
    renderHome();
    await screen.findByText("2 businesses");

    fireEvent.change(screen.getByLabelText("Sort listings"), {
      target: { value: "priceAsc" },
    });

    const titles = screen
      .getAllByRole("link")
      .map((a) => a.textContent ?? "")
      .filter((t) => t.includes("Co"));
    expect(titles[0]).toContain("Cheap Co");
  });
});

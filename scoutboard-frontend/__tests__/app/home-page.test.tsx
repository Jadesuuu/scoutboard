import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/app/page";
import type { ListingProps } from "@/components/hooks/use-live-listing-updates";

const listing = (over: Partial<ListingProps> = {}): ListingProps => ({
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  description: "A cozy cafe",
  createdAt: "2026-07-19T00:00:00Z",
  updatedAt: "2026-07-19T00:00:00Z",
  offersCount: 2,
  views: 42,
  establishedYear: 2015,
  ...over,
});

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
    vi.unstubAllGlobals();
  });

  it("shows the loading state while fetching", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderHome();
    expect(screen.getByText("loading...")).toBeInTheDocument();
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
    expect(screen.getByText("0 businesses for sale")).toBeInTheDocument();
  });

  it("renders listings as cards in the default grid view", async () => {
    mockFetchListings([listing(), listing({ _id: "l2", title: "Bookstore" })]);
    renderHome();

    expect(await screen.findByText("Copper Kettle")).toBeInTheDocument();
    expect(screen.getByText("Bookstore")).toBeInTheDocument();
    expect(screen.getByText("2 businesses for sale")).toBeInTheDocument();
    // Card view shows the description; row view does not.
    expect(screen.getAllByText("A cozy cafe").length).toBeGreaterThan(0);
  });

  it("switches to list view and back, persisting the choice", async () => {
    mockFetchListings([listing()]);
    renderHome();
    await screen.findByText("Copper Kettle");

    fireEvent.click(screen.getByRole("button", { name: "List" }));
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("list"),
    );
    // Row view renders the combined offers/views line; grid view does not.
    expect(screen.getByText(/2 offers · 42 views/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Grid" }));
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("grid"),
    );
    expect(screen.queryByText(/2 offers · 42 views/)).not.toBeInTheDocument();
  });

  it("restores a saved list view from localStorage", async () => {
    localStorage.setItem("browse-view", "list");
    mockFetchListings([listing()]);
    renderHome();

    expect(await screen.findByText(/2 offers · 42 views/)).toBeInTheDocument();
  });

  it("falls back to grid for a garbage localStorage value", async () => {
    localStorage.setItem("browse-view", "sideways");
    mockFetchListings([listing()]);
    renderHome();

    await screen.findByText("Copper Kettle");
    expect(screen.queryByText(/2 offers · 42 views/)).not.toBeInTheDocument();
    await waitFor(() =>
      expect(localStorage.getItem("browse-view")).toBe("grid"),
    );
  });
});

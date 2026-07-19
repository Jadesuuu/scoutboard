import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import ListingDetail from "@/components/listing/listing-detail";
import type { OfferProps } from "@/components/hooks/use-live-offer-updates";

const { io, routerBack, toast } = vi.hoisted(() => ({
  io: vi.fn(() => ({ on: vi.fn(), disconnect: vi.fn() })),
  routerBack: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock("socket.io-client", () => ({ io }));
vi.mock("sonner", () => ({ toast }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ back: routerBack }),
}));

const LISTING = {
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  description: "A cozy cafe",
  views: 42,
  offersCount: 2,
  establishedYear: 2015,
};

const OFFERS: OfferProps[] = [
  {
    _id: "o1",
    listingId: "l1",
    amount: 90000,
    bidderName: "Jane Doe",
    createdAt: new Date(Date.now() - 60_000).toISOString(),
  },
  {
    _id: "o2",
    listingId: "l1",
    amount: 85000,
    bidderName: "Sam Roe",
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
  },
];

const ANALYSIS = {
  verdict: "Fairly priced",
  fairValueLow: 100000,
  fairValueHigh: 140000,
  points: ["Steady revenue", "Prime location"],
  suggestedOffer: 110000,
};

type RouteMap = Record<string, () => Promise<unknown> | unknown>;

/** Route-based fetch stub keyed by "METHOD path". */
function stubFetch(routes: RouteMap) {
  const calls: { url: string; init?: RequestInit }[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      const method = init?.method ?? "GET";
      const path = url.replace("http://api.test", "");
      const handler = routes[`${method} ${path}`];
      if (!handler) return { ok: false, status: 404 };
      const body = await handler();
      if (body instanceof Error) return { ok: false, status: 500 };
      return { ok: true, json: async () => body };
    }),
  );
  return calls;
}

const happyRoutes = (): RouteMap => ({
  "GET /listings/l1": () => LISTING,
  "GET /listings/l1/offers": () => OFFERS,
});

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ListingDetail id="l1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("ListingDetail", () => {
  it("shows the spinner while both queries load", () => {
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(new Promise(() => {})));
    renderDetail();
    expect(screen.getByText("Processing your request")).toBeInTheDocument();
  });

  it("shows an error message when the listing query fails", async () => {
    stubFetch({
      "GET /listings/l1": () => new Error("boom"),
      "GET /listings/l1/offers": () => OFFERS,
    });
    renderDetail();
    expect(
      await screen.findByText("Error loading listing details."),
    ).toBeInTheDocument();
  });

  it("renders the listing, stats and offers", async () => {
    stubFetch(happyRoutes());
    renderDetail();

    expect(await screen.findByText("Copper Kettle")).toBeInTheDocument();
    expect(screen.getByText("food · NYC")).toBeInTheDocument();
    expect(screen.getByText("A cozy cafe")).toBeInTheDocument();
    expect(screen.getByText("$5,000")).toBeInTheDocument(); // monthly revenue
    expect(screen.getByText("2015")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument(); // asking price
    expect(screen.getByText("42 views · 2 offers")).toBeInTheDocument();

    // Offers list
    expect(screen.getByText("$90,000")).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe ·/)).toBeInTheDocument();
    expect(screen.getByText("$85,000")).toBeInTheDocument();
    expect(screen.getByText(/Sam Roe ·/)).toBeInTheDocument();
  });

  it('shows "No offers yet." when the listing has no offers', async () => {
    stubFetch({
      "GET /listings/l1": () => LISTING,
      "GET /listings/l1/offers": () => [],
    });
    renderDetail();
    expect(await screen.findByText("No offers yet.")).toBeInTheDocument();
  });

  it('shows "No offers yet." while offers are still undefined (offers query failed)', async () => {
    stubFetch({
      "GET /listings/l1": () => LISTING,
      "GET /listings/l1/offers": () => new Error("boom"),
    });
    renderDetail();
    expect(await screen.findByText("No offers yet.")).toBeInTheDocument();
  });

  it("renders the page shell with optional fields blank while the listing is still loading", async () => {
    // Offers resolve, listing hangs: page renders with listing undefined.
    stubFetch({
      "GET /listings/l1/offers": () => OFFERS,
      "GET /listings/l1": () => new Promise(() => {}),
    });
    renderDetail();

    expect(await screen.findByText("$90,000")).toBeInTheDocument();
    expect(screen.getByText("← Back to listings")).toBeInTheDocument();
  });

  describe("make an offer", () => {
    async function openModal() {
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/offers": () => ({ _id: "o3" }),
      });
      renderDetail();
      fireEvent.click(
        await screen.findByRole("button", { name: "Make an offer" }),
      );
      return screen.getByText("Make an offer", { selector: "div" });
    }

    it("opens the modal with the listing summary", async () => {
      await openModal();
      expect(
        screen.getByText(/on Copper Kettle · asking \$120,000/),
      ).toBeInTheDocument();
    });

    it("submits the filled form and toasts success", async () => {
      const calls = stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/offers": () => ({ _id: "o3" }),
      });
      renderDetail();
      fireEvent.click(
        await screen.findByRole("button", { name: "Make an offer" }),
      );

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "New Bidder" },
      });
      fireEvent.change(screen.getByRole("spinbutton"), {
        target: { value: "99000" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Submit offer" }));

      await waitFor(() => expect(toast.success).toHaveBeenCalled());
      const post = calls.find((c) => c.init?.method === "POST");
      expect(post).toBeDefined();
      expect(JSON.parse(post!.init!.body as string)).toEqual({
        amount: 99000,
        bidderName: "New Bidder",
      });
      // Modal closed on submit.
      expect(
        screen.queryByRole("button", { name: "Submit offer" }),
      ).not.toBeInTheDocument();
    });

    it("toasts an error when the offer POST fails", async () => {
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/offers": () => new Error("boom"),
      });
      renderDetail();
      fireEvent.click(
        await screen.findByRole("button", { name: "Make an offer" }),
      );
      fireEvent.click(screen.getByRole("button", { name: "Submit offer" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("closes and resets via the Cancel button", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      fireEvent.click(
        await screen.findByRole("button", { name: "Make an offer" }),
      );

      fireEvent.change(screen.getByRole("textbox"), {
        target: { value: "typed" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.queryByRole("button", { name: "Submit offer" }),
      ).not.toBeInTheDocument();

      // Re-open: the form was reset.
      fireEvent.click(screen.getByRole("button", { name: "Make an offer" }));
      expect(screen.getByRole("textbox")).toHaveValue("");
    });

    it("closes on backdrop click but not on clicks inside the card", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      fireEvent.click(
        await screen.findByRole("button", { name: "Make an offer" }),
      );

      // Click inside the card: stays open (stopPropagation).
      fireEvent.click(screen.getByText(/on Copper Kettle/));
      expect(
        screen.getByRole("button", { name: "Submit offer" }),
      ).toBeInTheDocument();

      // Click the backdrop: closes.
      const backdrop = document.querySelector(".fixed.inset-0")!;
      fireEvent.click(backdrop);
      expect(
        screen.queryByRole("button", { name: "Submit offer" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("AI analysis", () => {
    it("shows skeletons while analyzing, then the result", async () => {
      let resolveAnalysis!: (v: typeof ANALYSIS) => void;
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/analyze": () =>
          new Promise((res) => (resolveAnalysis = res)),
      });
      renderDetail();

      fireEvent.click(
        await screen.findByRole("button", { name: "✦ Analyze with AI" }),
      );

      // Pending: the skeleton block renders under the AI ANALYSIS heading.
      const heading = await screen.findByText("✦ AI ANALYSIS");
      expect(heading).toBeInTheDocument();
      expect(screen.queryByText("Fairly priced")).not.toBeInTheDocument();

      resolveAnalysis(ANALYSIS);

      expect(await screen.findByText("Fairly priced")).toBeInTheDocument();
      expect(screen.getByText("$100,000 – $140,000")).toBeInTheDocument();
      expect(screen.getByText("Steady revenue")).toBeInTheDocument();
      expect(screen.getByText("Prime location")).toBeInTheDocument();
      expect(
        screen.getByText(/Suggested opening offer: \$110,000/),
      ).toBeInTheDocument();
    });

    it("renders nothing extra when the analysis request fails", async () => {
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/analyze": () => new Error("boom"),
      });
      renderDetail();

      fireEvent.click(
        await screen.findByRole("button", { name: "✦ Analyze with AI" }),
      );

      await waitFor(() =>
        expect(screen.queryByText("✦ AI ANALYSIS")).not.toBeInTheDocument(),
      );
      expect(screen.queryByText("Fairly priced")).not.toBeInTheDocument();
    });
  });

  describe("delete", () => {
    it("deletes the listing, toasts and navigates back", async () => {
      const calls = stubFetch({
        ...happyRoutes(),
        "DELETE /listings/l1/delete": () => ({}),
      });
      renderDetail();

      fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

      await waitFor(() => expect(routerBack).toHaveBeenCalled());
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully deleted business",
        expect.anything(),
      );
      expect(
        calls.some((c) => c.init?.method === "DELETE"),
      ).toBe(true);
    });

    it("does not navigate when the delete fails", async () => {
      stubFetch({
        ...happyRoutes(),
        "DELETE /listings/l1/delete": () => new Error("boom"),
      });
      renderDetail();

      fireEvent.click(await screen.findByRole("button", { name: "Delete" }));

      // Give the mutation time to settle.
      await waitFor(() =>
        expect(
          (global.fetch as ReturnType<typeof vi.fn>).mock.calls.some(
            (c) => (c[1] as RequestInit | undefined)?.method === "DELETE",
          ),
        ).toBe(true),
      );
      expect(routerBack).not.toHaveBeenCalled();
    });
  });
});

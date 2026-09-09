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
  monthlyCashFlow: 1500,
  description: "A cozy cafe",
  views: 42,
  offersCount: 2,
  establishedYear: 2015,
  verified: true,
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

/**
 * The sidebar and the mobile action bar both offer the CTA; CSS hides one per
 * viewport, but jsdom applies no CSS so both are in the tree.
 */
const offerButtons = () =>
  screen.getAllByRole("button", { name: "Make an offer" });

async function openOfferModal() {
  const buttons = await waitFor(() => offerButtons());
  fireEvent.click(buttons[0]);
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

  it("renders the listing, metrics and offers", async () => {
    stubFetch(happyRoutes());
    renderDetail();

    expect(await screen.findByText("Copper Kettle")).toBeInTheDocument();
    expect(
      screen.getByText(/Food · NYC · Established 2015/),
    ).toBeInTheDocument();
    expect(screen.getByText("A cozy cafe")).toBeInTheDocument();
    expect(screen.getByText("Financials verified")).toBeInTheDocument();

    // Metric tiles, annualised from the monthly figures.
    expect(screen.getByText("$60k")).toBeInTheDocument(); // revenue / yr
    expect(screen.getByText("$18k")).toBeInTheDocument(); // cash flow / yr
    expect(screen.getByText("2.00×")).toBeInTheDocument(); // asking multiple
    expect(screen.getByText("6.67×")).toBeInTheDocument(); // cash flow multiple
    expect(screen.getByText("Cash flow multiple")).toBeInTheDocument();

    // Sidebar. The asking price also repeats in the mobile action bar, which
    // CSS hides on desktop but jsdom still renders.
    expect(screen.getAllByText("$120,000").length).toBeGreaterThan(0);
    expect(screen.getByText("42 watching · 2 offers")).toBeInTheDocument();

    // Offers, highest first, with the leading one flagged.
    expect(screen.getByText("$90,000")).toBeInTheDocument();
    expect(screen.getByText(/Jane Doe ·/)).toBeInTheDocument();
    expect(screen.getByText("$85,000")).toBeInTheDocument();
    expect(screen.getByText(/Sam Roe ·/)).toBeInTheDocument();
    expect(screen.getByText("Leading")).toBeInTheDocument();
    expect(screen.getByText("75% of ask")).toBeInTheDocument();
  });

  it("omits the verified badge for an unverified listing", async () => {
    stubFetch({
      "GET /listings/l1": () => ({ ...LISTING, verified: false }),
      "GET /listings/l1/offers": () => OFFERS,
    });
    renderDetail();
    await screen.findByText("Copper Kettle");
    expect(screen.queryByText("Financials verified")).not.toBeInTheDocument();
  });

  it("shows an em dash for a listing with no cash-flow figure", async () => {
    stubFetch({
      "GET /listings/l1": () => ({ ...LISTING, monthlyCashFlow: undefined }),
      "GET /listings/l1/offers": () => [],
    });
    renderDetail();
    await screen.findByText("Copper Kettle");
    // Cash flow / yr and cash-flow multiple both fall back.
    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(2);
  });

  it("shows the empty offer state when the listing has no offers", async () => {
    stubFetch({
      "GET /listings/l1": () => LISTING,
      "GET /listings/l1/offers": () => [],
    });
    renderDetail();
    expect(
      await screen.findByText(/No offers yet\. Yours would be the first/),
    ).toBeInTheDocument();
    expect(screen.getByText("Open to first offer")).toBeInTheDocument();
  });

  it("shows the empty offer state when the offers query failed", async () => {
    stubFetch({
      "GET /listings/l1": () => LISTING,
      "GET /listings/l1/offers": () => new Error("boom"),
    });
    renderDetail();
    expect(
      await screen.findByText(/No offers yet\. Yours would be the first/),
    ).toBeInTheDocument();
  });

  it("renders the page shell with optional fields blank while the listing loads", async () => {
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
    it("opens the modal with the listing summary", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      await screen.findByText("Copper Kettle");
      await openOfferModal();

      expect(
        screen.getByText(/on Copper Kettle · asking \$120,000/),
      ).toBeInTheDocument();
    });

    it("shows how the typed offer reads against the ask", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      await screen.findByText("Copper Kettle");
      await openOfferModal();

      fireEvent.change(screen.getByLabelText("Your offer (USD)"), {
        target: { value: "99000" },
      });

      expect(
        screen.getByText(/83% of ask · \$21,000 below ask/),
      ).toBeInTheDocument();
    });

    it("submits the filled form and toasts success", async () => {
      const calls = stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/offers": () => ({ _id: "o3" }),
      });
      renderDetail();
      await screen.findByText("Copper Kettle");
      await openOfferModal();

      fireEvent.change(screen.getByLabelText("Your name"), {
        target: { value: "New Bidder" },
      });
      fireEvent.change(screen.getByLabelText("Your offer (USD)"), {
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
      await screen.findByText("Copper Kettle");
      await openOfferModal();
      fireEvent.click(screen.getByRole("button", { name: "Submit offer" }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(toast.success).not.toHaveBeenCalled();
    });

    it("closes and resets via the Cancel button", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      await screen.findByText("Copper Kettle");
      await openOfferModal();

      fireEvent.change(screen.getByLabelText("Your name"), {
        target: { value: "typed" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
      expect(
        screen.queryByRole("button", { name: "Submit offer" }),
      ).not.toBeInTheDocument();

      // Re-open: the form was reset.
      await openOfferModal();
      expect(screen.getByLabelText("Your name")).toHaveValue("");
    });

    it("closes on backdrop click but not on clicks inside the card", async () => {
      stubFetch(happyRoutes());
      renderDetail();
      await screen.findByText("Copper Kettle");
      await openOfferModal();

      const backdrop = document.querySelector(".fixed.inset-0")!;
      const insideCard = screen.getByText(/on Copper Kettle/);

      // Click inside the card: stays open (stopPropagation).
      fireEvent.mouseDown(insideCard);
      fireEvent.click(insideCard);
      expect(
        screen.getByRole("button", { name: "Submit offer" }),
      ).toBeInTheDocument();

      // Drag that starts inside the card (e.g. selecting the amount) and is
      // released over the backdrop: the browser fires click on the backdrop,
      // but the modal must stay open.
      fireEvent.mouseDown(document.getElementById("amount")!);
      fireEvent.click(backdrop);
      expect(
        screen.getByRole("button", { name: "Submit offer" }),
      ).toBeInTheDocument();

      // A real click on the backdrop (press and release there): closes.
      fireEvent.mouseDown(backdrop);
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
      expect(screen.getByText("Fair value range")).toBeInTheDocument();
      // The band renders the range compactly.
      expect(screen.getByText("$100k – $140k")).toBeInTheDocument();
      expect(screen.getByText("Steady revenue")).toBeInTheDocument();
      expect(screen.getByText("Prime location")).toBeInTheDocument();
      expect(
        screen.getByText(/Suggested opening offer: \$110,000/),
      ).toBeInTheDocument();
    });

    it("plots the asking price against the fair-value range", async () => {
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/analyze": () => ANALYSIS,
      });
      renderDetail();

      fireEvent.click(
        await screen.findByRole("button", { name: "✦ Analyze with AI" }),
      );

      expect(
        await screen.findByRole("img", {
          name: /Fair value \$100k to \$140k, asking \$120k/,
        }),
      ).toBeInTheDocument();
    });

    it("shows the API's message when AI is unavailable (no key / budget spent)", async () => {
      stubFetch({
        ...happyRoutes(),
        "POST /listings/l1/analyze": () => ({
          error:
            "The AI analysis demo has hit its daily budget. Try again tomorrow.",
        }),
      });
      renderDetail();

      fireEvent.click(
        await screen.findByRole("button", { name: "✦ Analyze with AI" }),
      );

      expect(
        await screen.findByText(
          "The AI analysis demo has hit its daily budget. Try again tomorrow.",
        ),
      ).toBeInTheDocument();
      expect(screen.getByText("✦ AI ANALYSIS")).toBeInTheDocument();
      expect(screen.queryByText(/Fair value range/)).not.toBeInTheDocument();
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
      expect(calls.some((c) => c.init?.method === "DELETE")).toBe(true);
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

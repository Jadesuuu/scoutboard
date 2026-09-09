import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingCard, {
  type ListingCardProps,
} from "@/components/listing/listing-card";

const props = (over: Partial<ListingCardProps> = {}): ListingCardProps => ({
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  monthlyCashFlow: 1500,
  description: "A cozy neighborhood cafe",
  views: 42,
  offersCount: 0,
  establishedYear: 2015,
  verified: false,
  ...over,
});

describe("ListingCard", () => {
  it("links to the listing detail page", () => {
    render(<ListingCard {...props()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/listings/l1");
  });

  it("renders title, meta, asking price and watchers", () => {
    render(<ListingCard {...props()} />);

    expect(screen.getByText("Copper Kettle")).toBeInTheDocument();
    // The industry is shown by its display label, not the raw enum value.
    expect(screen.getByText("Food · NYC")).toBeInTheDocument();
    expect(screen.getByText("$120k")).toBeInTheDocument();
    expect(screen.getByText("42 watching")).toBeInTheDocument();
  });

  it("renders the three screening metrics annualised", () => {
    render(<ListingCard {...props()} />);

    expect(screen.getByText("Revenue/yr")).toBeInTheDocument();
    expect(screen.getByText("$60k")).toBeInTheDocument(); // 5,000 × 12
    expect(screen.getByText("Cash flow")).toBeInTheDocument();
    expect(screen.getByText("$18k")).toBeInTheDocument(); // 1,500 × 12
    expect(screen.getByText("Multiple")).toBeInTheDocument();
    expect(screen.getByText("2.0×")).toBeInTheDocument(); // 120k ÷ 60k
  });

  it("shows an em dash rather than a zero when cash flow is missing", () => {
    render(<ListingCard {...props({ monthlyCashFlow: undefined })} />);
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  it("shows the verified badge only when the listing is verified", () => {
    const { unmount } = render(<ListingCard {...props({ verified: true })} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    unmount();

    render(<ListingCard {...props({ verified: false })} />);
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it('shows "No offers" for zero offers', () => {
    render(<ListingCard {...props({ offersCount: 0 })} />);
    expect(screen.getByText("No offers")).toBeInTheDocument();
  });

  it('shows "1 offer" singular', () => {
    render(<ListingCard {...props({ offersCount: 1 })} />);
    expect(screen.getByText("1 offer")).toBeInTheDocument();
  });

  it("shows plural offers", () => {
    render(<ListingCard {...props({ offersCount: 7 })} />);
    expect(screen.getByText("7 offers")).toBeInTheDocument();
  });
});

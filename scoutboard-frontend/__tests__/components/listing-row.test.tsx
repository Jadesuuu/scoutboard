import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingRow from "@/components/listing/listing-row";
import type { Listing } from "@/lib/listing";

const props = (over: Partial<Listing> = {}): Listing => ({
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  monthlyCashFlow: 1500,
  description: "A cozy cafe",
  views: 42,
  offersCount: 0,
  establishedYear: 2015,
  verified: false,
  ...over,
});

describe("ListingRow", () => {
  it("links to the listing detail page", () => {
    render(<ListingRow {...props()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/listings/l1");
  });

  it("renders title, combined meta and price", () => {
    render(<ListingRow {...props()} />);

    expect(screen.getByText("Copper Kettle")).toBeInTheDocument();
    // Rows fold industry, location and watchers into one line.
    expect(screen.getByText("Food · NYC · 42 watching")).toBeInTheDocument();
    expect(screen.getByText("$120k")).toBeInTheDocument();
  });

  it("renders the same screening metrics as the card", () => {
    render(<ListingRow {...props()} />);

    expect(screen.getByText("$60k")).toBeInTheDocument(); // revenue/yr
    expect(screen.getByText("$18k")).toBeInTheDocument(); // cash flow/yr
    expect(screen.getByText("2.0×")).toBeInTheDocument(); // multiple
  });

  it("shows the verified badge only when verified", () => {
    const { unmount } = render(<ListingRow {...props({ verified: true })} />);
    expect(screen.getByText("Verified")).toBeInTheDocument();
    unmount();

    render(<ListingRow {...props({ verified: false })} />);
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();
  });

  it('shows "No offers" for zero offers', () => {
    render(<ListingRow {...props({ offersCount: 0 })} />);
    expect(screen.getByText("No offers")).toBeInTheDocument();
  });

  it('shows "1 offer" singular', () => {
    render(<ListingRow {...props({ offersCount: 1 })} />);
    expect(screen.getByText("1 offer")).toBeInTheDocument();
  });

  it("shows plural offers", () => {
    render(<ListingRow {...props({ offersCount: 3 })} />);
    expect(screen.getByText("3 offers")).toBeInTheDocument();
  });
});

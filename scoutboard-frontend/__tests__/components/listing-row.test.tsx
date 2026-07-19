import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingRow from "@/components/listing/listing-row";
import type { ListingCardProps } from "@/components/listing/listing-card";

const props = (over: Partial<ListingCardProps> = {}): ListingCardProps => ({
  _id: "l1",
  title: "Copper Kettle",
  industry: "food",
  location: "NYC",
  askingPrice: 120000,
  monthlyRevenue: 5000,
  description: "A cozy cafe",
  color: "hsl(120 65% 82%)",
  views: 42,
  offersCount: 0,
  establishedYear: 2015,
  ...over,
});

describe("ListingRow", () => {
  it("links to the listing detail page", () => {
    render(<ListingRow {...props()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/listings/l1");
  });

  it("renders title, initial, meta and price", () => {
    render(<ListingRow {...props()} />);

    expect(screen.getByText("Copper Kettle")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument();
    expect(screen.getByText("food · NYC")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();
  });

  it('shows "No offers" for zero offers', () => {
    render(<ListingRow {...props({ offersCount: 0 })} />);
    expect(screen.getByText(/No offers · 42 views/)).toBeInTheDocument();
  });

  it('shows "1 offer" singular', () => {
    render(<ListingRow {...props({ offersCount: 1 })} />);
    expect(screen.getByText(/1 offer · 42 views/)).toBeInTheDocument();
  });

  it("shows plural offers", () => {
    render(<ListingRow {...props({ offersCount: 3 })} />);
    expect(screen.getByText(/3 offers · 42 views/)).toBeInTheDocument();
  });
});

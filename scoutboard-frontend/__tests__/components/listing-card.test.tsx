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
  description: "A cozy neighborhood cafe",
  color: "hsl(120 65% 82%)",
  views: 42,
  offersCount: 0,
  establishedYear: 2015,
  ...over,
});

describe("ListingCard", () => {
  it("links to the listing detail page", () => {
    render(<ListingCard {...props()} />);
    expect(screen.getByRole("link")).toHaveAttribute("href", "/listings/l1");
  });

  it("renders title, initial, meta, prices and views", () => {
    render(<ListingCard {...props()} />);

    expect(screen.getByText("Copper Kettle")).toBeInTheDocument();
    expect(screen.getByText("C")).toBeInTheDocument(); // thumbnail initial
    expect(screen.getByText("food · NYC")).toBeInTheDocument();
    expect(screen.getByText("A cozy neighborhood cafe")).toBeInTheDocument();
    expect(screen.getByText("$120,000")).toBeInTheDocument();
    expect(screen.getByText("$5,000/mo revenue")).toBeInTheDocument();
    expect(screen.getByText("42 views")).toBeInTheDocument();
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

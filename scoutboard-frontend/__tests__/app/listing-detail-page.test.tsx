import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ListingDetailPage from "@/app/listings/[id]/page";

// The page's job is only to await params and hand the id to ListingDetail —
// the detail component has its own suite, so stub it here.
vi.mock("@/components/listing/listing-detail", () => ({
  default: ({ id }: { id: string }) => <p>detail for {id}</p>,
}));

describe("ListingDetailPage", () => {
  it("awaits params and forwards the id to ListingDetail", async () => {
    render(await ListingDetailPage({ params: { id: "abc123" } }));
    expect(screen.getByText("detail for abc123")).toBeInTheDocument();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import Navbar from "@/components/layout/navbar";

describe("Navbar", () => {
  it("renders the logo linking home", () => {
    render(<Navbar />);
    expect(screen.getByText("ScoutBoard").closest("a")).toHaveAttribute(
      "href",
      "/",
    );
  });

  it("renders Browse and Sell a business navigation", () => {
    render(<Navbar />);

    expect(screen.getByRole("link", { name: "Browse" })).toHaveAttribute(
      "href",
      "/",
    );
    expect(
      screen.getByRole("link", { name: /Sell a business/ }),
    ).toHaveAttribute("href", "/create-listing");
  });
});

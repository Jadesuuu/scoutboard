import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { useQueryClient } from "@tanstack/react-query";
import { Providers } from "@/app/provider";

function Probe() {
  // Throws if no QueryClientProvider is above us.
  useQueryClient();
  return <p>inside provider</p>;
}

describe("Providers", () => {
  it("provides a react-query client to children", () => {
    render(
      <Providers>
        <Probe />
      </Providers>,
    );
    expect(screen.getByText("inside provider")).toBeInTheDocument();
  });
});

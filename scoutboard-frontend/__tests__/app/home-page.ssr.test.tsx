// @vitest-environment node
//
// Covers the SSR-only branch of Home's view-state initializer:
// `if (typeof window === "undefined") return "grid";` — unreachable in jsdom,
// where window always exists.
import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Home from "@/app/page";

describe("Home (server render)", () => {
  it("defaults to grid view when window is undefined", () => {
    const queryClient = new QueryClient();
    const html = renderToString(
      <QueryClientProvider client={queryClient}>
        <Home />
      </QueryClientProvider>,
    );

    // The Cards/Rows toggle renders with Cards active in the SSR output.
    expect(html).toContain("Cards");
    expect(html).toContain("Loading listings");
  });
});

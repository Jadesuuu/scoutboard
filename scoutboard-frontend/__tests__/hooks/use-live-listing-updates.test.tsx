import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useLiveListingUpdates,
  type ListingProps,
} from "@/components/hooks/use-live-listing-updates";

const { handlers, disconnect, io } = vi.hoisted(() => {
  const handlers: Record<string, (arg: never) => void> = {};
  const disconnect = vi.fn();
  const io = vi.fn(() => ({
    on: (event: string, cb: (arg: never) => void) => {
      handlers[event] = cb;
    },
    disconnect,
  }));
  return { handlers, disconnect, io };
});

vi.mock("socket.io-client", () => ({ io }));

const listing = (over: Partial<ListingProps> = {}): ListingProps => ({
  _id: "l1",
  title: "Coffee Shop",
  industry: "food",
  location: "NYC",
  askingPrice: 100000,
  monthlyRevenue: 5000,
  description: "cozy",
  createdAt: "2026-07-19T00:00:00Z",
  updatedAt: "2026-07-19T00:00:00Z",
  offersCount: 0,
  views: 0,
  establishedYear: 2015,
  ...over,
});

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = renderHook(() => useLiveListingUpdates(), { wrapper });
  const emitListing = (l: ListingProps) =>
    act(() => handlers["listingUpdate"](l as never));
  return { queryClient, emitListing, ...utils };
}

describe("useLiveListingUpdates", () => {
  it("connects to the API url and disconnects on unmount", () => {
    const { unmount } = setup();

    expect(io).toHaveBeenCalledWith("http://api.test");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("seeds the businessList cache when it was empty", () => {
    const { queryClient, emitListing } = setup();

    emitListing(listing());

    expect(queryClient.getQueryData(["businessList"])).toEqual([listing()]);
  });

  it("prepends new listings to the existing cache", () => {
    const { queryClient, emitListing } = setup();
    queryClient.setQueryData(["businessList"], [listing({ _id: "old" })]);

    emitListing(listing({ _id: "new" }));

    expect(queryClient.getQueryData(["businessList"])).toEqual([
      listing({ _id: "new" }),
      listing({ _id: "old" }),
    ]);
  });
});

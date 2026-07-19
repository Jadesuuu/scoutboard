import { describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  useLiveOfferUpdates,
  type OfferProps,
} from "@/components/hooks/use-live-offer-updates";
import type { ListingCardProps } from "@/components/listing/listing-card";

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

const offer = (over: Partial<OfferProps> = {}): OfferProps => ({
  _id: "o1",
  listingId: "l1",
  amount: 100,
  bidderName: "Jane Doe",
  createdAt: "2026-07-19T00:00:00Z",
  ...over,
});

function setup() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const utils = renderHook(() => useLiveOfferUpdates(), { wrapper });
  const emitOffer = (o: OfferProps) =>
    act(() => handlers["offerUpdate"](o as never));
  return { queryClient, emitOffer, ...utils };
}

describe("useLiveOfferUpdates", () => {
  it("connects to the API url and disconnects on unmount", () => {
    const { unmount } = setup();

    expect(io).toHaveBeenCalledWith("http://api.test");
    unmount();
    expect(disconnect).toHaveBeenCalled();
  });

  it("seeds the offers cache when it was empty", () => {
    const { queryClient, emitOffer } = setup();

    emitOffer(offer());

    expect(queryClient.getQueryData(["offers", "l1"])).toEqual([offer()]);
  });

  it("prepends a new offer to existing cached offers", () => {
    const { queryClient, emitOffer } = setup();
    queryClient.setQueryData(["offers", "l1"], [offer({ _id: "old" })]);

    emitOffer(offer({ _id: "new" }));

    expect(queryClient.getQueryData(["offers", "l1"])).toEqual([
      offer({ _id: "new" }),
      offer({ _id: "old" }),
    ]);
  });

  it("dedupes an offer that is already cached (no re-add, no count bump)", () => {
    const { queryClient, emitOffer } = setup();
    queryClient.setQueryData(["offers", "l1"], [offer({ _id: "dup" })]);
    queryClient.setQueryData(["listingDetail", "l1"], {
      offersCount: 5,
    } as ListingCardProps);

    emitOffer(offer({ _id: "dup" }));

    expect(queryClient.getQueryData(["offers", "l1"])).toEqual([
      offer({ _id: "dup" }),
    ]);
    expect(
      queryClient.getQueryData<ListingCardProps>(["listingDetail", "l1"]),
    ).toEqual({ offersCount: 5 });
  });

  it("bumps the cached listing offersCount for a new offer", () => {
    const { queryClient, emitOffer } = setup();
    queryClient.setQueryData(["listingDetail", "l1"], {
      title: "Shop",
      offersCount: 2,
    } as ListingCardProps);

    emitOffer(offer());

    expect(
      queryClient.getQueryData<ListingCardProps>(["listingDetail", "l1"]),
    ).toMatchObject({ title: "Shop", offersCount: 3 });
  });

  it("treats a missing offersCount as 0 when bumping", () => {
    const { queryClient, emitOffer } = setup();
    queryClient.setQueryData(["listingDetail", "l1"], {
      title: "Shop",
    } as ListingCardProps);

    emitOffer(offer());

    expect(
      queryClient.getQueryData<ListingCardProps>(["listingDetail", "l1"]),
    ).toMatchObject({ offersCount: 1 });
  });

  it("leaves the listing cache untouched when no listing is cached", () => {
    const { queryClient, emitOffer } = setup();

    emitOffer(offer());

    expect(
      queryClient.getQueryData(["listingDetail", "l1"]),
    ).toBeUndefined();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import WakingUpNotice from "@/components/ui/waking-up-notice";

describe("WakingUpNotice", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders its children immediately and holds the notice back", () => {
    render(
      <WakingUpNotice delayMs={1000}>
        <p>loading...</p>
      </WakingUpNotice>,
    );

    expect(screen.getByText("loading...")).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the free-tier explanation once the delay has elapsed", () => {
    render(
      <WakingUpNotice delayMs={1000}>
        <p>loading...</p>
      </WakingUpNotice>,
    );

    act(() => {
      vi.advanceTimersByTime(999);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      /free tier and can take up to a minute to wake/,
    );
    // Children stay visible alongside the notice.
    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("clears its timer on unmount so nothing fires afterwards", () => {
    const { unmount } = render(<WakingUpNotice delayMs={1000} />);
    unmount();

    // If the timer survived, React would warn about a state update on an
    // unmounted component; advancing time must be a no-op instead.
    const warn = vi.spyOn(console, "error").mockImplementation(() => {});
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

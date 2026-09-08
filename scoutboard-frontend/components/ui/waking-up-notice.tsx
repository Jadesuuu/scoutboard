"use client";

import { useEffect, useState } from "react";

const DEFAULT_DELAY_MS = 4000;

/**
 * Wraps a loading state and, once it has been visible for `delayMs`, adds a
 * line explaining that the demo API runs on a free tier and may be waking up.
 * A cold start then reads as intentional rather than broken.
 */
export default function WakingUpNotice({
  children,
  delayMs = DEFAULT_DELAY_MS,
}: {
  children?: React.ReactNode;
  delayMs?: number;
}) {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setSlow(true), delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  return (
    <div>
      {children}
      {slow && (
        <p
          role="status"
          className="mt-3 max-w-md text-sm text-stone-500"
        >
          Still loading? The demo API runs on a free tier and can take up to a
          minute to wake after being idle. It will finish on its own.
        </p>
      )}
    </div>
  );
}

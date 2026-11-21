"use client";

import { useSyncExternalStore } from "react";

const MINUTE = 60_000;

/** Current time rounded down to the minute: the same value for a whole minute, so it is a stable snapshot. */
function snapshot(): number {
  return Math.floor(Date.now() / MINUTE) * MINUTE;
}

/** One timer aligned to the next minute boundary, re-armed after each tick and when the tab returns. */
function subscribe(onChange: () => void) {
  let timer: ReturnType<typeof setTimeout>;
  const arm = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      onChange();
      arm();
    }, MINUTE - (Date.now() % MINUTE) + 50);
  };
  const onVisible = () => {
    if (document.visibilityState === "visible") {
      onChange();
      arm();
    }
  };
  arm();
  document.addEventListener("visibilitychange", onVisible);
  return () => {
    clearTimeout(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}

/**
 * The current minute as epoch milliseconds on the client, and null during server rendering and
 * hydration, so a server-rendered time never mismatches the browser's (R45.5).
 */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}

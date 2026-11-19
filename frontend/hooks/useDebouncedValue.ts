"use client";

import { useEffect, useState } from "react";

/** Returns `value` once it has stopped changing for `delayMs` (R5.3: 300 ms search debounce). */
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return debounced;
}

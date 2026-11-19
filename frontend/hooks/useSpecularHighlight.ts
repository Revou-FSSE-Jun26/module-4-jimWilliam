"use client";

import { useCallback, useRef, type PointerEvent } from "react";

/**
 * Pointer-following highlight on hover-capable devices (R37.5). Writes --mx/--my as percentages,
 * at most once per animation frame; CSS draws the gradient in `.specular::before`.
 */
export function useSpecularHighlight<T extends HTMLElement>() {
  const frame = useRef<number | null>(null);

  return useCallback((event: PointerEvent<T>) => {
    if (event.pointerType !== "mouse" || !window.matchMedia("(hover: hover)").matches) return;
    const el = event.currentTarget;
    const { clientX, clientY } = event;
    if (frame.current !== null) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${((clientX - rect.left) / rect.width) * 100}%`);
      el.style.setProperty("--my", `${((clientY - rect.top) / rect.height) * 100}%`);
    });
  }, []);
}

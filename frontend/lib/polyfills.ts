"use client";

/**
 * Feature-detected fallbacks (design "Browser support and fallbacks"). Each runs only when the
 * native feature is missing, never unconditionally.
 */
let installed = false;

export function installPolyfills(): void {
  if (installed || typeof window === "undefined") return;
  installed = true;

  // Popover API: load the polyfill only when native support is missing.
  if (!Object.hasOwn(HTMLElement.prototype, "popover")) {
    void import("@oddbird/popover-polyfill");
  }

  // Invoker commands: make command="toggle-popover" buttons work where commandfor is unsupported.
  if (!("commandForElement" in HTMLButtonElement.prototype)) {
    document.addEventListener("click", (event) => {
      const button = (event.target as Element | null)?.closest<HTMLButtonElement>("button[commandfor]");
      if (!button || button.getAttribute("command") !== "toggle-popover") return;
      const target = document.getElementById(button.getAttribute("commandfor") ?? "");
      if (!target) return;
      event.preventDefault();
      const open = target.matches(":popover-open, .\\:popover-open");
      if (open) target.hidePopover();
      else (target as HTMLElement & { showPopover(o?: { source?: HTMLElement }): void }).showPopover({ source: button });
    });
  }
}

/** Anchor-positioning fallback: place a popover beside its trigger with fixed coordinates. */
export function positionFallback(popover: HTMLElement, anchor: HTMLElement, placement: "below" | "above" | "side"): void {
  if (typeof CSS !== "undefined" && CSS.supports("position-area: block-end")) return;
  const a = anchor.getBoundingClientRect();
  const p = popover.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  let top: number;
  let left: number;
  if (placement === "side") {
    left = a.right + 8 + p.width > vw ? Math.max(8, a.left - 8 - p.width) : a.right + 8;
    top = Math.min(a.top, vh - p.height - 8);
  } else if (placement === "above") {
    top = a.top - 8 - p.height < 8 ? a.bottom + 8 : a.top - 8 - p.height;
    left = Math.min(a.left, vw - p.width - 8);
  } else {
    top = a.bottom + 8 + p.height > vh ? Math.max(8, a.top - 8 - p.height) : a.bottom + 8;
    left = Math.min(Math.max(8, a.right - p.width), vw - p.width - 8);
  }
  Object.assign(popover.style, { position: "fixed", inset: "auto", margin: "0", top: `${Math.max(8, top)}px`, left: `${Math.max(8, left)}px` });
}

"use client";

import { useCallback, useEffect, useRef } from "react";

import { NavTree } from "@/components/layout/NavTree";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { Brand } from "@/components/layout/Sidebar";
import { TideClock } from "@/components/layout/TideClock";
import type { Board } from "@/lib/types";

/**
 * Nav_Drawer below 768 px (R35.3, R35.4): a modal <dialog> holding a horizontal scroll-snap
 * surface, so the user's finger drives the swipe natively. When the sheet has fully left the
 * viewport an IntersectionObserver closes the dialog.
 */
export function NavDrawer({ boards, open, onClose }: { boards: Board[]; open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => dialogRef.current?.close(), []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
      scrollerRef.current?.scrollTo({ left: 0, behavior: "instant" });
      dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    const sheet = sheetRef.current;
    if (!dialog || !sheet) return;
    dialog.addEventListener("close", onClose);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (dialog.open && entry.intersectionRatio === 0) dialog.close(); // swiped away
      },
      { threshold: [0] },
    );
    observer.observe(sheet);
    return () => {
      dialog.removeEventListener("close", onClose);
      observer.disconnect();
    };
  }, [onClose]);

  return (
    <dialog ref={dialogRef} className="nav-drawer" aria-label="Navigation" {...{ closedby: "any" }}>
      <div ref={scrollerRef} className="nav-drawer-scroller">
        <div ref={sheetRef} className="nav-drawer-sheet glass-raised">
          <div className="flex items-center justify-between">
            <Brand />
            <button
              type="button"
              data-autofocus
              onClick={close}
              aria-label="Close navigation"
              className="inline-flex size-11 items-center justify-center rounded-pill hover:bg-hover"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <NavTree boards={boards} shell="dr" onNavigate={close} />
          {open && <TideClock />}
          <ProfileMenu idPrefix="dr" />
        </div>
        {/* Tapping the empty area closes the drawer. */}
        <div className="nav-drawer-gap" onClick={close} aria-hidden="true" />
      </div>
    </dialog>
  );
}

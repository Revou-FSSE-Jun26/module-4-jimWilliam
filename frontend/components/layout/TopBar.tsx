"use client";

import type { ReactNode } from "react";

import { NotificationBell } from "@/components/NotificationBell";

/** Sticky Glass_Pane bar with the menu button (below 768 px), the page title and the bell. */
export function TopBar({ title, onMenu, actions }: { title: ReactNode; onMenu: () => void; actions?: ReactNode }) {
  return (
    <header className="glass-pane topbar-lift sticky top-3 z-20 flex min-h-16 items-center gap-3 rounded-pane px-3 py-2 md:px-5">
      <button
        type="button"
        onClick={onMenu}
        aria-label="Open navigation"
        className="inline-flex size-11 items-center justify-center rounded-pill md:hidden hover:bg-hover"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M4 7h16M4 12h16M4 17h10" /></svg>
      </button>
      <div className="min-w-0 flex-1">{title}</div>
      {actions}
      <NotificationBell />
    </header>
  );
}

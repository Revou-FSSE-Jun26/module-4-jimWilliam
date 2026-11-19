"use client";

import { useEffect, useRef, useState } from "react";

import { BaseBadge } from "@/components/shared/BaseBadge";
import { useNotifications } from "@/hooks/useNotifications";
import { positionFallback } from "@/lib/polyfills";

function timeAgo(iso: string): string {
  const seconds = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * Bell with the unread count (R19.1, R19.4) and a popover list (a popover, not a dialog).
 * The badge bumps once when the count rises.
 */
export function NotificationBell() {
  const { items, unreadCount, markRead } = useNotifications();
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const previous = useRef(unreadCount);
  const [bump, setBump] = useState(0);

  useEffect(() => {
    if (unreadCount > previous.current) setBump((b) => b + 1);
    previous.current = unreadCount;
  }, [unreadCount]);

  useEffect(() => {
    const panel = panelRef.current;
    const button = buttonRef.current;
    if (!panel || !button) return;
    const onToggle = (event: Event) => {
      const open = (event as ToggleEvent).newState === "open";
      button.setAttribute("aria-expanded", String(open));
      if (open) positionFallback(panel, button, "below");
    };
    panel.addEventListener("toggle", onToggle);
    return () => panel.removeEventListener("toggle", onToggle);
  }, []);

  const label = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        popoverTarget="notifications-panel"
        aria-label={label}
        aria-expanded="false"
        data-testid="notification-bell"
        className="lift relative inline-flex size-11 items-center justify-center rounded-pill glass-pebble"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 1112 0c0 7 3 8 3 8H3s3-1 3-8M10.5 20a1.5 1.5 0 003 0" />
        </svg>
        {unreadCount > 0 && (
          <BaseBadge key={bump} color="warning" data-testid="unread-count" className="badge-bump absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs">
            {unreadCount > 99 ? "99+" : unreadCount}
          </BaseBadge>
        )}
      </button>
      <div ref={panelRef} id="notifications-panel" popover="auto" className="menu-popover place-below glass-raised w-[min(22rem,calc(100vw-1.5rem))]">
        <h2 className="px-3 pt-2 pb-1 text-base">Notifications</h2>
        {items.length === 0 ? (
          <p className="px-3 pb-3 text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="grid max-h-[60dvh] gap-1 overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className="menu-item items-start"
                  onClick={() => void markRead(n.id)}
                  aria-label={n.read ? n.message : `${n.message}. Mark as read`}
                >
                  <span aria-hidden="true" className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read ? "bg-transparent" : "bg-buoy"}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block ${n.read ? "text-muted" : "font-medium"}`}>{n.message}</span>
                    <span className="block text-xs text-muted">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ViewTransition, useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type ReactNode } from "react";

import { avatarHue } from "@/lib/avatar";
import { positionFallback } from "@/lib/polyfills";
import type { Board } from "@/lib/types";

const STORAGE_KEY = "revotask_nav";
const RAIL_QUERY = "(min-width: 48rem) and (max-width: 79.999rem)";

type OpenState = Record<string, boolean>;
const NAV_EVENT = "revotask-nav";

/** Group open state lives in sessionStorage (R35.10); read through useSyncExternalStore for SSR safety. */
function readStored(): string {
  try {
    return sessionStorage.getItem(STORAGE_KEY) ?? "{}";
  } catch {
    return "{}";
  }
}

function subscribeStored(onChange: () => void) {
  window.addEventListener(NAV_EVENT, onChange);
  return () => window.removeEventListener(NAV_EVENT, onChange);
}

function subscribeRail(onChange: () => void) {
  const mq = window.matchMedia(RAIL_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

function Icon({ d }: { d: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

const ICONS = {
  dashboard: "M4 13h6V4H4zm10 7h6v-9h-6zM4 20h6v-4H4zm10-9h6V4h-6z",
  boards: "M4 5h4v14H4zm6 0h4v9h-4zm6 0h4v6h-4z",
  tasks: "M9 11l2 2 4-4M5 4h14v16H5z",
  chevron: "M9 6l6 6-6 6",
};

/** The current-page pill; one per shell, so it glides between items on navigation (R37.9). */
function CurrentPill({ shell }: { shell: string }) {
  return (
    <ViewTransition name={`nav-current-${shell}`} share="glide" default="none">
      <span className="nav-current-pill" aria-hidden="true" />
    </ViewTransition>
  );
}

function NavLink({ href, label, icon, current, shell, onNavigate, sub = false }: {
  href: string; label: string; icon?: string; current: boolean; shell: string; onNavigate?: () => void; sub?: boolean;
}) {
  return (
    <Link href={href} className="nav-link" aria-current={current ? "page" : undefined} onClick={onNavigate}>
      {current && <CurrentPill shell={shell} />}
      {icon && <Icon d={icon} />}
      <span className={sub ? "nav-label" : "nav-label nav-label-rail"}>{label}</span>
    </Link>
  );
}

/**
 * Nav_Tree (R35.5–R35.10): links for destinations, disclosure buttons for groups, no role="menu".
 * Expanded sidebar and drawer: groups expand in place. Icon rail: the Boards group opens as an
 * anchored popover flyout beside its trigger.
 */
export function NavTree({ boards, shell, onNavigate }: { boards: Board[]; shell: "sb" | "dr"; onNavigate?: () => void }) {
  const pathname = usePathname();
  const stored = useSyncExternalStore(subscribeStored, readStored, () => "{}");
  const open = useMemo<OpenState>(() => {
    try {
      return { boards: true, ...(JSON.parse(stored) as OpenState) };
    } catch {
      return { boards: true };
    }
  }, [stored]);
  // The rail layout only applies to the sidebar shell.
  const railMatches = useSyncExternalStore(subscribeRail, () => window.matchMedia(RAIL_QUERY).matches, () => false);
  const rail = shell === "sb" && railMatches;
  const boardsListRef = useRef<HTMLUListElement>(null);
  const boardsTriggerRef = useRef<HTMLButtonElement>(null);
  const boardsListId = `${shell}-boards`;

  // Rail: the Boards list becomes a popover (set with setAttribute, never the IDL property).
  useEffect(() => {
    const list = boardsListRef.current;
    const trigger = boardsTriggerRef.current;
    if (!list || !trigger) return;
    if (!rail) {
      list.removeAttribute("popover");
      return;
    }
    list.setAttribute("popover", "auto");
    const onToggle = (event: Event) => {
      const isOpen = (event as ToggleEvent).newState === "open";
      trigger.setAttribute("aria-expanded", String(isOpen));
      if (isOpen) positionFallback(list, trigger, "side");
    };
    list.addEventListener("toggle", onToggle);
    return () => {
      list.removeEventListener("toggle", onToggle);
      list.removeAttribute("popover");
    };
  }, [rail]);

  const toggle = useCallback(
    (key: string, current = !!open[key]) => {
      try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...open, [key]: !current }));
      } catch {
        /* storage unavailable (private mode): the group simply does not toggle-persist */
      }
      window.dispatchEvent(new Event(NAV_EVENT));
    },
    [open],
  );

  const onBoardsClick = () => {
    const list = boardsListRef.current;
    if (rail && list) {
      const el = list as HTMLElement & { togglePopover(o?: { source?: HTMLElement }): boolean };
      el.togglePopover({ source: boardsTriggerRef.current ?? undefined });
      return;
    }
    toggle("boards");
  };

  const navigate = () => {
    const list = boardsListRef.current;
    if (list?.matches(":popover-open")) list.hidePopover();
    onNavigate?.();
  };

  const items: { key: string; node: ReactNode }[] = [
    { key: "dashboard", node: <NavLink href="/" label="Dashboard" icon={ICONS.dashboard} current={pathname === "/"} shell={shell} onNavigate={navigate} /> },
    { key: "tasks", node: <NavLink href="/my-tasks" label="My tasks" icon={ICONS.tasks} current={pathname === "/my-tasks"} shell={shell} onNavigate={navigate} /> },
    {
      key: "boards",
      node: (
        <>
          <button
            ref={boardsTriggerRef}
            type="button"
            className="nav-link"
            aria-expanded={rail ? false : !!open.boards}
            aria-controls={boardsListId}
            onClick={onBoardsClick}
          >
            <Icon d={ICONS.boards} />
            <span className="nav-label nav-label-rail">Boards</span>
            {boards.length > 0 && <span className="nav-count rail-hide ms-auto" aria-hidden="true">{boards.length}</span>}
            <svg aria-hidden="true" viewBox="0 0 24 24" className={`rail-hide shrink-0 ${boards.length > 0 ? "" : "ms-auto "}size-4 transition-transform duration-150 ${open.boards && !rail ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d={ICONS.chevron} /></svg>
          </button>
          <ul
            ref={boardsListRef}
            id={boardsListId}
            hidden={!rail && !open.boards}
            className={rail ? "menu-popover place-side glass-raised nav-boards max-h-[70dvh] overflow-y-auto" : "nav-sub nav-boards"}
          >
            {boards.length === 0 && <li className="px-3 py-2 text-sm text-muted">No boards yet</li>}
            {boards.map((board) => {
              const key = `board-${board.id}`;
              const listId = `${shell}-board-${board.id}`;
              const base = `/boards/${board.id}`;
              const expanded = open[key] ?? pathname === base; // the current board starts expanded
              return (
                <li key={board.id}>
                  <button
                    type="button"
                    className="nav-link nav-board"
                    aria-expanded={expanded}
                    aria-controls={listId}
                    onClick={() => toggle(key, expanded)}
                    style={{ ["--board-hue" as string]: avatarHue(board.id) }}
                  >
                    <span className="board-dot" aria-hidden="true" />
                    <span className="nav-label">{board.name}</span>
                    {(board.card_count ?? 0) > 0 && (
                      <span className="nav-count ms-auto" aria-hidden="true" title={`${board.card_count} ${board.card_count === 1 ? "card" : "cards"}`}>{board.card_count}</span>
                    )}
                    <svg aria-hidden="true" viewBox="0 0 24 24" className={`shrink-0 ${(board.card_count ?? 0) > 0 ? "" : "ms-auto "}size-4 transition-transform duration-150 ${expanded ? "rotate-90" : ""}`} fill="none" stroke="currentColor" strokeWidth="2"><path d={ICONS.chevron} /></svg>
                  </button>
                  <ul id={listId} hidden={!expanded} className="nav-sub nav-branch">
                    <li><NavLink href={base} label="Board" current={pathname === base} shell={shell} onNavigate={navigate} sub /></li>
                    {board.role === "admin" && (
                      <>
                        <li><NavLink href={`${base}#members`} label="Members" current={false} shell={shell} onNavigate={navigate} sub /></li>
                        <li><NavLink href={`${base}#analytics`} label="Analytics" current={false} shell={shell} onNavigate={navigate} sub /></li>
                      </>
                    )}
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      ),
    },
  ];

  return (
    <nav aria-label="Main" className="nav-scroll min-h-0 flex-1 overflow-x-clip overflow-y-auto overscroll-contain">
      <ul className="nav-arc grid gap-1">
        {items.map((item, i) => (
          <li key={item.key} style={{ ["--t" as string]: items.length > 1 ? i / (items.length - 1) : 0 }}>
            {item.node}
          </li>
        ))}
      </ul>
    </nav>
  );
}

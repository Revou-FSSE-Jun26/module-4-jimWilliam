"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { NavDrawer } from "@/components/layout/NavDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { installPolyfills } from "@/lib/polyfills";
import type { Board } from "@/lib/types";

export interface BoardStats {
  card_count: number;
  done_count: number | null;
}

interface ShellContextValue {
  boards: Board[];
  openDrawer: () => void;
  /** The open board reports its live counts, so the sidebar's progress moves as cards move (R46.4). */
  reportBoardStats: (boardId: string, stats: BoardStats) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside AppShell");
  return ctx;
}

/** Sidebar (768 px and up) or Nav_Drawer (below), plus the main content area. */
export function AppShell({ boards: serverBoards, children }: { boards: Board[]; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [live, setLive] = useState<Record<string, BoardStats>>({});
  const reportBoardStats = useCallback((boardId: string, stats: BoardStats) => {
    setLive((current) => {
      const old = current[boardId];
      if (old && old.card_count === stats.card_count && old.done_count === stats.done_count) return current;
      return { ...current, [boardId]: stats };
    });
  }, []);
  const boards = useMemo(
    () => serverBoards.map((b) => (live[b.id] ? { ...b, ...live[b.id] } : b)),
    [serverBoards, live],
  );
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => installPolyfills(), []);

  const value = useMemo(() => ({ boards, openDrawer, reportBoardStats }), [boards, openDrawer, reportBoardStats]);
  return (
    <ShellContext value={value}>
      <Sidebar boards={boards} />
      <NavDrawer boards={boards} open={drawerOpen} onClose={closeDrawer} />
      <div className="app-main">{children}</div>
      <div className="page-fade" aria-hidden="true" />
    </ShellContext>
  );
}

/** Page header: the Top_Bar with the page's single <h1>. */
export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  const { openDrawer } = useShell();
  return (
    <TopBar
      onMenu={openDrawer}
      actions={actions}
      title={
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight md:text-[clamp(1.5rem,1.2rem+0.8vw,2.25rem)]">{title}</h1>
          {subtitle && <div className="min-w-0 truncate text-sm text-muted">{subtitle}</div>}
        </div>
      }
    />
  );
}

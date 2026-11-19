"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

import { NavDrawer } from "@/components/layout/NavDrawer";
import { Sidebar } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { installPolyfills } from "@/lib/polyfills";
import type { Board } from "@/lib/types";

interface ShellContextValue {
  boards: Board[];
  openDrawer: () => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error("useShell must be used inside AppShell");
  return ctx;
}

/** Sidebar (768 px and up) or Nav_Drawer (below), plus the main content area. */
export function AppShell({ boards, children }: { boards: Board[]; children: ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  useEffect(() => installPolyfills(), []);

  const value = useMemo(() => ({ boards, openDrawer }), [boards, openDrawer]);
  return (
    <ShellContext value={value}>
      <Sidebar boards={boards} />
      <NavDrawer boards={boards} open={drawerOpen} onClose={closeDrawer} />
      <div className="app-main">{children}</div>
    </ShellContext>
  );
}

/** Page header: the Top_Bar with the page's single <h1>. */
export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  const { openDrawer } = useShell();
  return (
    <TopBar
      onMenu={openDrawer}
      actions={actions}
      title={
        <div className="min-w-0">
          <h1 className="truncate text-2xl leading-tight md:text-[clamp(1.5rem,1.2rem+0.8vw,2.25rem)]">{title}</h1>
          {subtitle && <p className="truncate text-sm text-muted">{subtitle}</p>}
        </div>
      }
    />
  );
}

import Link from "next/link";

import { NavTree } from "@/components/layout/NavTree";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import type { Board } from "@/lib/types";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 rounded-pebble px-2 py-1 text-foam no-underline">
      <span aria-hidden="true" className="relative inline-block size-8 shrink-0 brand-mark bg-seaglass shadow-[inset_0_1px_0_rgb(255_255_255/0.5)]" />
      <span className={`font-display text-xl font-semibold ${compact ? "rail-hide" : ""}`}>RevoTask</span>
    </Link>
  );
}

/** The curved floating Glass_Pane sidebar (R35.1, R35.2), shown from 768 px. */
export function Sidebar({ boards }: { boards: Board[] }) {
  return (
    <aside className="sidebar glass-pane" aria-label="Sidebar">
      <Brand compact />
      <NavTree boards={boards} shell="sb" />
      <ProfileMenu compact idPrefix="sb" />
    </aside>
  );
}

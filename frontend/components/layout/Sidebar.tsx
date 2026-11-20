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

/** Two slow swells of sea glass behind the profile capsule; drift only with "Animate background" on. */
function Tide() {
  return (
    <svg className="sidebar-tide" aria-hidden="true" viewBox="0 0 320 160" preserveAspectRatio="none">
      <path className="tide-back" d="M0 70 C 60 40, 110 95, 170 70 S 280 40, 320 62 L 320 160 L 0 160 Z" />
      <path className="tide-front" d="M0 100 C 70 78, 120 122, 190 100 S 290 80, 320 96 L 320 160 L 0 160 Z" />
    </svg>
  );
}

/**
 * The full-height curved Glass_Pane sidebar (R35.1, R35.2), shown from 768 px. It runs from the top
 * to the bottom of the viewport, flush with the inline-start edge; the inline-end edge is one outward
 * arc with a lit rim. Brand, a single scrolling Nav_Tree and the Profile_Capsule stack in a column,
 * so the capsule always sits at the bottom and nothing scrolls except the navigation itself.
 */
export function Sidebar({ boards }: { boards: Board[] }) {
  return (
    <aside className="sidebar glass-pane" aria-label="Sidebar">
      <span className="sidebar-rim" aria-hidden="true" />
      {/* Clipped by the sidebar's own curve (border-radius: inherit), behind the content. */}
      <span className="sidebar-tide-clip" aria-hidden="true"><Tide /></span>
      <div className="sidebar-head">
        <Brand compact />
      </div>
      <NavTree boards={boards} shell="sb" />
      <div className="sidebar-foot">
        <ProfileMenu compact idPrefix="sb" />
      </div>
    </aside>
  );
}

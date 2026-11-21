"use client";

import { useNow } from "@/hooks/useNow";
import { dueStatus } from "@/lib/due";

/**
 * A due-date chip (R51): overdue in the danger colour, today and the next two days in amber,
 * later dates muted, and done cards (in the last column) with a check, never as overdue. The tone is
 * also in the text ("2 days overdue"), so colour is never the only signal. Rendered on the client
 * only, because "today" is the reader's today.
 */
export function DueChip({ value, done = false, className = "" }: { value: string | null | undefined; done?: boolean; className?: string }) {
  const now = useNow();
  if (now === null) return null;
  const status = dueStatus(value, new Date(now), done);
  if (!status) return null;
  return (
    <span className={`due-chip ${className}`} data-tone={status.tone} title={status.description}>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {status.tone === "done" ? <path d="M3.5 8.5l3 3 6-7" /> : <><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>}
      </svg>
      <span className="visually-hidden">{status.description}</span>
      <span aria-hidden="true">{status.label}</span>
    </span>
  );
}

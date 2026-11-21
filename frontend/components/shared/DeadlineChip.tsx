"use client";

import { useNow } from "@/hooks/useNow";
import { deadlineText, dueStatus } from "@/lib/due";

/** The board deadline beside its purpose (R51.3): "12 Dec · 21 days left", toned like card due dates. */
export function DeadlineChip({ value }: { value: string }) {
  const now = useNow();
  if (now === null) return null;
  const today = new Date(now);
  const status = dueStatus(value, today);
  const text = deadlineText(value, today);
  if (!status || !text) return null;
  return (
    <span className="due-chip shrink-0" data-tone={status.tone} title={`Board deadline: ${status.description}`}>
      <svg aria-hidden="true" viewBox="0 0 16 16" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M4 2v12M4 3h8l-2 2.5L12 8H4" /></svg>
      <span className="visually-hidden">Deadline: </span>
      {text}
    </span>
  );
}

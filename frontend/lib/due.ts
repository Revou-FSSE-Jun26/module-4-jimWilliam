/**
 * Due dates (R51) are calendar dates ("YYYY-MM-DD") with no time zone: "due 12 Dec" means the
 * whole of 12 December wherever the reader is. They are compared with the reader's local today.
 */
export type DueTone = "done" | "overdue" | "today" | "soon" | "later";

export interface DueStatus {
  tone: DueTone;
  /** Whole days from today to the due date: negative when overdue. */
  days: number;
  /** Short text for a chip, e.g. "Due today", "2 days overdue", "Due 12 Dec". */
  label: string;
  /** Long text for assistive technology and tooltips. */
  description: string;
}

const DAY = 86_400_000;
export const SOON_DAYS = 2;

/** "2026-12-12" -> a local Date at midnight; null for anything that is not a real calendar date. */
export function parseDate(value: string | null | undefined): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!match) return null;
  const [y, m, d] = match.slice(1).map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d ? date : null;
}

export function toDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Calendar days between two local dates, immune to daylight-saving shifts. */
export function daysBetween(from: Date, to: Date): number {
  const a = Date.UTC(from.getFullYear(), from.getMonth(), from.getDate());
  const b = Date.UTC(to.getFullYear(), to.getMonth(), to.getDate());
  return Math.round((b - a) / DAY);
}

export function formatDue(date: Date, today: Date): string {
  const sameYear = date.getFullYear() === today.getFullYear();
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}

/** Status of a due date relative to today; `done` wins, so finished work never shows as overdue. */
export function dueStatus(value: string | null | undefined, today: Date, done = false): DueStatus | null {
  const date = parseDate(value);
  if (!date) return null;
  const days = daysBetween(today, date);
  const when = formatDue(date, today);
  if (done) return { tone: "done", days, label: `Done · ${when}`, description: `Due ${when}, done` };
  if (days < 0) {
    const n = -days;
    return { tone: "overdue", days, label: `${n} ${n === 1 ? "day" : "days"} overdue`, description: `Overdue: was due ${when}` };
  }
  if (days === 0) return { tone: "today", days, label: "Due today", description: `Due today, ${when}` };
  if (days === 1) return { tone: "soon", days, label: "Due tomorrow", description: `Due tomorrow, ${when}` };
  if (days <= SOON_DAYS) return { tone: "soon", days, label: `Due ${when}`, description: `Due in ${days} days, ${when}` };
  return { tone: "later", days, label: `Due ${when}`, description: `Due ${when}, in ${days} days` };
}

/** Board deadline text for the Top_Bar, e.g. "12 Dec · 21 days left". */
export function deadlineText(value: string | null | undefined, today: Date): string | null {
  const status = dueStatus(value, today);
  if (!status) return null;
  const date = formatDue(parseDate(value)!, today);
  if (status.tone === "overdue") return `${date} · ${status.label}`;
  if (status.tone === "today") return `${date} · due today`;
  return `${date} · ${status.days} ${status.days === 1 ? "day" : "days"} left`;
}

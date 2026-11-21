import type { Board } from "@/lib/types";

/** Board progress (R46): Cards in the last Column ("done") out of all live Cards. */
export interface Progress {
  done: number;
  total: number;
  ratio: number;
}

export function progressOf(done: number | null | undefined, total: number | null | undefined): Progress | null {
  if (done === null || done === undefined || !total || total <= 0) return null;
  const safeDone = Math.min(Math.max(done, 0), total);
  return { done: safeDone, total, ratio: safeDone / total };
}

export function boardProgress(board: Pick<Board, "done_count" | "card_count">): Progress | null {
  return progressOf(board.done_count, board.card_count);
}

/**
 * The same numbers from a board's columns, already sorted by order: the last column is "done",
 * and with fewer than two columns there is no done stage (null), matching the API's done_count.
 */
export function columnStats(columns: { cards: unknown[] }[]): { card_count: number; done_count: number | null } {
  const card_count = columns.reduce((n, c) => n + c.cards.length, 0);
  const done_count = columns.length >= 2 ? columns[columns.length - 1].cards.length : null;
  return { card_count, done_count };
}

export function progressLabel(p: Progress): string {
  return `${Math.round(p.ratio * 100)}% done: ${p.done} of ${p.total} ${p.total === 1 ? "card" : "cards"} in the last column`;
}

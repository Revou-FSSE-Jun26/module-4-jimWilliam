import type { Card, Column } from "@/lib/types";

type BoardColumn = Column & { cards: Card[] };

/** Columns and, within each, cards in ascending order value (R14.1, Property 27). Stable for ties. */
export function sortBoard<T extends BoardColumn>(columns: T[]): T[] {
  return [...columns]
    .sort((a, b) => a.order - b.order)
    .map((column) => ({ ...column, cards: [...column.cards].sort((a, b) => a.order - b.order) }));
}

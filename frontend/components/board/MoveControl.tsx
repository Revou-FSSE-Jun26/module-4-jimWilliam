"use client";

import { forwardRef, useId } from "react";

import type { Column } from "@/lib/types";

/**
 * Move_Control (R33): a labelled select that moves the card to the end of the chosen column
 * through the same moveCard function as drag and drop. Works with keyboard and touch.
 */
export const MoveControl = forwardRef<HTMLSelectElement, {
  cardTitle: string;
  columnId: string;
  columns: Pick<Column, "id" | "name">[];
  onMove: (columnId: string) => void;
}>(function MoveControl({ cardTitle, columnId, columns, onMove }, ref) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label htmlFor={id} className="visually-hidden">Move {cardTitle} to</label>
      <span aria-hidden="true" className="text-muted">Move to</span>
      <select
        ref={ref}
        id={id}
        value={columnId}
        onChange={(e) => onMove(e.target.value)}
        onClick={(e) => e.stopPropagation()}
        className="min-h-9 min-w-0 flex-1 rounded-pill border border-rim bg-transparent px-2.5 py-1 text-sm text-foam"
      >
        {columns.map((c) => (
          <option key={c.id} value={c.id} className="bg-(--raised-solid) text-foam">{c.name}</option>
        ))}
      </select>
    </div>
  );
});

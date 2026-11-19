"use client";

import { startTransition, useCallback, useState, type DragEvent, type Dispatch, type SetStateAction } from "react";

import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { orderAtIndex } from "@/lib/order";
import type { Card, Column } from "@/lib/types";

export type BoardColumn = Column & { cards: Card[] };

export interface MovePlan {
  next: BoardColumn[];
  payload: { column_id: string; order: number };
}

/**
 * Pure planning step shared by drag and the Move_Control (Property 36): removes the card,
 * computes a FLOAT order between its new neighbours and inserts it. Returns null for no-ops.
 */
export function planMove(columns: BoardColumn[], cardId: string, targetColumnId: string, targetIndex: number): MovePlan | null {
  const source = columns.find((c) => c.cards.some((card) => card.id === cardId));
  const target = columns.find((c) => c.id === targetColumnId);
  if (!source || !target) return null;
  const card = source.cards.find((c) => c.id === cardId)!;
  const targetCards = target.cards.filter((c) => c.id !== cardId);
  const index = Math.max(0, Math.min(Number.isFinite(targetIndex) ? targetIndex : targetCards.length, targetCards.length));
  if (source.id === target.id && source.cards.indexOf(card) === index) return null;

  const order = orderAtIndex(targetCards.map((c) => c.order), index);
  const moved: Card = { ...card, column_id: target.id, order };
  const next = columns.map((col) => {
    if (col.id === target.id) {
      const cards = [...targetCards];
      cards.splice(index, 0, moved);
      return { ...col, cards };
    }
    if (col.id === source.id) return { ...col, cards: col.cards.filter((c) => c.id !== cardId) };
    return col;
  });
  return { next, payload: { column_id: target.id, order } };
}

interface DragState {
  cardId: string | null;
  overColumnId: string | null;
  overIndex: number | null;
}

/**
 * Native HTML5 drag and drop with optimistic updates (R15). `moveCard` is the single move path:
 * snapshot, apply locally inside a transition (so <ViewTransition> can morph the card), PATCH the
 * position, and restore the snapshot with an error toast if the API rejects it.
 */
export function useDragAndDrop(columns: BoardColumn[], setColumns: Dispatch<SetStateAction<BoardColumn[]>>) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const [drag, setDrag] = useState<DragState>({ cardId: null, overColumnId: null, overIndex: null });

  const moveCard = useCallback(
    async (cardId: string, targetColumnId: string, targetIndex: number): Promise<boolean> => {
      const snapshot = columns;
      const plan = planMove(snapshot, cardId, targetColumnId, targetIndex);
      if (!plan) return false;
      startTransition(() => setColumns(plan.next));
      try {
        await apiClient(`/api/cards/${cardId}/position`, { method: "PATCH", token, body: plan.payload });
        return true;
      } catch (error) {
        startTransition(() => setColumns(snapshot)); // revert (R15.4)
        handleError(error);
        return false;
      }
    },
    [columns, setColumns, token, handleError],
  );

  const onCardDragStart = useCallback((event: DragEvent, cardId: string) => {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", cardId); // Firefox needs data to start a drag
    setDrag({ cardId, overColumnId: null, overIndex: null });
  }, []);

  /** Works out the drop index from the pointer position over the column's card list. */
  const onColumnDragOver = useCallback((event: DragEvent<HTMLElement>, columnId: string) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("[data-card-id]"))
      .filter((el) => el.dataset.cardId !== undefined && el.dataset.dragging !== "true");
    let index = items.length;
    for (let i = 0; i < items.length; i++) {
      const rect = items[i].getBoundingClientRect();
      if (event.clientY < rect.top + rect.height / 2) {
        index = i;
        break;
      }
    }
    setDrag((d) => (d.overColumnId === columnId && d.overIndex === index ? d : { ...d, overColumnId: columnId, overIndex: index }));
  }, []);

  const onColumnDrop = useCallback(
    (event: DragEvent, columnId: string) => {
      event.preventDefault();
      const cardId = drag.cardId ?? event.dataTransfer.getData("text/plain");
      const index = drag.overColumnId === columnId && drag.overIndex !== null ? drag.overIndex : Infinity;
      setDrag({ cardId: null, overColumnId: null, overIndex: null });
      if (cardId) void moveCard(cardId, columnId, index);
    },
    [drag, moveCard],
  );

  const onDragEnd = useCallback(() => setDrag({ cardId: null, overColumnId: null, overIndex: null }), []);
  const onColumnDragLeave = useCallback((event: DragEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
      setDrag((d) => ({ ...d, overColumnId: null, overIndex: null }));
    }
  }, []);

  return { drag, moveCard, onCardDragStart, onColumnDragOver, onColumnDrop, onColumnDragLeave, onDragEnd };
}

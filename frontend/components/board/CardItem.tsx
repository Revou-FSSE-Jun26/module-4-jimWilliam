"use client";

import { ViewTransition, useEffect, useRef, type CSSProperties, type DragEvent } from "react";

import { MoveControl } from "@/components/board/MoveControl";
import { Avatar } from "@/components/layout/Avatar";
import { DueChip } from "@/components/shared/DueChip";
import { useSpecularHighlight } from "@/hooks/useSpecularHighlight";
import type { Card, Column } from "@/lib/types";

export interface CardItemProps {
  card: Card;
  columns: Pick<Column, "id" | "name">[];
  dragging: boolean;
  /** The card is in the board's last column, so it is done and never shown as overdue. */
  done?: boolean;
  focusMove: boolean;
  style?: CSSProperties;
  onOpen: (card: Card) => void;
  onMove: (cardId: string, columnId: string) => void;
  onDragStart: (event: DragEvent, cardId: string) => void;
  onDragEnd: () => void;
}

/**
 * A Kanban card: a Glass_Pebble (no blur) inside the blurred column. Wrapped in a named
 * <ViewTransition> so a move morphs it to its new slot (R37.7).
 */
export function CardItem({ card, columns, dragging, done = false, focusMove, style, onOpen, onMove, onDragStart, onDragEnd }: CardItemProps) {
  const onPointerMove = useSpecularHighlight<HTMLElement>();
  const moveRef = useRef<HTMLSelectElement>(null);

  // After a Move_Control move, focus follows the card to its new column.
  useEffect(() => {
    if (focusMove) moveRef.current?.focus();
  }, [focusMove]);

  return (
    <ViewTransition name={`card-${card.id}`} share="morph" default="none">
      <article
        data-card-id={card.id}
        data-testid={`card-${card.id}`}
        data-dragging={dragging || undefined}
        draggable
        onDragStart={(e) => onDragStart(e, card.id)}
        onDragEnd={onDragEnd}
        onPointerMove={onPointerMove}
        // The whole card opens the detail on click; a drag still starts from anywhere that is not a
        // control (Chrome will not start a native drag from a <button>, so no overlay button here).
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest("button, select, a, input, textarea")) onOpen(card);
        }}
        style={style}
        className="card-item group/reveal glass-pebble lift specular enter cursor-grab p-3 active:cursor-grabbing"
      >
        {/* The title stays a real button for keyboard users, with the default focus ring (FE-09). */}
        <button
          type="button"
          onClick={() => onOpen(card)}
          draggable={false}
          className="block w-full rounded-md text-start font-medium leading-snug [overflow-wrap:anywhere]"
        >
          <span className="line-clamp-2">{card.title}</span>
        </button>
        {card.due_date && <DueChip value={card.due_date} done={done} className="mt-2" />}
        <div className="card-meta relative mt-2 items-center gap-3 text-sm text-muted">
          {card.assignee ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <Avatar id={card.assignee.id} name={card.assignee.name} src={card.assignee.avatar_url} size="sm" />
              <span className="truncate">{card.assignee.name}</span>
            </span>
          ) : (
            <span>Unassigned</span>
          )}
          {(card.attachment_count ?? 0) > 0 && (
            <span className="ms-auto inline-flex items-center gap-1" aria-label={`${card.attachment_count} ${card.attachment_count === 1 ? "image" : "images"}`}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><rect x="3.5" y="5" width="17" height="14" rx="3" /><path d="M3.5 16l5-5 4 4 3-3 5 5" /><circle cx="15.5" cy="9.5" r="1.5" /></svg>
              {card.attachment_count}
            </span>
          )}
          <span className={`${(card.attachment_count ?? 0) > 0 ? "" : "ms-auto "}inline-flex items-center gap-1`} aria-label={`${card.comment_count ?? 0} ${(card.comment_count ?? 0) === 1 ? "comment" : "comments"}`}>
            <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 5h16v11H8l-4 4z" /></svg>
            {card.comment_count ?? 0}
          </span>
        </div>
        <div className="relative z-10 mt-2.5">
          <MoveControl ref={moveRef} cardTitle={card.title} columnId={card.column_id} columns={columns} onMove={(columnId) => onMove(card.id, columnId)} />
        </div>
      </article>
    </ViewTransition>
  );
}

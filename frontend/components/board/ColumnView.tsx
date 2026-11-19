"use client";

import { Fragment, useState, type DragEvent, type FormEvent } from "react";

import { CardItem } from "@/components/board/CardItem";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import type { BoardColumn } from "@/hooks/useDragAndDrop";
import type { Card } from "@/lib/types";

export interface ColumnViewProps {
  column: BoardColumn;
  columns: { id: string; name: string }[];
  index: number;
  firstLoad: boolean;
  draggingCardId: string | null;
  dropIndex: number | null;
  focusCardId: string | null;
  onOpenCard: (card: Card) => void;
  onMoveCard: (cardId: string, columnId: string) => void;
  onAddCard: (columnId: string, title: string) => Promise<boolean>;
  onEditColumn: (column: BoardColumn) => void;
  onCardDragStart: (event: DragEvent, cardId: string) => void;
  onDragEnd: () => void;
  onDragOver: (event: DragEvent<HTMLElement>, columnId: string) => void;
  onDragLeave: (event: DragEvent<HTMLElement>) => void;
  onDrop: (event: DragEvent, columnId: string) => void;
}

const MAX_STAGGER = 9; // 9 x 40 ms + 240 ms keeps the first-load reveal under 600 ms (R37.3)

export function ColumnView(props: ColumnViewProps) {
  const { column, columns, index, firstLoad, draggingCardId, dropIndex, focusCardId } = props;
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [pending, setPending] = useState(false);
  const isTarget = dropIndex !== null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setPending(true);
    const ok = await props.onAddCard(column.id, title.trim());
    setPending(false);
    if (ok) setTitle("");
  }

  const stagger = (i: number) => (firstLoad ? { ["--i" as string]: Math.min(i, MAX_STAGGER) } : undefined);
  const placeholder = <div className="drop-placeholder" aria-hidden="true" />;

  return (
    <section
      aria-labelledby={`column-title-${column.id}`}
      data-testid={`column-${column.id}`}
      data-drop-target={isTarget || undefined}
      style={stagger(index)}
      className="kanban-column column-pane glass-pane enter"
      onDragOver={(e) => props.onDragOver(e, column.id)}
      onDragLeave={props.onDragLeave}
      onDrop={(e) => props.onDrop(e, column.id)}
    >
      <header className="flex items-center gap-2 px-4 pt-3.5 pb-2">
        <h2 id={`column-title-${column.id}`} className="min-w-0 truncate text-lg">{column.name}</h2>
        <BaseBadge color="neutral" aria-label={`${column.cards.length} ${column.cards.length === 1 ? "card" : "cards"}`}>{column.cards.length}</BaseBadge>
        <BaseButton variant="ghost" size="sm" className="ms-auto px-2!" aria-label={`Edit column ${column.name}`} onClick={() => props.onEditColumn(column)}>
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="currentColor"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
        </BaseButton>
      </header>

      <div className="card-list min-h-16 flex-1 px-2.5" role="list" aria-label={`${column.name} cards`}>
        {column.cards.map((card, i) => (
          <Fragment key={card.id}>
            {dropIndex === i && placeholder}
            <div role="listitem">
              <CardItem
                card={card}
                columns={columns}
                dragging={draggingCardId === card.id}
                focusMove={focusCardId === card.id}
                style={stagger(index + i + 1)}
                onOpen={props.onOpenCard}
                onMove={props.onMoveCard}
                onDragStart={props.onCardDragStart}
                onDragEnd={props.onDragEnd}
              />
            </div>
          </Fragment>
        ))}
        {column.cards.length > 0 && dropIndex !== null && dropIndex >= column.cards.length && placeholder}
        {/* Empty column: one element that restyles while dragging, so nothing is swapped out under the pointer. */}
        {column.cards.length === 0 && (
          <p className={`px-3 py-4 text-center text-sm text-muted ${dropIndex !== null ? "drop-placeholder" : "rounded-pebble border border-dashed border-rim"}`}>
            {dropIndex !== null ? "Drop to move the card here" : "Drop a card here or add one below."}
          </p>
        )}
      </div>

      <div className="p-2.5 pt-1">
        {adding ? (
          <form onSubmit={submit} className="enter grid gap-2">
            <label htmlFor={`new-card-${column.id}`} className="visually-hidden">Card title</label>
            <input
              id={`new-card-${column.id}`}
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
              placeholder="What needs doing?"
              maxLength={200}
              className="field-input min-h-11! py-2!"
            />
            <div className="flex gap-2">
              <BaseButton type="submit" size="sm" loading={pending} disabled={!title.trim()}>Add card</BaseButton>
              <BaseButton variant="ghost" size="sm" onClick={() => setAdding(false)}>Cancel</BaseButton>
            </div>
          </form>
        ) : (
          <BaseButton variant="ghost" size="sm" className="w-full justify-start!" onClick={() => setAdding(true)} icon={<span className="text-lg leading-none">+</span>}>
            Add card
          </BaseButton>
        )}
      </div>
    </section>
  );
}

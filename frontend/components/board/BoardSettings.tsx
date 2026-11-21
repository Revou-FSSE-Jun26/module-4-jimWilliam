"use client";

import { useId, useState, type DragEvent, type FormEvent, type KeyboardEvent } from "react";

import { Field } from "@/components/forms/Field";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { BoardColorPicker } from "@/components/shared/BoardColorPicker";
import { useAuth } from "@/context/AuthContext";
import type { BoardColumn } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { avatarHue } from "@/lib/avatar";
import { notify } from "@/lib/toast";
import type { Board, Column } from "@/lib/types";

export const PURPOSE_MAX = 280;
const ORDER_STEP = 1024;

export interface BoardSettingsProps {
  open: boolean;
  board: Board;
  columns: BoardColumn[];
  onClose: () => void;
  onSaved: (patch: Pick<Board, "name" | "purpose" | "color_hue" | "due_date">) => void;
  onColumnsChange: (columns: BoardColumn[]) => void;
  onDeleted: () => void;
}

/**
 * Board settings for admins (R47.2, R48, R49): name, purpose and colour; the board's columns
 * (add at any position, rename, reorder, delete); and deleting the board.
 */
export function BoardSettings({ open, board, columns, onClose, onSaved, onColumnsChange, onDeleted }: BoardSettingsProps) {
  const session = useOpenSession(open);
  return (
    <BaseModal open={open} title="Board settings" onClose={onClose} wide>
      {session > 0 && <SettingsBody key={session} board={board} columns={columns} onSaved={onSaved} onColumnsChange={onColumnsChange} onDeleted={onDeleted} />}
    </BaseModal>
  );
}

/**
 * A fresh session number each time the dialog opens, and the last one while it closes, so the body
 * starts from saved values on every opening yet stays visible during the closing animation.
 * (State derived during render, React's "previous props" pattern; no effect needed.)
 */
export function useOpenSession(open: boolean): number {
  const [prevOpen, setPrevOpen] = useState(open);
  const [session, setSession] = useState(open ? 1 : 0);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setSession((s) => s + 1);
  }
  return session;
}

function SettingsBody({ board, columns, onSaved, onColumnsChange, onDeleted }: Omit<BoardSettingsProps, "open" | "onClose">) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [name, setName] = useState(board.name);
  const [purpose, setPurpose] = useState(board.purpose ?? "");
  const [hue, setHue] = useState<number | null>(board.color_hue ?? null);
  const [due, setDue] = useState(board.due_date ?? "");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const patch: Record<string, unknown> = {};
  if (name.trim() !== board.name) patch.name = name.trim();
  if ((purpose.trim() || null) !== (board.purpose ?? null)) patch.purpose = purpose.trim() || null;
  if (hue !== (board.color_hue ?? null)) patch.color_hue = hue;
  if ((due || null) !== (board.due_date ?? null)) patch.due_date = due || null;
  const dirty = Object.keys(patch).length > 0;

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || !dirty) return;
    setSaving(true);
    try {
      const updated = await apiClient<Board>(`/api/boards/${board.id}`, { method: "PATCH", token, body: patch });
      onSaved({ name: updated.name, purpose: updated.purpose ?? null, color_hue: updated.color_hue ?? null, due_date: updated.due_date ?? null });
      notify.success("Board settings saved");
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiClient(`/api/boards/${board.id}`, { method: "DELETE", token });
      onDeleted();
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <div className="grid gap-7">
      <form onSubmit={save} className="grid gap-5" aria-labelledby={`${ids}-general`}>
        <h3 id={`${ids}-general`} className="settings-heading">General and appearance</h3>
        <Field label="Board name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-autofocus required />
        <div className="grid gap-1.5">
          <label htmlFor={`${ids}-purpose`} className="text-sm font-medium">Purpose</label>
          <textarea
            id={`${ids}-purpose`}
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            maxLength={PURPOSE_MAX}
            rows={2}
            aria-describedby={`${ids}-purpose-hint`}
            placeholder="What is this board for? For example: Launch the new site by 12 December"
            className="field-input min-h-0! py-2.5!"
          />
          <p id={`${ids}-purpose-hint`} className="text-xs text-muted">
            Shown under the board title for every member. {PURPOSE_MAX - purpose.length} characters left.
          </p>
        </div>
        <div className="grid gap-1.5">
          <label htmlFor={`${ids}-due`} className="text-sm font-medium">Deadline <span className="font-normal text-muted">(optional)</span></label>
          <div className="flex items-center gap-2">
            <input id={`${ids}-due`} type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field-input min-h-11! w-auto! py-2!" />
            {due && <BaseButton size="sm" variant="ghost" onClick={() => setDue("")}>Clear</BaseButton>}
          </div>
          <p className="text-xs text-muted">Shown beside the purpose with the days left, so the team sees the target date.</p>
        </div>
        <BoardColorPicker value={hue} onChange={setHue} autoHue={avatarHue(board.id)} />
        <div>
          <BaseButton type="submit" loading={saving} loadingLabel="Saving…" disabled={!dirty || !name.trim()}>Save changes</BaseButton>
        </div>
      </form>

      <ColumnManager boardId={board.id} columns={columns} onChange={onColumnsChange} />

      <section className="grid gap-3 rounded-pebble border border-[color-mix(in_srgb,var(--danger-text)_40%,transparent)] p-4" aria-labelledby={`${ids}-danger`}>
        <h3 id={`${ids}-danger`} className="settings-heading text-danger-text">Danger zone</h3>
        <p className="text-sm text-muted">Deleting the board removes its columns, cards, comments, notes, links and photos for everyone.</p>
        <div className="flex flex-wrap gap-2">
          {confirmDelete ? (
            <>
              <BaseButton variant="destructive" onClick={() => void remove()}>Delete board permanently</BaseButton>
              <BaseButton variant="ghost" onClick={() => setConfirmDelete(false)} autoFocus>Keep board</BaseButton>
            </>
          ) : (
            <BaseButton variant="ghost" className="text-danger-text" onClick={() => setConfirmDelete(true)}>Delete board…</BaseButton>
          )}
        </div>
      </section>
    </div>
  );
}

function without(map: Record<string, string>, key: string): Record<string, string> {
  const next = { ...map };
  delete next[key];
  return next;
}

/** Where a new column goes: "start", "end", or after the column with this id. */
export function insertIndex(columns: { id: string }[], position: string): number {
  if (position === "start") return 0;
  const after = columns.findIndex((c) => c.id === position);
  return after === -1 ? columns.length : after + 1;
}

/**
 * Create a column and put it at the chosen position (R49.3): the API appends it, and one reorder
 * request moves it when it should not be last. Returns the new sequence.
 */
export async function createColumnAt(boardId: string, token: string | null, columns: BoardColumn[], name: string, position: string): Promise<BoardColumn[]> {
  const created = await apiClient<Column>(`/api/boards/${boardId}/columns`, { method: "POST", token, body: { name } });
  const column: BoardColumn = { ...created, cards: [] };
  const at = insertIndex(columns, position);
  const next = [...columns.slice(0, at), column, ...columns.slice(at)];
  if (at === columns.length) return next;   // the API already put it last
  const plan = renumber(next);
  await apiClient<Column[]>(`/api/boards/${boardId}/columns/reorder`, { method: "PATCH", token, body: { columns: plan } });
  return next.map((c, i) => ({ ...c, order: plan[i].order }));
}

/** Move the item at `from` so it lands at `to` (an index in the list without it). */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(Math.max(0, Math.min(to, next.length)), 0, item);
  return next;
}

/** Orders 1024, 2048, ... for the given sequence: distinct, positive, and one request. */
export function renumber(columns: { id: string }[]): { id: string; order: number }[] {
  return columns.map((c, i) => ({ id: c.id, order: (i + 1) * ORDER_STEP }));
}

/**
 * The board's columns as an editable list (R49): rename in place (Enter or leaving the field saves),
 * move up and down, delete with a confirmation that names the cards it removes, and add a column
 * at the start, after any column, or at the end. Every change goes to the API before the board updates.
 */
export function ColumnManager({ boardId, columns, onChange }: { boardId: string; columns: BoardColumn[]; onChange: (columns: BoardColumn[]) => void }) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [names, setNames] = useState<Record<string, string>>({});
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [position, setPosition] = useState("end");
  const [busy, setBusy] = useState(false);
  const [armed, setArmed] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [drop, setDrop] = useState<{ id: string; side: "before" | "after" } | null>(null);

  function onDragStart(event: DragEvent<HTMLLIElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);   // Firefox needs data to start a drag
    setDragId(id);
  }

  function onDragOver(event: DragEvent<HTMLLIElement>, id: string) {
    if (!dragId) return;
    event.preventDefault();
    const box = event.currentTarget.getBoundingClientRect();
    const side = event.clientY < box.top + box.height / 2 ? "before" : "after";
    if (drop?.id !== id || drop.side !== side) setDrop({ id, side });
  }

  function endDrag() {
    setDragId(null);
    setDrop(null);
    setArmed(null);
  }

  async function onDrop(event: DragEvent<HTMLLIElement>) {
    event.preventDefault();
    const from = columns.findIndex((c) => c.id === dragId);
    const target = drop ? columns.findIndex((c) => c.id === drop.id) : -1;
    endDrag();
    if (from === -1 || target === -1) return;
    let to = target + (drop!.side === "after" ? 1 : 0);
    if (from < to) to -= 1;
    if (to === from) return;
    setBusy(true);
    try {
      await applyOrder(moveItem(columns, from, to));
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function applyOrder(next: BoardColumn[]) {
    const plan = renumber(next);
    await apiClient<Column[]>(`/api/boards/${boardId}/columns/reorder`, { method: "PATCH", token, body: { columns: plan } });
    onChange(next.map((c, i) => ({ ...c, order: plan[i].order })));
  }

  async function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= columns.length) return;
    const next = [...columns];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      await applyOrder(next);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  async function rename(column: BoardColumn) {
    const value = (names[column.id] ?? column.name).trim();
    if (!value || value === column.name) {
      setNames((n) => without(n, column.id));
      return;
    }
    try {
      const updated = await apiClient<Column>(`/api/columns/${column.id}`, { method: "PATCH", token, body: { name: value } });
      onChange(columns.map((c) => (c.id === column.id ? { ...c, name: updated.name } : c)));
      setNames((n) => without(n, column.id));
      notify.success("Column renamed");
    } catch (err) {
      handleError(err);
    }
  }

  async function remove(column: BoardColumn) {
    try {
      await apiClient(`/api/columns/${column.id}`, { method: "DELETE", token });
      onChange(columns.filter((c) => c.id !== column.id));
      setConfirmId(null);
      notify.success(`Column "${column.name}" deleted`);
    } catch (err) {
      handleError(err);
    }
  }

  async function add(event: FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      onChange(await createColumnAt(boardId, token, columns, newName.trim(), position));
      setNewName("");
      setPosition("end");
      notify.success(`Column "${newName.trim()}" added`);
    } catch (err) {
      handleError(err);
    } finally {
      setBusy(false);
    }
  }

  const onKey = (event: KeyboardEvent<HTMLInputElement>, column: BoardColumn) => {
    if (event.key === "Enter") {
      event.preventDefault();
      void rename(column);
    }
    if (event.key === "Escape" && names[column.id] !== undefined) {
      event.preventDefault();
      event.stopPropagation();   // keep the dialog open; just undo the edit
      setNames((n) => without(n, column.id));
    }
  };

  return (
    <section className="grid gap-3" aria-labelledby={`${ids}-columns`} aria-busy={busy || undefined}>
      <h3 id={`${ids}-columns`} className="settings-heading">Columns</h3>
      <p className="text-sm text-muted">Drag a column by its grip, or use the arrows. The last column counts as done for progress and analytics.</p>
      {columns.length === 0 ? (
        <p className="text-sm text-muted">No columns yet. Add the first one below.</p>
      ) : (
        <ol className="grid gap-2" data-testid="column-manager">
          {columns.map((column, i) => (
            <li
              key={column.id}
              className="column-row glass-pebble rounded-pebble p-2"
              draggable={armed === column.id}
              data-dragging={dragId === column.id || undefined}
              data-drop={drop?.id === column.id && dragId !== column.id ? drop.side : undefined}
              onDragStart={(e) => onDragStart(e, column.id)}
              onDragOver={(e) => onDragOver(e, column.id)}
              onDrop={(e) => void onDrop(e)}
              onDragEnd={endDrag}
            >
              <span
                className="column-row-grip"
                aria-hidden="true"
                title="Drag to reorder"
                onPointerDown={() => setArmed(column.id)}
                onPointerUp={() => !dragId && setArmed(null)}
              >
                <svg viewBox="0 0 16 16" className="size-4" fill="currentColor"><circle cx="5.5" cy="4" r="1.3" /><circle cx="10.5" cy="4" r="1.3" /><circle cx="5.5" cy="8" r="1.3" /><circle cx="10.5" cy="8" r="1.3" /><circle cx="5.5" cy="12" r="1.3" /><circle cx="10.5" cy="12" r="1.3" /></svg>
              </span>
              <span className="column-row-index" aria-hidden="true">{i + 1}</span>
              <label htmlFor={`${ids}-col-${column.id}`} className="visually-hidden">Name of column {i + 1}</label>
              <input
                id={`${ids}-col-${column.id}`}
                value={names[column.id] ?? column.name}
                onChange={(e) => setNames((n) => ({ ...n, [column.id]: e.target.value }))}
                onBlur={() => void rename(column)}
                onKeyDown={(e) => onKey(e, column)}
                maxLength={120}
                className="field-input min-h-10! min-w-0 flex-1 py-1.5!"
              />
              <span className="shrink-0 text-xs text-muted tabular-nums">{column.cards.length} {column.cards.length === 1 ? "card" : "cards"}</span>
              <span className="flex shrink-0 gap-1">
                <button type="button" className="column-row-btn" onClick={() => void move(i, -1)} disabled={busy || i === 0} aria-label={`Move ${column.name} left`}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
                </button>
                <button type="button" className="column-row-btn" onClick={() => void move(i, 1)} disabled={busy || i === columns.length - 1} aria-label={`Move ${column.name} right`}>
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
                </button>
                {confirmId === column.id ? (
                  <>
                    <BaseButton size="sm" variant="destructive" onClick={() => void remove(column)} autoFocus>
                      Delete{column.cards.length ? ` with ${column.cards.length} ${column.cards.length === 1 ? "card" : "cards"}` : ""}
                    </BaseButton>
                    <BaseButton size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Keep</BaseButton>
                  </>
                ) : (
                  <button type="button" className="column-row-btn hover:text-danger-text" onClick={() => setConfirmId(column.id)} aria-label={`Delete ${column.name}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M5 7h14M10 11v6M14 11v6M6 7l1 12h10l1-12M9 7V4h6v3" /></svg>
                  </button>
                )}
              </span>
            </li>
          ))}
        </ol>
      )}
      <form onSubmit={add} className="flex flex-wrap items-end gap-2" aria-label="Add a column">
        <div className="min-w-48 flex-1">
          <Field label="New column name" value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={120} />
        </div>
        <div className="grid gap-1">
          <label htmlFor={`${ids}-position`} className="text-xs text-muted">Position</label>
          <select id={`${ids}-position`} value={position} onChange={(e) => setPosition(e.target.value)} className="field-input min-h-11! py-2! pe-8">
            <option value="start" className="bg-(--raised-solid)">At the start</option>
            {columns.slice(0, -1).map((c) => (
              <option key={c.id} value={c.id} className="bg-(--raised-solid)">After {c.name}</option>
            ))}
            <option value="end" className="bg-(--raised-solid)">At the end</option>
          </select>
        </div>
        <BaseButton type="submit" variant="secondary" loading={busy} loadingLabel="Adding…" disabled={!newName.trim()}>Add column</BaseButton>
      </form>
    </section>
  );
}

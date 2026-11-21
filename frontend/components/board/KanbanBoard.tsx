"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { AddColumnDialog } from "@/components/board/AddColumnDialog";
import { AnalyticsPanel } from "@/components/board/AnalyticsPanel";
import { BoardBrief } from "@/components/board/BoardBrief";
import { BoardSettings } from "@/components/board/BoardSettings";
import { ColumnView } from "@/components/board/ColumnView";
import { KanbanNavigator } from "@/components/board/KanbanNavigator";
import { MembersPanel } from "@/components/board/MembersPanel";
import { CardDetailModal } from "@/components/CardDetailModal";
import { Field } from "@/components/forms/Field";
import { PageHeader, useShell } from "@/components/layout/AppShell";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { DeadlineChip } from "@/components/shared/DeadlineChip";
import { useAuth } from "@/context/AuthContext";
import { useDragAndDrop, type BoardColumn } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { sortBoard } from "@/lib/board";
import { boardHue } from "@/lib/boardColor";
import { columnStats } from "@/lib/progress";
import { notify } from "@/lib/toast";
import type { BoardDetail, Card, Column } from "@/lib/types";

/** Client side of /boards/[id] (R14–R16, R31.12, R33): receives the server-fetched board. */
export function KanbanBoard({ initialBoard }: { initialBoard: BoardDetail }) {
  const router = useRouter();
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const [board, setBoard] = useState(initialBoard);
  const [columns, setColumns] = useState<BoardColumn[]>(() => sortBoard(initialBoard.columns));
  const rowRef = useRef<HTMLDivElement>(null);
  const navColumns = useMemo(() => columns.map((c) => ({ id: c.id, name: c.name, count: c.cards.length })), [columns]);
  const { reportBoardStats } = useShell();
  // Keep the sidebar's progress liquid in step with moves, adds and deletes on this board (R46.4).
  useEffect(() => reportBoardStats(initialBoard.id, columnStats(columns)), [columns, initialBoard.id, reportBoardStats]);
  const [firstLoad, setFirstLoad] = useState(true);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [focusCardId, setFocusCardId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsKey, setAnalyticsKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [briefOpen, setBriefOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [addingColumn, setAddingColumn] = useState(false);
  const isAdmin = board.role === "admin";
  const dnd = useDragAndDrop(columns, setColumns);

  // The staggered reveal plays once, on first load only (R37.3).
  useEffect(() => {
    const id = setTimeout(() => setFirstLoad(false), 1600);
    return () => clearTimeout(id);
  }, []);

  // Deep links from the Nav_Tree: #members and #analytics (admins only).
  useEffect(() => {
    const sync = () => {
      if (!isAdmin) return;
      if (window.location.hash === "#members") setMembersOpen(true);
      if (window.location.hash === "#analytics") {
        setAnalyticsOpen(true);
        requestAnimationFrame(() => document.getElementById("analytics")?.scrollIntoView({ block: "start" }));
      }
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, [isAdmin]);

  const columnOptions = useMemo(() => columns.map((c) => ({ id: c.id, name: c.name })), [columns]);

  const onMoveCard = useCallback(
    async (cardId: string, columnId: string) => {
      setFocusCardId(null);
      const moved = await dnd.moveCard(cardId, columnId, Infinity);
      if (moved) {
        setFocusCardId(cardId);
        setAnalyticsKey((k) => k + 1);
      }
    },
    [dnd],
  );

  const addCard = useCallback(
    async (columnId: string, title: string) => {
      try {
        const card = await apiClient<Card>(`/api/columns/${columnId}/cards`, { method: "POST", token, body: { title } });
        setColumns((cols) => cols.map((c) => (c.id === columnId ? { ...c, cards: [...c.cards, card] } : c)));
        return true;
      } catch (err) {
        handleError(err);
        return false;
      }
    },
    [token, handleError],
  );

  const updateCard = useCallback((card: Card) => {
    setColumns((cols) => cols.map((c) => ({ ...c, cards: c.cards.map((x) => (x.id === card.id ? { ...x, ...card } : x)) })));
    setOpenCard((open) => (open && open.id === card.id ? { ...open, ...card } : open));
  }, []);

  const deleteCard = useCallback((cardId: string) => {
    setOpenCard(null);
    setColumns((cols) => cols.map((c) => ({ ...c, cards: c.cards.filter((x) => x.id !== cardId) })));
  }, []);

  const openCardDetail = useCallback((card: Card) => startTransition(() => setOpenCard(card)), []);
  const closeCard = useCallback(() => setOpenCard(null), []);

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex min-w-0 max-w-full items-center gap-2.5">
            <span className="board-dot size-3! shrink-0" style={{ ["--board-hue" as string]: boardHue(board) }} aria-hidden="true" />
            <span className="truncate">{board.name}</span>
          </span>
        }
        subtitle={
          board.purpose || board.due_date ? (
            <span className="flex min-w-0 items-center gap-2">
              {board.purpose && (
            <button type="button" onClick={() => setBriefOpen(true)} className="board-purpose min-w-0" title={board.purpose}>
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.5" /></svg>
              <span className="visually-hidden">Purpose: </span>
              <span className="truncate">{board.purpose}</span>
            </button>
              )}
              {board.due_date && <DeadlineChip value={board.due_date} />}
            </span>
          ) : (
            isAdmin ? "You are an admin of this board" : "You are a member of this board"
          )
        }
        actions={
          <div className="hidden items-center gap-2 sm:flex">
            <BaseButton variant="secondary" size="sm" onClick={() => setBriefOpen(true)}>About</BaseButton>
            {isAdmin && (
              <>
                <BaseButton variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>Members</BaseButton>
                <BaseButton variant="secondary" size="sm" aria-expanded={analyticsOpen} aria-controls="analytics" onClick={() => setAnalyticsOpen((o) => !o)}>Analytics</BaseButton>
                <BaseButton variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>Settings</BaseButton>
              </>
            )}
          </div>
        }
      />

      <div className="mt-3 flex flex-wrap gap-2 sm:hidden">
        <BaseButton variant="secondary" size="sm" onClick={() => setBriefOpen(true)}>About</BaseButton>
        {isAdmin && (
          <>
            <BaseButton variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>Members</BaseButton>
            <BaseButton variant="secondary" size="sm" aria-expanded={analyticsOpen} aria-controls="analytics" onClick={() => setAnalyticsOpen((o) => !o)}>Analytics</BaseButton>
            <BaseButton variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>Settings</BaseButton>
          </>
        )}
      </div>

      {isAdmin && (
        <section id="analytics" aria-label="Board analytics" hidden={!analyticsOpen} className="glass-pane enter mt-4 scroll-mt-24 rounded-pane p-4 md:p-5">
          {analyticsOpen && <AnalyticsPanel boardId={board.id} refreshKey={analyticsKey} />}
        </section>
      )}

      {/* Board_Stage (R44): fills the rest of the viewport; columns run full height and scroll sideways. */}
      <div className="board-stage mt-4">
      <div ref={rowRef} className="kanban-row" role="region" aria-label="Columns">
        {columns.map((column, i) => (
          <ColumnView
            key={column.id}
            column={column}
            columns={columnOptions}
            index={i}
            isDone={columns.length >= 2 && i === columns.length - 1}
            firstLoad={firstLoad}
            draggingCardId={dnd.drag.cardId}
            dropIndex={dnd.drag.overColumnId === column.id ? dnd.drag.overIndex : null}
            focusCardId={focusCardId}
            onOpenCard={openCardDetail}
            onMoveCard={onMoveCard}
            onAddCard={addCard}
            onEditColumn={setEditingColumn}
            onCardDragStart={dnd.onCardDragStart}
            onDragEnd={dnd.onDragEnd}
            onDragOver={dnd.onColumnDragOver}
            onDragLeave={dnd.onColumnDragLeave}
            onDrop={dnd.onColumnDrop}
          />
        ))}
        <button
          type="button"
          onClick={() => setAddingColumn(true)}
          className="kanban-add-tile enter"
          data-empty={columns.length === 0 || undefined}
          aria-label="Add a column"
          title="Add a column"
        >
          <span aria-hidden="true" className="kanban-add-plus">+</span>
          {columns.length === 0 && <span className="text-sm font-medium">Add your first column</span>}
        </button>
      </div>
      <KanbanNavigator rowRef={rowRef} columns={navColumns} />
      </div>

      <BoardBrief
        open={briefOpen}
        board={board}
        onClose={() => setBriefOpen(false)}
        onNotesSaved={(notes) => setBoard((b) => ({ ...b, notes }))}
        onEditSettings={isAdmin ? () => { setBriefOpen(false); setSettingsOpen(true); } : undefined}
      />

      <AddColumnDialog
        open={addingColumn}
        boardId={board.id}
        columns={columns}
        onClose={() => setAddingColumn(false)}
        onAdded={setColumns}
        onManage={isAdmin ? () => { setAddingColumn(false); setSettingsOpen(true); } : undefined}
      />

      <CardDetailModal card={openCard} boardId={board.id} role={board.role} onClose={closeCard} onUpdated={updateCard} onDeleted={deleteCard} />

      <ColumnSettings
        key={editingColumn?.id ?? "none"}
        column={editingColumn}
        onClose={() => setEditingColumn(null)}
        onRenamed={(col) => setColumns((cols) => cols.map((c) => (c.id === col.id ? { ...c, name: col.name } : c)))}
        onDeleted={(id) => setColumns((cols) => cols.filter((c) => c.id !== id))}
      />

      {isAdmin && (
        <>
          <MembersPanel boardId={board.id} open={membersOpen} onClose={() => { setMembersOpen(false); if (window.location.hash) history.replaceState(null, "", window.location.pathname); }} />
          <BoardSettings
            open={settingsOpen}
            board={board}
            columns={columns}
            onClose={() => setSettingsOpen(false)}
            onSaved={(patch) => { setBoard((b) => ({ ...b, ...patch })); router.refresh(); }}
            onColumnsChange={setColumns}
            onDeleted={() => { notify.success("Board deleted"); router.replace("/"); router.refresh(); }}
          />
        </>
      )}
    </>
  );
}

function ColumnSettings({ column, onClose, onRenamed, onDeleted }: {
  column: BoardColumn | null; onClose: () => void; onRenamed: (c: Column) => void; onDeleted: (id: string) => void;
}) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  // Remounted per column (key below), so the form starts from that column's name.
  const [name, setName] = useState(column?.name ?? "");
  const [confirm, setConfirm] = useState(false);

  async function rename(event: FormEvent) {
    event.preventDefault();
    if (!column || !name.trim()) return;
    try {
      onRenamed(await apiClient<Column>(`/api/columns/${column.id}`, { method: "PATCH", token, body: { name: name.trim() } }));
      notify.success("Column renamed");
      onClose();
    } catch (err) {
      handleError(err);
    }
  }

  async function remove() {
    if (!column) return;
    try {
      await apiClient(`/api/columns/${column.id}`, { method: "DELETE", token });
      onDeleted(column.id);
      notify.success("Column deleted");
      onClose();
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <BaseModal open={!!column} title={column ? `Edit ${column.name}` : "Edit column"} onClose={onClose}>
      <form onSubmit={rename} className="grid gap-4">
        <Field label="Column name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-autofocus />
        <div className="flex flex-wrap gap-2">
          <BaseButton type="submit" disabled={!name.trim() || name.trim() === column?.name}>Rename column</BaseButton>
          {confirm ? (
            <BaseButton variant="destructive" onClick={() => void remove()}>
              Delete column and its {column?.cards.length ?? 0} cards
            </BaseButton>
          ) : (
            <BaseButton variant="ghost" className="text-danger-text" onClick={() => setConfirm(true)}>Delete…</BaseButton>
          )}
        </div>
      </form>
    </BaseModal>
  );
}

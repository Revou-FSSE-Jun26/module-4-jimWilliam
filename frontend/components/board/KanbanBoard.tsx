"use client";

import { useRouter } from "next/navigation";
import { startTransition, useCallback, useEffect, useMemo, useState, type FormEvent } from "react";

import { AnalyticsPanel } from "@/components/board/AnalyticsPanel";
import { ColumnView } from "@/components/board/ColumnView";
import { MembersPanel } from "@/components/board/MembersPanel";
import { CardDetailModal } from "@/components/CardDetailModal";
import { Field } from "@/components/forms/Field";
import { PageHeader } from "@/components/layout/AppShell";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useDragAndDrop, type BoardColumn } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { BoardDetail, Card, Column } from "@/lib/types";

/** Client side of /boards/[id] (R14–R16, R31.12, R33): receives the server-fetched board. */
export function KanbanBoard({ initialBoard }: { initialBoard: BoardDetail }) {
  const router = useRouter();
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const [board, setBoard] = useState(initialBoard);
  const [columns, setColumns] = useState<BoardColumn[]>(initialBoard.columns);
  const [firstLoad, setFirstLoad] = useState(true);
  const [openCard, setOpenCard] = useState<Card | null>(null);
  const [focusCardId, setFocusCardId] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsKey, setAnalyticsKey] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingColumn, setEditingColumn] = useState<BoardColumn | null>(null);
  const [newColumn, setNewColumn] = useState("");
  const isAdmin = board.role === "admin";
  const dnd = useDragAndDrop(columns, setColumns);

  // The staggered reveal plays once, on first load only (R37.3).
  useEffect(() => {
    const id = setTimeout(() => setFirstLoad(false), 700);
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

  async function addColumn(event: FormEvent) {
    event.preventDefault();
    if (!newColumn.trim()) return;
    try {
      const column = await apiClient<Column>(`/api/boards/${board.id}/columns`, { method: "POST", token, body: { name: newColumn.trim() } });
      setColumns((cols) => [...cols, { ...column, cards: [] }]);
      setNewColumn("");
    } catch (err) {
      handleError(err);
    }
  }

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
        title={board.name}
        subtitle={isAdmin ? "You are an admin of this board" : "You are a member of this board"}
        actions={
          isAdmin && (
            <div className="hidden items-center gap-2 sm:flex">
              <BaseButton variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>Members</BaseButton>
              <BaseButton variant="secondary" size="sm" aria-expanded={analyticsOpen} aria-controls="analytics" onClick={() => setAnalyticsOpen((o) => !o)}>Analytics</BaseButton>
              <BaseButton variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>Settings</BaseButton>
            </div>
          )
        }
      />

      {isAdmin && (
        <div className="mt-3 flex gap-2 sm:hidden">
          <BaseButton variant="secondary" size="sm" onClick={() => setMembersOpen(true)}>Members</BaseButton>
          <BaseButton variant="secondary" size="sm" aria-expanded={analyticsOpen} aria-controls="analytics" onClick={() => setAnalyticsOpen((o) => !o)}>Analytics</BaseButton>
          <BaseButton variant="secondary" size="sm" onClick={() => setSettingsOpen(true)}>Settings</BaseButton>
        </div>
      )}

      {isAdmin && (
        <section id="analytics" aria-label="Board analytics" hidden={!analyticsOpen} className="glass-pane enter mt-4 scroll-mt-24 rounded-pane p-4 md:p-5">
          {analyticsOpen && <AnalyticsPanel boardId={board.id} refreshKey={analyticsKey} />}
        </section>
      )}

      <div className="kanban-row mt-4" role="region" aria-label="Columns">
        {columns.map((column, i) => (
          <ColumnView
            key={column.id}
            column={column}
            columns={columnOptions}
            index={i}
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
        <form onSubmit={addColumn} className="kanban-column glass-pane enter grid content-start gap-3 border-dashed p-4" aria-label="Add a column">
          <h2 className="text-lg">Add a column</h2>
          <Field label="Column name" value={newColumn} onChange={(e) => setNewColumn(e.target.value)} maxLength={120} />
          <BaseButton type="submit" variant="secondary" disabled={!newColumn.trim()}>Add column</BaseButton>
        </form>
      </div>

      <CardDetailModal card={openCard} boardId={board.id} onClose={closeCard} onUpdated={updateCard} onDeleted={deleteCard} />

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
            onClose={() => setSettingsOpen(false)}
            onRenamed={(name) => { setBoard((b) => ({ ...b, name })); router.refresh(); }}
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

function BoardSettings({ open, board, onClose, onRenamed, onDeleted }: {
  open: boolean; board: BoardDetail; onClose: () => void; onRenamed: (name: string) => void; onDeleted: () => void;
}) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const [name, setName] = useState(board.name);
  const [confirm, setConfirm] = useState(false);

  async function rename(event: FormEvent) {
    event.preventDefault();
    try {
      const updated = await apiClient<{ name: string }>(`/api/boards/${board.id}`, { method: "PATCH", token, body: { name: name.trim() } });
      onRenamed(updated.name);
      notify.success("Board renamed");
      onClose();
    } catch (err) {
      handleError(err);
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
    <BaseModal open={open} title="Board settings" onClose={onClose}>
      <form onSubmit={rename} className="grid gap-4">
        <Field label="Board name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-autofocus />
        <div className="flex flex-wrap gap-2">
          <BaseButton type="submit" disabled={!name.trim() || name.trim() === board.name}>Rename board</BaseButton>
          {confirm ? (
            <BaseButton variant="destructive" onClick={() => void remove()}>Delete board permanently</BaseButton>
          ) : (
            <BaseButton variant="ghost" className="text-danger-text" onClick={() => setConfirm(true)}>Delete board…</BaseButton>
          )}
        </div>
      </form>
    </BaseModal>
  );
}

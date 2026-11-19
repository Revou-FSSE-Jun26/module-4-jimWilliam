"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { CommentList } from "@/components/CommentList";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { Card, Member } from "@/lib/types";

export interface CardDetailModalProps {
  card: Card | null;
  boardId: string;
  onClose: () => void;
  onUpdated: (card: Card) => void;
  onDeleted: (cardId: string) => void;
}

/** CommentList inside BaseModal (R16.1), plus title, description, assignee and delete. */
export function CardDetailModal({ card, boardId, onClose, onUpdated, onDeleted }: CardDetailModalProps) {
  return (
    <BaseModal open={!!card} title={card?.title ?? "Card"} onClose={onClose} sheet wide>
      {/* Keyed by card id: each card starts with fresh form state, and a comment-count update never wipes edits. */}
      {card && <CardDetailBody key={card.id} card={card} boardId={boardId} onUpdated={onUpdated} onDeleted={onDeleted} />}
    </BaseModal>
  );
}

function CardDetailBody({ card, boardId, onUpdated, onDeleted }: Omit<CardDetailModalProps, "card" | "onClose"> & { card: Card }) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description ?? "");
  const [assigneeId, setAssigneeId] = useState(card.assignee_id ?? "");
  const [members, setMembers] = useState<Member[]>([]);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let cancelled = false;
    apiClient<Member[]>(`/api/boards/${boardId}/members`, { token })
      .then((list) => !cancelled && setMembers(list))
      .catch((err) => !cancelled && handleError(err));
    return () => {
      cancelled = true;
    };
  }, [boardId, token, handleError]);

  const dirty = (title.trim() !== card.title || description !== (card.description ?? "") || assigneeId !== (card.assignee_id ?? ""));

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      const updated = await apiClient<Card>(`/api/cards/${card.id}`, {
        method: "PATCH",
        token,
        body: { title: title.trim(), description: description || null, assignee_id: assigneeId || null },
      });
      onUpdated({ ...updated, comment_count: card.comment_count });
      notify.success("Card saved");
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    try {
      await apiClient(`/api/cards/${card.id}`, { method: "DELETE", token });
      onDeleted(card.id);
      notify.success("Card deleted");
    } catch (err) {
      handleError(err);
    }
  }

  return (
        <>
          <form onSubmit={save} className="grid gap-4">
            <div className="grid gap-1.5">
              <label htmlFor={`${ids}-title`} className="text-sm font-medium">Title</label>
              <input id={`${ids}-title`} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required data-autofocus className="field-input min-h-11! py-2!" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={`${ids}-desc`} className="text-sm font-medium">Description</label>
              <textarea id={`${ids}-desc`} value={description} onChange={(e) => setDescription(e.target.value)} rows={4} placeholder="Add details, links or acceptance notes" className="field-input min-h-0! py-2.5!" />
            </div>
            <div className="grid gap-1.5">
              <label htmlFor={`${ids}-assignee`} className="text-sm font-medium">Assignee</label>
              <select id={`${ids}-assignee`} value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="field-input min-h-11! py-2!">
                <option value="" className="bg-(--raised-solid)">Unassigned</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id} className="bg-(--raised-solid)">{m.name}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <BaseButton type="submit" loading={saving} loadingLabel="Saving…" disabled={!dirty || !title.trim()}>Save card</BaseButton>
              {confirmDelete ? (
                <>
                  <BaseButton variant="destructive" onClick={() => void remove()}>Delete card</BaseButton>
                  <BaseButton variant="ghost" onClick={() => setConfirmDelete(false)} autoFocus>Keep card</BaseButton>
                </>
              ) : (
                <BaseButton variant="ghost" className="text-danger-text" onClick={() => setConfirmDelete(true)}>Delete…</BaseButton>
              )}
            </div>
          </form>
          <CommentList
            cardId={card.id}
            active={!!card}
            onCountChange={(n) => n !== card.comment_count && onUpdated({ ...card, comment_count: n })}
          />
        </>
  );
}

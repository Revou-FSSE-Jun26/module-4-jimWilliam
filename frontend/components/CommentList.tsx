"use client";

import { useEffect, useState, type FormEvent } from "react";

import { Avatar } from "@/components/layout/Avatar";
import { BaseButton } from "@/components/shared/BaseButton";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { Comment } from "@/lib/types";

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/**
 * Comments for a card (R16.2–R16.5): loads B18 when shown, posts B17, and shows edit and delete
 * only on comments the signed-in user wrote.
 */
export function CommentList({ cardId, active, onCountChange }: { cardId: string; active: boolean; onCountChange?: (n: number) => void }) {
  const { token, user } = useAuth();
  const handleError = useErrorHandler();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [text, setText] = useState("");
  const [posting, setPosting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    apiClient<Comment[]>(`/api/cards/${cardId}/comments`, { token })
      .then((list) => !cancelled && setComments(list))
      .catch((err) => {
        if (cancelled) return;
        handleError(err);
        setComments([]);
      });
    return () => {
      cancelled = true;
    };
  }, [active, cardId, token, handleError]);

  useEffect(() => {
    if (comments) onCountChange?.(comments.length);
  }, [comments, onCountChange]);

  async function post(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    try {
      const comment = await apiClient<Comment>(`/api/cards/${cardId}/comments`, { method: "POST", token, body: { text: text.trim() } });
      setComments((list) => [...(list ?? []), comment]);
      setText("");
    } catch (err) {
      handleError(err);
    } finally {
      setPosting(false);
    }
  }

  async function saveEdit(id: string) {
    if (!editText.trim()) return;
    try {
      const updated = await apiClient<Comment>(`/api/comments/${id}`, { method: "PATCH", token, body: { text: editText.trim() } });
      setComments((list) => (list ?? []).map((c) => (c.id === id ? updated : c)));
      setEditingId(null);
      notify.success("Comment updated");
    } catch (err) {
      handleError(err);
    }
  }

  async function remove(id: string) {
    try {
      await apiClient(`/api/comments/${id}`, { method: "DELETE", token });
      setComments((list) => (list ?? []).filter((c) => c.id !== id));
      notify.success("Comment deleted");
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <section aria-labelledby={`comments-${cardId}`} className="mt-6">
      <h3 id={`comments-${cardId}`} className="mb-3 text-lg">Comments</h3>
      {comments === null ? (
        <div className="grid gap-2" aria-busy="true">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : comments.length === 0 ? (
        <p className="text-sm text-muted">No comments yet. Start the conversation below.</p>
      ) : (
        <ul className="grid gap-2.5" data-testid="comment-list">
          {comments.map((c) => {
            const mine = c.user_id === user?.id;
            return (
              <li key={c.id} className="group/reveal glass-pebble enter flex gap-3 rounded-pebble p-3" data-testid="comment">
                <Avatar id={c.author.id} name={c.author.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm"><span className="font-semibold">{c.author.name}</span> <span className="text-muted">{when(c.created_at)}</span></p>
                  {editingId === c.id ? (
                    <div className="enter mt-2 grid gap-2">
                      <label htmlFor={`edit-${c.id}`} className="visually-hidden">Edit comment</label>
                      <textarea id={`edit-${c.id}`} value={editText} onChange={(e) => setEditText(e.target.value)} rows={2} className="field-input min-h-0! py-2!" autoFocus />
                      <div className="flex gap-2">
                        <BaseButton size="sm" onClick={() => void saveEdit(c.id)} disabled={!editText.trim()}>Save</BaseButton>
                        <BaseButton size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</BaseButton>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-0.5 whitespace-pre-wrap [overflow-wrap:anywhere]" data-testid="comment-text">{c.text}</p>
                  )}
                </div>
                {mine && editingId !== c.id && (
                  <div className="reveal-on-hover flex shrink-0 items-start gap-1">
                    <BaseButton size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditText(c.text); }} aria-label="Edit comment">Edit</BaseButton>
                    <BaseButton size="sm" variant="ghost" onClick={() => void remove(c.id)} aria-label="Delete comment" className="text-danger-text">Delete</BaseButton>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <form onSubmit={post} className="mt-4 grid gap-2">
        <label htmlFor={`new-comment-${cardId}`} className="text-sm font-medium">Add a comment</label>
        <textarea
          id={`new-comment-${cardId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Share an update or ask a question"
          className="field-input min-h-0! py-2.5!"
        />
        <div>
          <BaseButton type="submit" size="sm" loading={posting} loadingLabel="Posting…" disabled={!text.trim()}>Post comment</BaseButton>
        </div>
      </form>
    </section>
  );
}

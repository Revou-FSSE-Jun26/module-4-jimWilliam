"use client";

import { useEffect, useId, useState, type FormEvent } from "react";

import { ImageGallery } from "@/components/CardAttachments";
import { Field } from "@/components/forms/Field";
import { BaseButton } from "@/components/shared/BaseButton";
import { useOpenSession } from "@/components/board/BoardSettings";
import { BaseModal } from "@/components/shared/BaseModal";
import { RichTextEditor } from "@/components/shared/RichTextEditor";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import { notify } from "@/lib/toast";
import type { BoardDetail, BoardLink } from "@/lib/types";

export const MAX_BOARD_PHOTOS = 30;

export interface BoardBriefProps {
  open: boolean;
  board: BoardDetail;
  onClose: () => void;
  onNotesSaved: (notes: string | null) => void;
  /** Admins can jump from an empty purpose to the settings. */
  onEditSettings?: () => void;
}

export function hostOf(url: string): string {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * About this board (R47): the purpose, shared notes (rich text, e.g. meeting notes), pinned links
 * (recordings, documents) and photos. Every member can read and add; the person who added a link or
 * photo, or a board admin, can remove it. Recordings and documents are linked, not uploaded (see design).
 */
export function BoardBrief({ open, board, onClose, onNotesSaved, onEditSettings }: BoardBriefProps) {
  const session = useOpenSession(open);
  return (
    <BaseModal open={open} title={`About ${board.name}`} onClose={onClose} sheet wide>
      {session > 0 && <BriefBody key={session} board={board} onNotesSaved={onNotesSaved} onEditSettings={onEditSettings} />}
    </BaseModal>
  );
}

function BriefBody({ board, onNotesSaved, onEditSettings }: Omit<BoardBriefProps, "open" | "onClose">) {
  const ids = useId();
  return (
    <div className="grid gap-7">
      <section aria-labelledby={`${ids}-purpose`} className="brief-purpose rounded-pebble p-4">
        <h3 id={`${ids}-purpose`} className="settings-heading flex items-center gap-2">
          <TargetIcon /> Purpose
        </h3>
        {board.purpose ? (
          <p className="mt-2 font-display text-xl leading-snug [overflow-wrap:anywhere]">{board.purpose}</p>
        ) : (
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <p className="text-muted">No purpose yet. A one-line goal helps everyone remember what this board is for.</p>
            {board.role === "admin" && onEditSettings && (
              <BaseButton size="sm" variant="secondary" onClick={onEditSettings}>Set a purpose</BaseButton>
            )}
          </div>
        )}
      </section>
      <NotesSection board={board} onSaved={onNotesSaved} />
      <LinksSection boardId={board.id} role={board.role} />
      <ImageGallery path={`/api/boards/${board.id}/photos`} max={MAX_BOARD_PHOTOS} heading="Photos" owner="board" role={board.role} />
    </div>
  );
}

function TargetIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4.5 text-seaglass" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12l7-7M16 5h3v3" />
    </svg>
  );
}

function NotesSection({ board, onSaved }: { board: BoardDetail; onSaved: (notes: string | null) => void }) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [notes, setNotes] = useState(board.notes ?? "");
  const [saved, setSaved] = useState(board.notes ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const result = await apiClient<{ notes: string | null }>(`/api/boards/${board.id}/notes`, { method: "PATCH", token, body: { notes: notes || null } });
      setSaved(notes);
      onSaved(result.notes);
      notify.success("Notes saved");
    } catch (err) {
      handleError(err);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby={`${ids}-notes`} className="grid gap-2">
      <h3 id={`${ids}-notes`} className="settings-heading">Notes</h3>
      <span id={`${ids}-notes-label`} className="visually-hidden">Board notes</span>
      <RichTextEditor
        value={board.notes ?? ""}
        onChange={setNotes}
        labelledBy={`${ids}-notes-label`}
        placeholder="Meeting notes, decisions, the definition of done…"
      />
      <div>
        <BaseButton size="sm" loading={saving} loadingLabel="Saving…" disabled={notes === saved} onClick={() => void save()}>Save notes</BaseButton>
      </div>
    </section>
  );
}

function LinksSection({ boardId, role }: { boardId: string; role: BoardDetail["role"] }) {
  const { token, user } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [links, setLinks] = useState<BoardLink[] | null>(null);
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiClient<BoardLink[]>(`/api/boards/${boardId}/links`, { token })
      .then((list) => !cancelled && setLinks(list))
      .catch((err) => !cancelled && handleError(err));
    return () => {
      cancelled = true;
    };
  }, [boardId, token, handleError]);

  async function add(event: FormEvent) {
    event.preventDefault();
    const value = url.trim();
    if (!value) return;
    const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    setAdding(true);
    try {
      const link = await apiClient<BoardLink>(`/api/boards/${boardId}/links`, { method: "POST", token, body: { url: withScheme, title: title.trim() || null } });
      setLinks((list) => [...(list ?? []), link]);
      setUrl("");
      setTitle("");
      notify.success("Link added");
    } catch (err) {
      handleError(err);
    } finally {
      setAdding(false);
    }
  }

  async function remove(link: BoardLink) {
    try {
      await apiClient(`/api/boards/links/${link.id}`, { method: "DELETE", token });
      setLinks((list) => (list ?? []).filter((l) => l.id !== link.id));
      setConfirmId(null);
      notify.success("Link removed");
    } catch (err) {
      handleError(err);
    }
  }

  return (
    <section aria-labelledby={`${ids}-links`} aria-busy={links === null || undefined} className="grid gap-3">
      <h3 id={`${ids}-links`} className="settings-heading">Links</h3>
      <p className="text-sm text-muted">Pin meeting recordings, documents or designs. They open in a new tab.</p>
      {links && links.length > 0 && (
        <ul className="grid gap-2" data-testid="board-links">
          {links.map((link) => {
            const canRemove = role === "admin" || link.created_by?.id === user?.id;
            return (
              <li key={link.id} className="group/reveal glass-pebble flex items-center gap-3 rounded-pebble p-2.5">
                <span aria-hidden="true" className="inline-flex size-9 shrink-0 items-center justify-center rounded-pill bg-[color-mix(in_srgb,var(--seaglass)_16%,transparent)]">
                  <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" /></svg>
                </span>
                <a href={link.url} target="_blank" rel="noopener noreferrer nofollow" className="min-w-0 flex-1 no-underline">
                  <span className="block truncate font-medium text-foam hover:underline">{link.title}</span>
                  <span className="block truncate text-xs text-muted">{hostOf(link.url)}{link.created_by ? ` · added by ${link.created_by.name}` : ""}</span>
                </a>
                {canRemove && (confirmId === link.id ? (
                  <span className="flex shrink-0 gap-1">
                    <BaseButton size="sm" variant="destructive" onClick={() => void remove(link)} autoFocus>Remove</BaseButton>
                    <BaseButton size="sm" variant="ghost" onClick={() => setConfirmId(null)}>Keep</BaseButton>
                  </span>
                ) : (
                  <button type="button" className="column-row-btn reveal-on-hover" onClick={() => setConfirmId(link.id)} aria-label={`Remove link ${link.title}`}>
                    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                  </button>
                ))}
              </li>
            );
          })}
        </ul>
      )}
      {links && links.length === 0 && <p className="text-sm text-muted">No links yet.</p>}
      <form onSubmit={add} className="grid gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-end" aria-label="Add a link">
        <Field label="Web address" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} maxLength={2048} />
        <Field label="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} />
        <BaseButton type="submit" variant="secondary" loading={adding} loadingLabel="Adding…" disabled={!url.trim()}>Add link</BaseButton>
      </form>
    </section>
  );
}

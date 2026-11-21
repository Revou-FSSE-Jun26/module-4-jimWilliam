"use client";

import { useId, useState, type FormEvent } from "react";

import { createColumnAt, useOpenSession } from "@/components/board/BoardSettings";
import { Field } from "@/components/forms/Field";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { useAuth } from "@/context/AuthContext";
import type { BoardColumn } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { notify } from "@/lib/toast";

export interface AddColumnDialogProps {
  open: boolean;
  boardId: string;
  columns: BoardColumn[];
  onClose: () => void;
  onAdded: (columns: BoardColumn[]) => void;
  /** Admins can jump to the full column manager in Board settings. */
  onManage?: () => void;
}

/**
 * The board's "+" tile opens this (R49.7): a name and a position, so members can add a stage such as
 * "Ideas" before "To do" without leaving the board. Admins also get a link to the full manager.
 */
export function AddColumnDialog({ open, boardId, columns, onClose, onAdded, onManage }: AddColumnDialogProps) {
  const session = useOpenSession(open);
  return (
    <BaseModal open={open} title="Add a column" onClose={onClose}>
      {session > 0 && <AddColumnForm key={session} boardId={boardId} columns={columns} onAdded={onAdded} onClose={onClose} onManage={onManage} />}
    </BaseModal>
  );
}

function AddColumnForm({ boardId, columns, onAdded, onClose, onManage }: Omit<AddColumnDialogProps, "open">) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const ids = useId();
  const [name, setName] = useState("");
  const [position, setPosition] = useState("end");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      onAdded(await createColumnAt(boardId, token, columns, name.trim(), position));
      notify.success(`Column "${name.trim()}" added`);
      onClose();
    } catch (err) {
      handleError(err);
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4" aria-label="Add a column">
      <Field label="Column name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-autofocus required />
      {columns.length > 0 && (
        <div className="grid gap-1.5">
          <label htmlFor={`${ids}-position`} className="text-sm font-medium">Position</label>
          <select id={`${ids}-position`} value={position} onChange={(e) => setPosition(e.target.value)} className="field-input min-h-11! py-2!">
            <option value="start" className="bg-(--raised-solid)">At the start</option>
            {columns.slice(0, -1).map((c) => (
              <option key={c.id} value={c.id} className="bg-(--raised-solid)">After {c.name}</option>
            ))}
            <option value="end" className="bg-(--raised-solid)">At the end</option>
          </select>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <BaseButton type="submit" loading={pending} loadingLabel="Adding…" disabled={!name.trim()}>Add column</BaseButton>
        {onManage && <BaseButton variant="ghost" onClick={onManage}>Manage all columns…</BaseButton>}
      </div>
    </form>
  );
}

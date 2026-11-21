"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import { Field } from "@/components/forms/Field";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { BaseModal } from "@/components/shared/BaseModal";
import { BoardColorPicker } from "@/components/shared/BoardColorPicker";
import { DeadlineChip } from "@/components/shared/DeadlineChip";
import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useSpecularHighlight } from "@/hooks/useSpecularHighlight";
import { apiClient } from "@/lib/apiClient";
import { BOARD_COLORS, boardHue } from "@/lib/boardColor";
import { notify } from "@/lib/toast";
import type { Board } from "@/lib/types";

function plural(n: number, word: string) {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

/** Board tiles in an auto-fill grid (R38.3) with a "New board" tile (R13.2) and an empty state (R13.4). */
export function BoardGrid({ initialBoards }: { initialBoards: Board[] }) {
  const router = useRouter();
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const onPointerMove = useSpecularHighlight<HTMLAnchorElement>();
  const [boards, setBoards] = useState(initialBoards);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [hue, setHue] = useState<number | null>(null);
  const [due, setDue] = useState("");
  const [pending, setPending] = useState(false);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setPending(true);
    try {
      const board = await apiClient<Board>("/api/boards", {
        method: "POST",
        token,
        body: { name: name.trim(), purpose: purpose.trim() || null, color_hue: hue, ...(due ? { due_date: due } : {}) },
      });
      setBoards((list) => [board, ...list]);
      setName("");
      setPurpose("");
      setHue(null);
      setDue("");
      setOpen(false);
      notify.success(`Board "${board.name}" created`);
      router.refresh(); // updates the Boards group in the Nav_Tree
    } catch (err) {
      handleError(err);
    } finally {
      setPending(false);
    }
  }

  const modal = (
    <BaseModal open={open} title="New board" onClose={() => setOpen(false)}>
      <form onSubmit={create} className="grid gap-4">
        <Field label="Board name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} data-autofocus required />
        <div className="grid gap-1.5">
          <label htmlFor="new-board-purpose" className="text-sm font-medium">Purpose <span className="font-normal text-muted">(optional)</span></label>
          <textarea
            id="new-board-purpose"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            maxLength={280}
            rows={2}
            placeholder="What should this board achieve? For example: Launch the new site by 12 December"
            className="field-input min-h-0! py-2.5!"
          />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="new-board-due" className="text-sm font-medium">Deadline <span className="font-normal text-muted">(optional)</span></label>
          <input id="new-board-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} className="field-input min-h-11! w-auto! py-2!" />
        </div>
        {/* A new board has no id yet, so "Automatic" previews the first palette colour. */}
        <BoardColorPicker value={hue} onChange={setHue} autoHue={BOARD_COLORS[3].hue} />
        <BaseButton type="submit" loading={pending} loadingLabel="Creating…" disabled={!name.trim()}>Create board</BaseButton>
      </form>
    </BaseModal>
  );

  if (boards.length === 0) {
    return (
      <>
        <section className="glass-pane enter mx-auto mt-10 grid max-w-xl justify-items-start gap-4 rounded-pane p-8">
          <h2 className="text-2xl">No boards yet</h2>
          <p className="text-muted">Create a board to start organising work into columns and cards. You can invite your team once it exists.</p>
          <BaseButton onClick={() => setOpen(true)}>Create your first board</BaseButton>
        </section>
        {modal}
      </>
    );
  }

  return (
    <>
      <ul className="mx-auto mt-5 grid max-w-[140rem] grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-4" aria-label="Your boards">
        <li className="enter" style={{ ["--i" as string]: 0 }}>
          <BaseButton
            variant="ghost"
            onClick={() => setOpen(true)}
            className="h-full min-h-40! w-full flex-col items-start! justify-end! gap-1! rounded-pane! border-[1.5px] border-dashed border-seaglass/60 p-5! text-start whitespace-normal"
          >
            <span aria-hidden="true" className="text-3xl leading-none text-seaglass">+</span>
            <span className="font-display text-xl font-semibold">New board</span>
            <span className="text-sm font-normal text-muted">Start with an empty board</span>
          </BaseButton>
        </li>
        {boards.map((board, i) => (
          <li key={board.id} className="enter" style={{ ["--i" as string]: Math.min(i + 1, 9) }}>
            <Link
              href={`/boards/${board.id}`}
              onPointerMove={onPointerMove}
              className="board-tile glass-pane lift specular flex h-full min-h-40 flex-col gap-3 rounded-pane p-5 text-foam no-underline"
              style={{ ["--board-hue" as string]: boardHue(board) }}
            >
              <span className="flex items-start gap-3">
                <span className="board-dot mt-2.5 size-3! shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 font-display text-xl font-semibold leading-snug [overflow-wrap:anywhere]">{board.name}</span>
                <BaseBadge color={board.role === "admin" ? "info" : "neutral"}>{board.role === "admin" ? "Admin" : "Member"}</BaseBadge>
              </span>
              {board.purpose && <span className="line-clamp-2 text-sm text-muted [overflow-wrap:anywhere]">{board.purpose}</span>}
              {board.due_date && <DeadlineChip value={board.due_date} />}
              <span className="mt-auto flex flex-wrap gap-2 text-sm text-muted">
                <span className="rounded-pill border border-rim px-2.5 py-0.5">{plural(board.card_count ?? 0, "open card")}</span>
                <span className="rounded-pill border border-rim px-2.5 py-0.5">{plural(board.member_count ?? 1, "member")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {modal}
    </>
  );
}

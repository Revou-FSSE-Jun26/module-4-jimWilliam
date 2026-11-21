"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { PageHeader } from "@/components/layout/AppShell";
import { DueChip } from "@/components/shared/DueChip";
import { BaseBadge } from "@/components/shared/BaseBadge";
import { BaseButton } from "@/components/shared/BaseButton";
import { useAuth } from "@/context/AuthContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { useSpecularHighlight } from "@/hooks/useSpecularHighlight";
import { apiClient } from "@/lib/apiClient";
import type { Card } from "@/lib/types";

/** /my-tasks (R17): assigned cards grouped by board, plus a 300 ms debounced search across your boards. */
export default function MyTasksPage() {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const onPointerMove = useSpecularHighlight<HTMLAnchorElement>();
  const [term, setTerm] = useState("");
  const debounced = useDebouncedValue(term.trim(), 300);
  const searching = debounced.length > 0;
  const path = searching ? `/api/cards?search=${encodeURIComponent(debounced)}` : "/api/cards?assignee=me";
  // The result remembers which request it answers; loading = the current request has no answer yet.
  const [result, setResult] = useState<{ path: string; cards: Card[] } | null>(null);
  const cards = result?.cards ?? null;
  const loading = result?.path !== path;

  useEffect(() => {
    let cancelled = false;
    apiClient<Card[]>(path, { token })
      .then((list) => !cancelled && setResult({ path, cards: list }))
      .catch((err) => {
        if (cancelled) return;
        handleError(err);
        setResult((r) => ({ path, cards: r?.cards ?? [] }));
      });
    return () => {
      cancelled = true;
    };
  }, [path, token, handleError]);

  const groups = useMemo(() => {
    const map = new Map<string, { boardId: string; boardName: string; cards: Card[] }>();
    for (const card of cards ?? []) {
      const key = card.board_id ?? "";
      if (!map.has(key)) map.set(key, { boardId: key, boardName: card.board_name ?? "Board", cards: [] });
      map.get(key)!.cards.push(card);
    }
    return [...map.values()];
  }, [cards]);

  return (
    <>
      <PageHeader title="My tasks" subtitle={searching ? "Search results across your boards" : "Cards assigned to you, grouped by board"} />

      <div role="search" className="glass-pane mt-4 flex items-center gap-2 rounded-pane p-2 ps-4">
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0 text-muted" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M11 18a7 7 0 100-14 7 7 0 000 14zm9 2l-4.3-4.3" /></svg>
        <label htmlFor="card-search" className="visually-hidden">Search cards</label>
        <input
          id="card-search"
          type="search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search cards by title or description"
          className="min-h-11 min-w-0 flex-1 bg-transparent text-foam placeholder:text-muted focus-visible:outline-none"
        />
        {term && <BaseButton variant="ghost" size="sm" onClick={() => setTerm("")}>Clear</BaseButton>}
      </div>

      <div aria-live="polite" aria-busy={loading} className="mt-5">
        {loading && cards === null ? (
          <div className="grid gap-3" data-testid="tasks-loading">
            <p className="text-sm text-muted">Loading cards…</p>
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
          </div>
        ) : groups.length === 0 ? (
          <section className="glass-pane enter grid justify-items-start gap-2 rounded-pane p-6">
            <h2 className="text-xl">{searching ? `No cards match "${debounced}"` : "Nothing assigned to you"}</h2>
            <p className="text-muted">{searching ? "Try a shorter word, or check the spelling." : "When someone assigns you a card it shows up here, grouped by board."}</p>
          </section>
        ) : (
          <div className={`grid gap-6 transition-opacity duration-150 ${loading ? "opacity-60" : ""}`}>
            {loading && <p className="text-sm text-muted">Updating…</p>}
            {groups.map((group) => (
              <section key={group.boardId} aria-labelledby={`group-${group.boardId}`} className="enter">
                <h2 id={`group-${group.boardId}`} className="mb-3 flex items-center gap-2 text-xl">
                  {group.boardName} <BaseBadge>{group.cards.length}</BaseBadge>
                </h2>
                <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-3">
                  {group.cards.map((card) => (
                    <li key={card.id}>
                      <Link
                        href={`/boards/${group.boardId}`}
                        onPointerMove={onPointerMove}
                        data-testid={`task-${card.id}`}
                        className="glass-pebble lift specular block h-full rounded-pebble p-4 text-foam no-underline"
                      >
                        <span className="block font-medium [overflow-wrap:anywhere]">{card.title}</span>
                        {card.description_text && <span className="mt-1 line-clamp-2 block text-sm text-muted">{card.description_text}</span>}
                        {card.due_date && <DueChip value={card.due_date} className="mt-2" />}
                        <span className="mt-2 block text-sm text-muted">{card.assignee ? `Assigned to ${card.assignee.name}` : "Unassigned"}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

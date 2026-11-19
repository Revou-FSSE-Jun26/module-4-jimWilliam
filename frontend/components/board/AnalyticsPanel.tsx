"use client";

import { useEffect, useState } from "react";

import { useAuth } from "@/context/AuthContext";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { apiClient } from "@/lib/apiClient";
import type { Analytics } from "@/lib/types";

/** Admin-only analytics (R14.5): cards per column, completed this week, member activity. */
export function AnalyticsPanel({ boardId, refreshKey }: { boardId: string; refreshKey: number }) {
  const { token } = useAuth();
  const handleError = useErrorHandler();
  const [data, setData] = useState<Analytics | null>(null);

  useEffect(() => {
    apiClient<Analytics>(`/api/boards/${boardId}/analytics`, { token }).then(setData).catch(handleError);
  }, [boardId, token, handleError, refreshKey]);

  if (!data) return <div className="skeleton h-28" aria-busy="true" />;
  const max = Math.max(1, ...data.cards_per_column.map((c) => c.count));

  return (
    <div className="grid gap-5 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)_minmax(0,1fr)]">
      <div>
        <h3 className="mb-2 text-base">Cards per column</h3>
        <ul className="grid gap-1.5">
          {data.cards_per_column.map((c) => (
            <li key={c.column_id} className="grid grid-cols-[minmax(0,7rem)_1fr_2rem] items-center gap-2 text-sm">
              <span className="truncate">{c.name}</span>
              <span className="h-2 rounded-pill bg-[color-mix(in_srgb,var(--foam)_10%,transparent)]">
                <span className="block h-full rounded-pill bg-seaglass" style={{ inlineSize: `${(c.count / max) * 100}%` }} />
              </span>
              <span className="text-end tabular-nums">{c.count}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <h3 className="mb-2 text-base">Done this week</h3>
        <p className="font-display text-5xl leading-none tabular-nums">{data.completed_this_week}</p>
        <p className="mt-1 text-sm text-muted">cards in the last column, updated since Monday</p>
      </div>
      <div>
        <h3 className="mb-2 text-base">Member activity</h3>
        <table className="w-full text-sm">
          <thead className="text-muted">
            <tr><th scope="col" className="text-start font-medium">Member</th><th scope="col" className="text-end font-medium">Comments</th><th scope="col" className="text-end font-medium">Assigned</th></tr>
          </thead>
          <tbody>
            {data.activity_per_member.map((m) => (
              <tr key={m.user_id}><td className="truncate py-0.5">{m.name}</td><td className="text-end tabular-nums">{m.comments}</td><td className="text-end tabular-nums">{m.cards_assigned}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

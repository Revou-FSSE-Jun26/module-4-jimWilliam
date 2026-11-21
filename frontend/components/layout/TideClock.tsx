"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/context/AuthContext";
import { useNow } from "@/hooks/useNow";
import { apiClient } from "@/lib/apiClient";
import { clockParts, dayPart, longDate, shortDate, tideTrend } from "@/lib/tide";
import type { Card } from "@/lib/types";

const FORMAT_KEY = "revotask_clock";
const FORMAT_EVENT = "revotask-clock";

function readHour12(): boolean {
  try {
    return localStorage.getItem(FORMAT_KEY) === "12";
  } catch {
    return false;
  }
}

function subscribeFormat(onChange: () => void) {
  window.addEventListener(FORMAT_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(FORMAT_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setHour12(value: boolean) {
  try {
    localStorage.setItem(FORMAT_KEY, value ? "12" : "24");
  } catch {
    /* storage unavailable: the format still switches for this page */
  }
  window.dispatchEvent(new Event(FORMAT_EVENT));
}

/** The number of cards assigned to the signed-in user, fetched once per mount (R45.4). */
function useAssignedCount(enabled: boolean): number | null {
  const { token } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    if (!enabled || !token) return;
    let cancelled = false;
    apiClient<Card[]>("/api/cards?assignee=me", { token })
      .then((cards) => !cancelled && setCount(cards.length))
      .catch(() => undefined);   // a decorative extra: no toast if it fails
    return () => {
      cancelled = true;
    };
  }, [enabled, token]);
  return count;
}

/**
 * Tide_Clock (R45): the time, the date and the tide, above the Profile_Capsule. Clicking the time
 * switches between 24-hour and 12-hour formats (remembered in this browser). The sidebar's waves
 * rise and fall with the same tide. `compact` is the icon-rail version: the time only.
 */
export function TideClock({ compact = false }: { compact?: boolean }) {
  const now = useNow();
  const hour12 = useSyncExternalStore(subscribeFormat, readHour12, () => false);
  const assigned = useAssignedCount(!compact);

  // Server render and hydration: an invisible placeholder of the same size, so nothing shifts.
  if (now === null) {
    return <div className={compact ? "tide-clock tide-clock-compact" : "tide-clock"} aria-hidden="true" data-pending="" />;
  }

  const date = new Date(now);
  const { hours, minutes, suffix } = clockParts(date, hour12);
  const spoken = `${hours}:${minutes}${suffix ? ` ${suffix}` : ""}`;
  const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${minutes}`;
  const trend = tideTrend(date);
  const toggleLabel = `${spoken}, ${longDate(date)}. Switch to ${hour12 ? "24-hour" : "12-hour"} time`;

  if (compact) {
    return (
      <div className="tide-clock tide-clock-compact">
        <button type="button" className="tide-clock-time" onClick={() => setHour12(!hour12)} aria-label={toggleLabel} title={longDate(date)}>
          <time dateTime={iso}>
            {hours}
            <span className="tide-clock-colon" aria-hidden="true">:</span>
            {minutes}
          </time>
        </button>
      </div>
    );
  }

  return (
    <section className="tide-clock" aria-label="Clock">
      <button type="button" className="tide-clock-time" onClick={() => setHour12(!hour12)} aria-label={toggleLabel} title="Switch 12/24-hour time">
        <time dateTime={iso}>
          {hours}
          <span className="tide-clock-colon" aria-hidden="true">:</span>
          {minutes}
          {suffix && <span className="tide-clock-suffix">{suffix}</span>}
        </time>
      </button>
      <p className="tide-clock-meta">
        <span>{shortDate(date)}</span>
        <span aria-hidden="true">·</span>
        <span className="inline-flex items-center gap-1">
          <svg aria-hidden="true" viewBox="0 0 16 16" className={`size-3.5 ${trend === "rising" ? "" : "rotate-180"}`} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M8 13V3M4 7l4-4 4 4" /></svg>
          {dayPart(date)} tide {trend}
        </span>
      </p>
      {assigned !== null && (
        <Link href="/my-tasks" className="tide-clock-tasks">
          <span className="font-semibold tabular-nums">{assigned}</span> {assigned === 1 ? "card" : "cards"} assigned to you
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </Link>
      )}
    </section>
  );
}

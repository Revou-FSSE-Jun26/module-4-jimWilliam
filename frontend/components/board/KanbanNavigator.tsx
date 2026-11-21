"use client";

import { useCallback, useEffect, useState, type RefObject } from "react";

export interface NavigatorColumn {
  id: string;
  name: string;
  count: number;
}

interface ScrollState {
  overflow: boolean;
  canLeft: boolean;
  canRight: boolean;
  visible: string[];
}

const EMPTY: ScrollState = { overflow: false, canLeft: false, canRight: false, visible: [] };

function columnEl(row: HTMLElement, id: string): HTMLElement | null {
  return row.querySelector<HTMLElement>(`[data-testid="column-${CSS.escape(id)}"]`);
}

/** Which columns are at least half visible inside the row, and whether the row can scroll each way. */
export function measure(row: HTMLElement, ids: string[]): ScrollState {
  const max = row.scrollWidth - row.clientWidth;
  const box = row.getBoundingClientRect();
  const visible = ids.filter((id) => {
    const el = columnEl(row, id);
    if (!el) return false;
    const r = el.getBoundingClientRect();
    const shown = Math.min(r.right, box.right) - Math.max(r.left, box.left);
    return r.width > 0 && shown / r.width >= 0.5;
  });
  return { overflow: max > 1, canLeft: row.scrollLeft > 1, canRight: row.scrollLeft < max - 1, visible };
}

/**
 * Horizontal navigation for the Kanban (R44): edge shades and arrow buttons that appear only when
 * there is more to see, a dock of column chips that shows which columns are in view and jumps to one,
 * and a mouse wheel that scrolls sideways when it is not over a card list that can scroll itself.
 */
export function KanbanNavigator({ rowRef, columns }: { rowRef: RefObject<HTMLDivElement | null>; columns: NavigatorColumn[] }) {
  const [state, setState] = useState<ScrollState>(EMPTY);
  const ids = columns.map((c) => c.id).join("|");

  const update = useCallback(() => {
    const row = rowRef.current;
    if (row) setState(measure(row, ids ? ids.split("|") : []));
  }, [rowRef, ids]);

  useEffect(() => {
    const row = rowRef.current;
    if (!row) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    schedule();
    row.addEventListener("scroll", schedule, { passive: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(row);

    // Vertical wheel scrolls the row sideways, unless a card list under the pointer can scroll that way.
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey || Math.abs(event.deltaX) >= Math.abs(event.deltaY)) return;
      const list = (event.target as HTMLElement).closest<HTMLElement>(".card-list");
      if (list) {
        const down = event.deltaY > 0;
        const canScroll = down ? list.scrollTop + list.clientHeight < list.scrollHeight - 1 : list.scrollTop > 0;
        if (canScroll) return;
      }
      const max = row.scrollWidth - row.clientWidth;
      if (max <= 1) return;
      const atEdge = event.deltaY > 0 ? row.scrollLeft >= max - 1 : row.scrollLeft <= 0;
      if (atEdge) return;   // let the page scroll instead
      event.preventDefault();
      row.scrollLeft += event.deltaY;
    };
    row.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      cancelAnimationFrame(frame);
      row.removeEventListener("scroll", schedule);
      row.removeEventListener("wheel", onWheel);
      resize.disconnect();
    };
  }, [rowRef, update]);

  const smooth = () => (window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth") as ScrollBehavior;

  const page = (direction: 1 | -1) => {
    const row = rowRef.current;
    if (row) row.scrollBy({ left: direction * row.clientWidth * 0.8, behavior: smooth() });
  };

  const jump = (id: string) => {
    const row = rowRef.current;
    const el = row && columnEl(row, id);
    if (!row || !el) return;
    const offset = el.getBoundingClientRect().left - row.getBoundingClientRect().left;
    row.scrollBy({ left: offset - 8, behavior: smooth() });
  };

  return (
    <>
      <div className="kanban-edge kanban-edge-start" data-shown={state.canLeft || undefined} aria-hidden="true" />
      <div className="kanban-edge kanban-edge-end" data-shown={state.canRight || undefined} aria-hidden="true" />
      {state.canLeft && (
        <button type="button" className="kanban-arrow kanban-arrow-start glass-pebble" onClick={() => page(-1)} aria-label="Scroll columns left">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M15 6l-6 6 6 6" /></svg>
        </button>
      )}
      {state.canRight && (
        <button type="button" className="kanban-arrow kanban-arrow-end glass-pebble" onClick={() => page(1)} aria-label="Scroll columns right">
          <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 6l6 6-6 6" /></svg>
        </button>
      )}
      {state.overflow && columns.length > 1 && (
        <nav className="kanban-dock glass-pebble enter" aria-label="Jump to a column">
          <ul className="flex items-center gap-1">
            {columns.map((column) => {
              const inView = state.visible.includes(column.id);
              return (
                <li key={column.id}>
                  <button
                    type="button"
                    className="kanban-dock-chip"
                    data-in-view={inView || undefined}
                    aria-current={inView ? "true" : undefined}
                    onClick={() => jump(column.id)}
                    title={`${column.name}: ${column.count} ${column.count === 1 ? "card" : "cards"}`}
                  >
                    <span className="kanban-dock-dot" aria-hidden="true" />
                    <span className="kanban-dock-name">{column.name}</span>
                    <span className="kanban-dock-count" aria-hidden="true">{column.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </>
  );
}

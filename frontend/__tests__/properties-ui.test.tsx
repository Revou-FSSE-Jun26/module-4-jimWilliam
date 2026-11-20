/**
 * fast-check properties for hooks and components.
 * Feature: revotask, Properties 18, 28, 30, 31, 34.
 */
import { act, cleanup, render, renderHook, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";
import { useState, type ReactNode } from "react";

import { CommentList } from "@/components/CommentList";
import { NotificationBell } from "@/components/NotificationBell";
import { AuthProvider } from "@/context/AuthContext";
import { PrefsProvider } from "@/context/PrefsContext";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { planMove, useDragAndDrop, type BoardColumn } from "@/hooks/useDragAndDrop";
import { useErrorHandler } from "@/hooks/useErrorHandler";
import { ApiError } from "@/lib/errors";
import { DEFAULT_PREFS } from "@/lib/prefs";
import { notify } from "@/lib/toast";
import type { Comment, NotificationPage } from "@/lib/types";

import { ANA } from "./test-utils";

const deleteSession = jest.requireMock("@/app/actions/session").deleteSession as jest.Mock;

function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider initial={{ token: "t", user: ANA }}>
      <PrefsProvider initial={DEFAULT_PREFS}>{children}</PrefsProvider>
    </AuthProvider>
  );
}

function respond(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => payload } as Response;
}

afterEach(() => {
  cleanup();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("Property 18: search debounce (R5.3, R17.2)", () => {
  it("emits once per quiet period of at least 300 ms, with the latest value", () => {
    fc.assert(fc.property(fc.array(fc.tuple(fc.string({ maxLength: 6 }), fc.integer({ min: 0, max: 600 })), { minLength: 1, maxLength: 12 }), (steps) => {
      jest.useFakeTimers();
      const { result, rerender, unmount } = renderHook(({ v }) => useDebouncedValue(v, 300), { initialProps: { v: "" } });
      // Model: a value is emitted once 300 ms pass without the input *changing*; re-entering the
      // same value does not restart the timer.
      let expected = "";
      let current = "";
      let quietFor = 0;
      for (const [value, gap] of steps) {
        rerender({ v: value });
        if (value !== current) quietFor = 0;
        current = value;
        act(() => { jest.advanceTimersByTime(gap); });
        quietFor += gap;
        if (quietFor >= 300) expected = current;
        expect(result.current).toBe(expected);
      }
      unmount();
      jest.useRealTimers();
    }), { numRuns: 100 });
  });
});

const columnsArb = fc.integer({ min: 1, max: 3 }).chain((nCols) =>
  fc.array(fc.integer({ min: 0, max: 3 }), { minLength: nCols, maxLength: nCols }).map((counts): BoardColumn[] =>
    counts.map((n, c) => ({
      id: `col${c}`, board_id: "b", name: `C${c}`, order: (c + 1) * 1024,
      cards: Array.from({ length: n }, (_, k) => ({
        id: `card${c}-${k}`, column_id: `col${c}`, title: `t${c}${k}`, description: null, assignee_id: null, assignee: null,
        order: (k + 1) * 1024, created_at: "", updated_at: "",
      })),
    }))));

describe("Property 28: optimistic move, then revert on failure (R15.2, R15.4)", () => {
  it("shows the move before the API answers and restores the board if it fails", async () => {
    await fc.assert(fc.asyncProperty(columnsArb, fc.nat(), fc.nat(), fc.nat(), fc.boolean(), async (board, pickCard, pickCol, index, fails) => {
      const cards = board.flatMap((c) => c.cards);
      fc.pre(cards.length > 0);
      const moving = cards[pickCard % cards.length].id;
      const target = board[pickCol % board.length].id;
      const plan = planMove(board, moving, target, index % 5);
      fc.pre(plan !== null);

      let release!: (r: Response) => void;
      global.fetch = jest.fn(() => new Promise<Response>((resolve) => { release = resolve; })) as unknown as typeof fetch;
      const toast = jest.spyOn(notify, "error").mockImplementation(() => "");
      const { result, unmount } = renderHook(() => {
        const [columns, setColumns] = useState(board);
        return { columns, dnd: useDragAndDrop(columns, setColumns) };
      }, { wrapper: Providers });

      let done!: Promise<boolean>;
      act(() => { done = result.current.dnd.moveCard(moving, target, index % 5); });
      await waitFor(() => expect(result.current.columns).toEqual(plan!.next)); // optimistic, before the API answers
      await act(async () => {
        release(fails ? respond(500, { error: "boom" }) : respond(200, { data: {} }));
        await done;
      });
      expect(result.current.columns).toEqual(fails ? board : plan!.next);
      expect(toast).toHaveBeenCalledTimes(fails ? 1 : 0);
      unmount();
      toast.mockRestore();
    }), { numRuns: 100 });
  });
});

describe("Property 30: comment controls follow ownership (R16.4, R16.5)", () => {
  it("shows edit and delete on exactly the signed-in user's comments", async () => {
    await fc.assert(fc.asyncProperty(fc.array(fc.boolean(), { minLength: 1, maxLength: 6 }), async (mine) => {
      const comments: Comment[] = mine.map((isMine, i) => ({
        id: `m${i}`, card_id: "card", user_id: isMine ? ANA.id : `other-${i}`, author: { id: isMine ? ANA.id : `other-${i}`, name: isMine ? "Ana" : `Other ${i}` },
        text: `comment ${i}`, created_at: "2026-11-19T10:00:00Z", updated_at: "2026-11-19T10:00:00Z",
      }));
      global.fetch = jest.fn(async () => respond(200, { data: comments })) as unknown as typeof fetch;
      const { unmount } = render(<CommentList cardId="card" active />, { wrapper: Providers });
      const items = await screen.findAllByTestId("comment");
      items.forEach((item, i) => {
        expect(!!within(item).queryByRole("button", { name: "Edit comment" })).toBe(mine[i]);
        expect(!!within(item).queryByRole("button", { name: "Delete comment" })).toBe(mine[i]);
      });
      unmount();
    }), { numRuns: 100 });
  });
});

describe("Property 31: unread badge reflects the count (R19.1, R19.3, R19.4)", () => {
  it("shows n when n > 0, hides at 0, and shows n - 1 after marking one read", async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 0, max: 150 }), async (n) => {
      const page: NotificationPage = {
        items: n > 0 ? [{ id: "n1", message: "Assigned", card_id: null, board_id: null, read: false, created_at: "2026-11-19T10:00:00Z" }] : [],
        page: 1, per_page: 10, total: n, unread_count: n,
      };
      global.fetch = jest.fn(async (_url: string, init?: RequestInit) =>
        init?.method === "PATCH" ? respond(200, { data: {} }) : respond(200, { data: page })) as unknown as typeof fetch;
      const { unmount } = render(<NotificationBell />, { wrapper: Providers });
      const label = (count: number) => (count > 99 ? "99+" : String(count));
      if (n === 0) {
        await waitFor(() => expect(global.fetch).toHaveBeenCalled());
        expect(screen.queryByTestId("unread-count")).toBeNull();
      } else {
        expect(await screen.findByTestId("unread-count")).toHaveTextContent(label(n));
        await userEvent.click(screen.getByRole("button", { name: /Mark as read/ }));
        if (n - 1 === 0) await waitFor(() => expect(screen.queryByTestId("unread-count")).toBeNull());
        else await waitFor(() => expect(screen.getByTestId("unread-count")).toHaveTextContent(label(n - 1)));
      }
      unmount();
    }), { numRuns: 100 });
  });
});

describe("Property 34: every status maps to a toast message (R21.6, R21.7)", () => {
  it("shows a non-empty message and ends the session only on 401", () => {
    fc.assert(fc.property(fc.integer({ min: 0, max: 599 }), fc.string({ maxLength: 30 }), (status, message) => {
      const toast = jest.spyOn(notify, "error").mockImplementation(() => "");
      deleteSession.mockClear();
      const { result, unmount } = renderHook(() => useErrorHandler(), { wrapper: Providers });
      act(() => result.current(new ApiError(status, message)));
      expect(toast).toHaveBeenCalledTimes(1);
      expect((toast.mock.calls[0][0] as string).trim().length).toBeGreaterThan(0);
      expect(deleteSession).toHaveBeenCalledTimes(status === 401 ? 1 : 0);
      unmount();
      toast.mockRestore();
    }), { numRuns: 100 });
  });
});

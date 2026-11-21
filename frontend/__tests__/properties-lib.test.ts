/**
 * fast-check properties for pure modules (100 runs each, design "Testing Strategy").
 * Feature: revotask, Properties 27, 29, 32, 33, 36, 38, 39.
 */
import fc from "fast-check";

import { planMove, type BoardColumn } from "@/hooks/useDragAndDrop";
import { apiClient } from "@/lib/apiClient";
import { avatarHue, initials } from "@/lib/avatar";
import { sortBoard } from "@/lib/board";
import { ApiError } from "@/lib/errors";
import { computeOrder } from "@/lib/order";
import { parsePrefs, serializePrefs, type Prefs } from "@/lib/prefs";

const RUNS = { numRuns: 100 };
const order = fc.double({ min: 0.001, max: 1e9, noNaN: true, noDefaultInfinity: true });

function card(id: string, columnId: string, o: number) {
  return { id, column_id: columnId, title: id, description: null, assignee_id: null, assignee: null, order: o, created_at: "", updated_at: "" };
}

const boardArb = fc
  .array(fc.array(order, { maxLength: 5 }), { minLength: 1, maxLength: 4 })
  .chain((cols) => fc.tuple(fc.constant(cols), fc.shuffledSubarray(cols.map((_, i) => i * 1000 + 1), { minLength: cols.length, maxLength: cols.length })))
  .map(([cols, colOrders]): BoardColumn[] =>
    cols.map((orders, c) => ({
      id: `col${c}`, board_id: "b", name: `Col ${c}`, order: colOrders[c],
      cards: orders.map((o, k) => card(`c${c}-${k}`, `col${c}`, o)),
    })));

function jsonResponse(status: number, payload: unknown) {
  return { ok: status >= 200 && status < 300, status, statusText: String(status), json: async () => payload } as Response;
}

describe("Property 27: board display order (R14.1)", () => {
  it("returns columns and cards in ascending order", () => {
    fc.assert(fc.property(boardArb, (board) => {
      const sorted = sortBoard(board);
      const isAscending = (xs: number[]) => xs.every((x, i) => i === 0 || xs[i - 1] <= x);
      expect(isAscending(sorted.map((c) => c.order))).toBe(true);
      for (const col of sorted) expect(isAscending(col.cards.map((c) => c.order))).toBe(true);
      expect(sorted.flatMap((c) => c.cards).length).toBe(board.flatMap((c) => c.cards).length);
    }), RUNS);
  });
});

describe("Property 29: computed order lies between neighbours (R15.3, R4.6)", () => {
  it("is strictly between prev and next, and positive", () => {
    fc.assert(fc.property(fc.option(order, { nil: null }), fc.option(order, { nil: null }), (a, b) => {
      const [prev, next] = a !== null && b !== null ? [Math.min(a, b), Math.max(a, b)] : [a, b];
      fc.pre(prev === null || next === null || prev < next);
      // Only when a double exists strictly between them: FLOAT order runs out of precision after
      // repeated midpoints (accepted limitation, design "Data Models"; CHANGELOG entry 19).
      if (prev !== null && next !== null) fc.pre((prev + next) / 2 > prev && (prev + next) / 2 < next);
      const result = computeOrder(prev, next);
      if (prev !== null) expect(result).toBeGreaterThan(prev);
      if (next !== null) expect(result).toBeLessThan(next);
      expect(result).toBeGreaterThan(0);
    }), RUNS);
  });
});

describe("Property 32: Bearer header is sent when a JWT exists (R21.4)", () => {
  it("adds Authorization only when a token is given", async () => {
    await fc.assert(fc.asyncProperty(fc.option(fc.stringMatching(/^[A-Za-z0-9._-]{1,60}$/), { nil: null }), fc.webPath(), async (token, path) => {
      const fetchMock = jest.fn(async () => jsonResponse(200, { data: {} }));
      global.fetch = fetchMock as unknown as typeof fetch;
      await apiClient(`/${path}`, { token });
      const headers = (fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].headers as Headers;
      expect(headers.get("Authorization")).toBe(token ? `Bearer ${token}` : null);
    }), RUNS);
  });
});

describe("Property 33: non-2xx responses throw ApiError (R21.5)", () => {
  it("throws ApiError with the status and message, or returns data on 2xx", async () => {
    await fc.assert(fc.asyncProperty(fc.integer({ min: 200, max: 599 }), fc.string(), fc.anything(), async (status, message, data) => {
      global.fetch = jest.fn(async () => jsonResponse(status, status < 300 ? { data } : { error: message })) as unknown as typeof fetch;
      if (status < 300) {
        await expect(apiClient("/x")).resolves.toEqual(data);
      } else {
        const error = await apiClient("/x").catch((e: unknown) => e);
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).statusCode).toBe(status);
        expect((error as ApiError).message).toBe(message || String(status));
      }
    }), RUNS);
  });
});

describe("Property 36: drag and Move_Control produce the same move (R15, R33)", () => {
  it("dropping at the end equals choosing the column in Move to", () => {
    fc.assert(fc.property(boardArb, fc.nat(), fc.nat(), (board, pickCard, pickCol) => {
      const cards = board.flatMap((c) => c.cards);
      fc.pre(cards.length > 0);
      const moving = cards[pickCard % cards.length];
      const target = board[pickCol % board.length];
      const endIndex = target.cards.filter((c) => c.id !== moving.id).length;
      const byDrop = planMove(board, moving.id, target.id, endIndex);
      const byControl = planMove(board, moving.id, target.id, Infinity);
      expect(byControl).toEqual(byDrop);
      if (byControl) {
        expect(byControl.payload.order).toBeGreaterThan(0);
        expect(byControl.next.find((c) => c.id === target.id)!.cards.at(-1)!.id).toBe(moving.id);
      }
    }), RUNS);
  });
});

describe("Property 38: avatars are deterministic (R36.7)", () => {
  it("gives the same hue for the same id and 1-2 uppercase initials", () => {
    fc.assert(fc.property(fc.uuid(), fc.string({ minLength: 1, maxLength: 40 }), (id, name) => {
      const hue = avatarHue(id);
      expect(avatarHue(id)).toBe(hue);
      expect(hue).toBeGreaterThanOrEqual(0);
      expect(hue).toBeLessThan(360);
      const value = initials(name);
      expect(Array.from(value).length).toBeGreaterThanOrEqual(1);
      expect(Array.from(value).length).toBeLessThanOrEqual(2);
      expect(value).toBe(value.toLocaleUpperCase());
    }), RUNS);
  });
});

describe("Property 39: preference cookie round trip (R36.5, R36.6)", () => {
  const prefsArb: fc.Arbitrary<Prefs> = fc.record({
    theme: fc.constantFrom("system", "light", "dark"),
    animateBg: fc.boolean(),
    reduceTransparency: fc.boolean(),
    sidebarCollapsed: fc.boolean(),
  });

  it("parse(serialize(p)) === p", () => {
    fc.assert(fc.property(prefsArb, (prefs) => expect(parsePrefs(serializePrefs(prefs))).toEqual(prefs)), RUNS);
  });

  it("never throws and always returns valid prefs for any string", () => {
    fc.assert(fc.property(fc.option(fc.string(), { nil: undefined }), (raw) => {
      const prefs = parsePrefs(raw);
      expect(["system", "light", "dark"]).toContain(prefs.theme);
      expect(typeof prefs.animateBg).toBe("boolean");
      expect(typeof prefs.reduceTransparency).toBe("boolean");
      expect(typeof prefs.sidebarCollapsed).toBe("boolean");
    }), RUNS);
  });
});

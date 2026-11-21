import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { AddColumnDialog } from "@/components/board/AddColumnDialog";
import { ColumnManager, insertIndex, moveItem } from "@/components/board/BoardSettings";
import { Sidebar } from "@/components/layout/Sidebar";
import { BoardColorPicker } from "@/components/shared/BoardColorPicker";
import { DueChip } from "@/components/shared/DueChip";
import type { BoardColumn } from "@/hooks/useDragAndDrop";
import { daysBetween, deadlineText, dueStatus, parseDate, toDateValue } from "@/lib/due";
import { hexFromHue, hueFromHex } from "@/lib/oklch";

import { mockApi, renderWithProviders } from "./test-utils";

const BOARD = "22222222-2222-4222-8222-222222222222";
const col = (id: string, name: string, order: number): BoardColumn => ({ id, board_id: BOARD, name, order, cards: [] });
const dates = fc.date({ min: new Date(2000, 0, 1), max: new Date(2100, 11, 31), noInvalidDate: true });

describe("due dates (R51)", () => {
  // Feature: revotask, Property 54: Due status follows the calendar
  it("Property 54: the tone and day count follow the calendar, and done always wins", () => {
    fc.assert(
      fc.property(dates, fc.integer({ min: -400, max: 400 }), fc.boolean(), (today, offset, done) => {
        const due = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
        const status = dueStatus(toDateValue(due), today, done)!;
        if (status.days !== offset) return false;
        if (done) return status.tone === "done";
        const expected = offset < 0 ? "overdue" : offset === 0 ? "today" : offset <= 2 ? "soon" : "later";
        return status.tone === expected && (offset >= 0 || status.label.includes(`${-offset} day`));
      }),
      { numRuns: 300 },
    );
  });

  it("parses only real calendar dates and survives daylight-saving changes", () => {
    expect(parseDate("2026-02-30")).toBeNull();
    expect(parseDate("12/12/2026")).toBeNull();
    expect(parseDate("2028-02-29")?.getDate()).toBe(29);
    expect(daysBetween(new Date(2026, 2, 28), new Date(2026, 2, 30))).toBe(2);
    expect(daysBetween(new Date(2026, 9, 24), new Date(2026, 9, 26))).toBe(2);
    expect(deadlineText("2026-12-12", new Date(2026, 10, 21))).toBe("12 Dec · 21 days left");
    expect(deadlineText("2026-11-20", new Date(2026, 10, 21))).toBe("20 Nov · 1 day overdue");
  });

  it("DueChip says the tone in words, not only colour", () => {
    jest.useFakeTimers({ advanceTimers: true });
    jest.setSystemTime(new Date(2026, 10, 21, 10, 0));
    const { rerender } = renderWithProviders(<DueChip value="2026-11-19" />);
    expect(screen.getByText("2 days overdue")).toBeInTheDocument();
    expect(screen.getByText("Overdue: was due 19 Nov")).toHaveClass("visually-hidden");
    rerender(<DueChip value="2026-11-19" done />);
    expect(screen.getByText(/Done/)).toBeInTheDocument();
    jest.useRealTimers();
  });
});

describe("board colour picker (R48.4)", () => {
  // Feature: revotask, Property 55: Picking a colour keeps its hue
  it("Property 55: the colour shown for a hue reads back as that hue", () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 359 }), (hue) => {
        const back = hueFromHex(hexFromHue(hue));
        if (back === null) return false;
        const diff = Math.abs(back - hue);
        return Math.min(diff, 360 - diff) <= 3;
      }),
      { numRuns: 360 },
    );
    expect(hueFromHex("#808080")).toBeNull();   // greys have no hue
    expect(hueFromHex("nope")).toBeNull();
  });

  it("offers a custom hue slider next to the presets", async () => {
    const onChange = jest.fn();
    renderWithProviders(<BoardColorPicker value={null} onChange={onChange} autoHue={100} />);
    await userEvent.click(screen.getByRole("radio", { name: "Custom" }));
    expect(onChange).toHaveBeenLastCalledWith(190);
    const slider = screen.getByRole("slider", { name: /Hue/ });
    fireEvent.change(slider, { target: { value: "42" } });
    expect(onChange).toHaveBeenLastCalledWith(42);
    expect(screen.getByLabelText("Pick any colour")).toHaveAttribute("type", "color");
  });
});

describe("columns: drag, insert and the + dialog (R49)", () => {
  // Feature: revotask, Property 56: Moving an item keeps every item once
  it("Property 56: moveItem keeps all items, puts the moved one at its target", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.integer(), { minLength: 1, maxLength: 20 }), fc.nat(), fc.nat(), (list, a, b) => {
        const from = a % list.length;
        const to = b % list.length;
        const next = moveItem(list, from, to);
        return next.length === list.length && next[to] === list[from] && [...next].sort().join() === [...list].sort().join();
      }),
    );
    expect(insertIndex([{ id: "a" }, { id: "b" }], "start")).toBe(0);
    expect(insertIndex([{ id: "a" }, { id: "b" }], "a")).toBe(1);
    expect(insertIndex([{ id: "a" }, { id: "b" }], "end")).toBe(2);
  });

  it("drops a dragged column after another and saves one reorder", async () => {
    const calls = mockApi({ [`PATCH /api/boards/${BOARD}/columns/reorder`]: [] });
    const onChange = jest.fn();
    renderWithProviders(<ColumnManager boardId={BOARD} columns={[col("a", "To do", 1), col("b", "Doing", 2), col("c", "Done", 3)]} onChange={onChange} />);
    const rows = within(screen.getByTestId("column-manager")).getAllByRole("listitem");
    const grip = rows[0].querySelector(".column-row-grip")!;
    fireEvent.pointerDown(grip);
    const dataTransfer = { setData: jest.fn(), effectAllowed: "" };
    fireEvent.dragStart(rows[0], { dataTransfer });
    rows[2].getBoundingClientRect = () => ({ top: 0, bottom: 40, height: 40, left: 0, right: 100, width: 100, x: 0, y: 0, toJSON() {} }) as DOMRect;
    fireEvent.dragOver(rows[2], { clientY: 35, dataTransfer });
    await act(async () => {
      fireEvent.drop(rows[2], { dataTransfer });
    });
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ columns: [{ id: "b", order: 1024 }, { id: "c", order: 2048 }, { id: "a", order: 3072 }] });
  });

  it("the + dialog adds a column at the chosen position", async () => {
    mockApi({
      [`POST /api/boards/${BOARD}/columns`]: { id: "n", board_id: BOARD, name: "Ideas", order: 9000 },
      [`PATCH /api/boards/${BOARD}/columns/reorder`]: [],
    });
    const onAdded = jest.fn();
    const onClose = jest.fn();
    renderWithProviders(<AddColumnDialog open boardId={BOARD} columns={[col("a", "To do", 1), col("b", "Done", 2)]} onClose={onClose} onAdded={onAdded} />);
    const dialog = screen.getByRole("dialog", { name: "Add a column" });
    await userEvent.type(within(dialog).getByLabelText("Column name"), "Ideas");
    await userEvent.selectOptions(within(dialog).getByLabelText("Position"), "At the start");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add column" }));
    await waitFor(() => expect(onAdded).toHaveBeenCalled());
    expect(onAdded.mock.calls[0][0].map((c: BoardColumn) => c.name)).toEqual(["Ideas", "To do", "Done"]);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("collapsible sidebar (R53)", () => {
  it("toggles the collapsed preference and labels the button by what it will do", async () => {
    const setPrefs = jest.requireMock("@/app/actions/prefs").setPrefs as jest.Mock;
    mockApi({ "GET /api/cards": [] });
    renderWithProviders(<Sidebar boards={[]} />);
    const toggle = screen.getByRole("button", { name: "Collapse sidebar" });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    expect(document.documentElement).toHaveAttribute("data-sidebar", "collapsed");
    expect(setPrefs).toHaveBeenLastCalledWith(expect.objectContaining({ sidebarCollapsed: true }));
    expect(screen.getByRole("button", { name: "Expand sidebar" })).toHaveAttribute("aria-expanded", "false");
  });
});

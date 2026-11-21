import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import fc from "fast-check";

import { BoardBrief, hostOf } from "@/components/board/BoardBrief";
import { ColumnManager, renumber } from "@/components/board/BoardSettings";
import type { BoardColumn } from "@/hooks/useDragAndDrop";
import { boardHue, colorName } from "@/lib/boardColor";
import type { BoardDetail, BoardLink } from "@/lib/types";

import { ANA, mockApi, renderWithProviders } from "./test-utils";

const BOARD = "22222222-2222-4222-8222-222222222222";

function col(id: string, name: string, order: number, cards = 0): BoardColumn {
  return {
    id, board_id: BOARD, name, order,
    cards: Array.from({ length: cards }, (_, i) => ({
      id: `${id}-c${i}`, column_id: id, title: `t${i}`, description: null, assignee_id: null, assignee: null, order: i + 1, created_at: "", updated_at: "",
    })),
  };
}

describe("column manager (R49)", () => {
  // Feature: revotask, Property 52: Renumbering keeps the order and makes orders distinct
  it("Property 52: renumber keeps the sequence with distinct, increasing, positive orders", () => {
    fc.assert(
      fc.property(fc.uniqueArray(fc.string({ minLength: 1, maxLength: 6 }), { maxLength: 30 }), (ids) => {
        const plan = renumber(ids.map((id) => ({ id })));
        return (
          plan.map((p) => p.id).join("|") === ids.join("|") &&
          plan.every((p, i) => p.order > 0 && (i === 0 || p.order > plan[i - 1].order))
        );
      }),
    );
  });

  it("moves a column and sends one reorder request for the whole sequence", async () => {
    const calls = mockApi({ [`PATCH /api/boards/${BOARD}/columns/reorder`]: [] });
    const onChange = jest.fn();
    const columns = [col("a", "To do", 1), col("b", "Doing", 2), col("c", "Done", 3)];
    renderWithProviders(<ColumnManager boardId={BOARD} columns={columns} onChange={onChange} />);
    expect(screen.getByRole("button", { name: "Move To do left" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Move To do right" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ columns: [{ id: "b", order: 1024 }, { id: "a", order: 2048 }, { id: "c", order: 3072 }] });
    expect(onChange.mock.calls[0][0].map((c: BoardColumn) => c.name)).toEqual(["Doing", "To do", "Done"]);
  });

  it("adds a column at the start (for example Ideas before To do)", async () => {
    const calls = mockApi({
      [`POST /api/boards/${BOARD}/columns`]: { id: "n", board_id: BOARD, name: "Ideas", order: 4096 },
      [`PATCH /api/boards/${BOARD}/columns/reorder`]: [],
    });
    const onChange = jest.fn();
    renderWithProviders(<ColumnManager boardId={BOARD} columns={[col("a", "To do", 1), col("b", "Done", 2)]} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText("New column name"), "Ideas");
    await userEvent.selectOptions(screen.getByLabelText("Position"), "At the start");
    await userEvent.click(screen.getByRole("button", { name: "Add column" }));
    await waitFor(() => expect(onChange).toHaveBeenCalled());
    expect(calls.find((c) => c.method === "PATCH")?.body).toEqual({ columns: [{ id: "n", order: 1024 }, { id: "a", order: 2048 }, { id: "b", order: 3072 }] });
    expect(onChange.mock.calls[0][0].map((c: BoardColumn) => c.name)).toEqual(["Ideas", "To do", "Done"]);
  });

  it("renames on Enter and deletes only after a confirmation that names the cards", async () => {
    const calls = mockApi({ "PATCH /api/columns/a": { id: "a", name: "Backlog" }, "DELETE /api/columns/a": { id: "a" } });
    const onChange = jest.fn();
    renderWithProviders(<ColumnManager boardId={BOARD} columns={[col("a", "To do", 1, 3), col("b", "Done", 2)]} onChange={onChange} />);
    const input = screen.getByLabelText("Name of column 1");
    await userEvent.clear(input);
    await userEvent.type(input, "Backlog{Enter}");
    await waitFor(() => expect(calls.some((c) => c.method === "PATCH")).toBe(true));
    await userEvent.click(screen.getByRole("button", { name: "Delete To do" }));
    expect(calls.some((c) => c.method === "DELETE")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Delete with 3 cards" }));
    await waitFor(() => expect(calls.some((c) => c.method === "DELETE")).toBe(true));
  });
});

describe("board brief (R47)", () => {
  const board: BoardDetail = {
    id: BOARD, name: "Launch plan", purpose: "Ship the new site by 12 December", color_hue: 215, created_by: null, role: "member",
    created_at: "", updated_at: "", columns: [], notes: "<p>Kick-off on <strong>Monday</strong></p>",
  };
  const link: BoardLink = { id: "l1", board_id: BOARD, title: "Kick-off recording", url: "https://meet.example.com/rec/1", created_by: { id: "someone", name: "Omar" }, created_at: "" };

  it("shows the purpose, notes, links and photos; members add links but remove only their own", async () => {
    const calls = mockApi({
      [`GET /api/boards/${BOARD}/links`]: [link],
      [`GET /api/boards/${BOARD}/photos`]: [],
      [`POST /api/boards/${BOARD}/links`]: { ...link, id: "l2", title: "Design file", url: "https://figma.example.com/f", created_by: { id: ANA.id, name: ANA.name } },
    });
    renderWithProviders(<BoardBrief open board={board} onClose={jest.fn()} onNotesSaved={jest.fn()} />);
    const dialog = screen.getByRole("dialog", { name: "About Launch plan" });
    expect(within(dialog).getByText("Ship the new site by 12 December")).toBeInTheDocument();
    const recording = await within(dialog).findByRole("link", { name: /Kick-off recording/ });
    expect(recording).toHaveAttribute("target", "_blank");
    expect(recording).toHaveAttribute("rel", expect.stringContaining("noopener"));
    expect(within(dialog).queryByRole("button", { name: "Remove link Kick-off recording" })).not.toBeInTheDocument();
    await userEvent.type(within(dialog).getByLabelText("Web address"), "figma.example.com/f");
    await userEvent.type(within(dialog).getByLabelText("Title (optional)"), "Design file");
    await userEvent.click(within(dialog).getByRole("button", { name: "Add link" }));
    expect(await within(dialog).findByRole("link", { name: /Design file/ })).toBeInTheDocument();
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ url: "https://figma.example.com/f", title: "Design file" });
    expect(within(dialog).getByRole("button", { name: "Remove link Design file" })).toBeInTheDocument();
    expect(within(dialog).getByRole("heading", { name: /Photos/ })).toBeInTheDocument();
    await waitFor(() => expect(within(dialog).getByRole("textbox", { name: "Board notes" }).querySelector("strong")).toHaveTextContent("Monday"));
  });

  it("helpers: host names and colours", () => {
    expect(hostOf("https://www.example.com/x")).toBe("example.com");
    expect(hostOf("not a url")).toBe("not a url");
    expect(boardHue({ id: "x", color_hue: 215 })).toBe(215);
    expect(colorName(215)).toBe("Lagoon");
    expect(colorName(null)).toBe("Automatic");
  });
});

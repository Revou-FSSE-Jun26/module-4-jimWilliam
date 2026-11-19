import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { CardDetailModal } from "@/components/CardDetailModal";
import { NotificationBell } from "@/components/NotificationBell";
import type { Card, Comment, NotificationPage } from "@/lib/types";

import { ANA, mockApi, renderWithProviders } from "./test-utils";

const BOARD = "22222222-2222-4222-8222-222222222222";
const CARD: Card = {
  id: "33333333-3333-4333-8333-333333333333",
  column_id: "44444444-4444-4444-8444-444444444444",
  title: "Write the brief",
  description: null,
  assignee_id: null,
  assignee: null,
  order: 1024,
  comment_count: 2,
  created_at: "2026-11-19T10:00:00Z",
  updated_at: "2026-11-19T10:00:00Z",
};

function comment(id: string, userId: string, name: string, text: string): Comment {
  return { id, card_id: CARD.id, user_id: userId, author: { id: userId, name }, text, created_at: "2026-11-19T10:00:00Z", updated_at: "2026-11-19T10:00:00Z" };
}

describe("CardDetailModal (R16.1–R16.5)", () => {
  beforeEach(() => {
    mockApi({
      [`GET /api/boards/${BOARD}/members`]: [{ user_id: ANA.id, name: ANA.name, email: ANA.email, role: "admin" }],
      [`GET /api/cards/${CARD.id}/comments`]: [
        comment("c1", ANA.id, "Ana Novak", "Mine"),
        comment("c2", "55555555-5555-4555-8555-555555555555", "Omar", "Someone else's"),
      ],
      [`POST /api/cards/${CARD.id}/comments`]: (body: unknown) => comment("c3", ANA.id, "Ana Novak", (body as { text: string }).text),
    });
  });

  it("composes CommentList inside the modal and loads the comments", async () => {
    renderWithProviders(<CardDetailModal card={CARD} boardId={BOARD} onClose={jest.fn()} onUpdated={jest.fn()} onDeleted={jest.fn()} />);
    const dialog = document.querySelector("dialog")!;
    expect(dialog).toHaveAttribute("open");
    expect(await within(dialog).findByText("Mine")).toBeInTheDocument();
    expect(within(dialog).getByText("Someone else's")).toBeInTheDocument();
  });

  it("shows edit and delete only on the signed-in user's comments", async () => {
    renderWithProviders(<CardDetailModal card={CARD} boardId={BOARD} onClose={jest.fn()} onUpdated={jest.fn()} onDeleted={jest.fn()} />);
    await screen.findByText("Mine");
    const items = screen.getAllByTestId("comment");
    expect(within(items[0]).getByRole("button", { name: "Edit comment" })).toBeInTheDocument();
    expect(within(items[1]).queryByRole("button", { name: "Edit comment" })).not.toBeInTheDocument();
    expect(within(items[1]).queryByRole("button", { name: "Delete comment" })).not.toBeInTheDocument();
  });

  it("posts a new comment and appends it", async () => {
    renderWithProviders(<CardDetailModal card={CARD} boardId={BOARD} onClose={jest.fn()} onUpdated={jest.fn()} onDeleted={jest.fn()} />);
    await screen.findByText("Mine");
    await userEvent.type(screen.getByLabelText("Add a comment"), "Looks good");
    await userEvent.click(screen.getByRole("button", { name: "Post comment" }));
    expect(await screen.findByText("Looks good")).toBeInTheDocument();
  });
});

describe("NotificationBell (R19.1, R19.3, R19.4)", () => {
  function page(unread: number): NotificationPage {
    return {
      items: [{ id: "n1", message: "You were assigned Write the brief", card_id: null, board_id: null, read: unread === 0, created_at: "2026-11-19T10:00:00Z" }],
      page: 1, per_page: 10, total: 1, unread_count: unread,
    };
  }

  it("shows the unread count", async () => {
    mockApi({ "GET /api/notifications": page(3) });
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByTestId("unread-count")).toHaveTextContent("3");
    expect(screen.getByRole("button", { name: "Notifications, 3 unread" })).toBeInTheDocument();
  });

  it("hides the badge when nothing is unread", async () => {
    mockApi({ "GET /api/notifications": page(0) });
    renderWithProviders(<NotificationBell />);
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(screen.queryByTestId("unread-count")).not.toBeInTheDocument();
  });

  it("decreases the count by one when a notification is marked read", async () => {
    const calls = mockApi({ "GET /api/notifications": page(1), "PATCH /api/notifications/n1/read": {} });
    renderWithProviders(<NotificationBell />);
    expect(await screen.findByTestId("unread-count")).toHaveTextContent("1");
    await userEvent.click(screen.getByRole("button", { name: /Mark as read/ }));
    await waitFor(() => expect(screen.queryByTestId("unread-count")).not.toBeInTheDocument());
    expect(calls.some((c) => c.method === "PATCH" && c.url === "/api/notifications/n1/read")).toBe(true);
  });

  it("polls every 30 seconds and stops when unmounted", async () => {
    jest.useFakeTimers();
    mockApi({ "GET /api/notifications": page(0) });
    const { unmount } = renderWithProviders(<NotificationBell />);
    await act(async () => {});
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await act(async () => { jest.advanceTimersByTime(30_000); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    unmount();
    await act(async () => { jest.advanceTimersByTime(60_000); });
    expect(global.fetch).toHaveBeenCalledTimes(2);
    jest.useRealTimers();
  });
});

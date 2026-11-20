/**
 * Example tests for the pages (task 18.3): forms, redirects and toasts for /register, /login,
 * the dashboard, /my-tasks and /profile.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { LoginForm, RegisterForm } from "@/components/auth/AuthForms";
import { BoardGrid } from "@/components/dashboard/BoardGrid";
import { notify } from "@/lib/toast";
import type { Board, Card } from "@/lib/types";
import MyTasksPage from "@/app/(app)/my-tasks/page";
import ProfilePage from "@/app/(app)/profile/page";

import { ANA, mockApi, renderWithProviders } from "./test-utils";

// Pages that use PageHeader need the shell context.
jest.mock("@/components/layout/AppShell", () => ({
  PageHeader: ({ title, subtitle }: { title: string; subtitle?: string }) => (
    <header><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</header>
  ),
}));

const router = jest.requireMock("next/navigation").__router as Record<string, jest.Mock>;
const createSession = jest.requireMock("@/app/actions/session").createSession as jest.Mock;

let toastError: jest.SpyInstance;
let toastSuccess: jest.SpyInstance;
beforeEach(() => {
  Object.values(router).forEach((fn) => fn.mockClear());
  toastError = jest.spyOn(notify, "error").mockImplementation(() => "");
  toastSuccess = jest.spyOn(notify, "success").mockImplementation(() => "");
});
afterEach(() => jest.restoreAllMocks());

describe("/register (R12.1, R12.3, R12.5, R12.7)", () => {
  it("validates on the client before sending anything", async () => {
    const calls = mockApi({});
    renderWithProviders(<RegisterForm />, { user: null, token: null });
    await userEvent.type(screen.getByLabelText("Email"), "not-an-email");
    await userEvent.type(screen.getByLabelText("Password"), "short");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(screen.getByText("Enter your name.")).toBeInTheDocument();
    expect(screen.getByText(/Enter an email address/)).toBeInTheDocument();
    expect(screen.getByText("Use at least 8 characters.")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toHaveAttribute("aria-invalid", "true");
    expect(calls).toHaveLength(0);
  });

  it("registers and redirects to /login", async () => {
    const calls = mockApi({ "POST /api/auth/register": ANA });
    renderWithProviders(<RegisterForm />, { user: null, token: null });
    await userEvent.type(screen.getByLabelText("Name"), "Ana Novak");
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith("/login"));
    expect(calls[0].body).toEqual({ name: "Ana Novak", email: "ana@example.com", password: "password123" });
    expect(toastSuccess).toHaveBeenCalled();
  });

  it("shows a duplicate-email error from the API on the email field and as a toast", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 409, statusText: "409", json: async () => ({ error: "An account with this email already exists" }) })) as unknown as typeof fetch;
    renderWithProviders(<RegisterForm />, { user: null, token: null });
    await userEvent.type(screen.getByLabelText("Name"), "Ana");
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Create account" }));
    expect(await screen.findByText("An account with this email already exists")).toBeInTheDocument();
    expect(toastError).toHaveBeenCalledWith("An account with this email already exists");
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe("/login (R12.2, R12.4, R12.5)", () => {
  it("logs in, creates the session cookie and redirects to /", async () => {
    mockApi({ "POST /api/auth/login": { token: "jwt", expires_at: "2099-01-01T00:00:00Z", user: ANA } });
    createSession.mockResolvedValueOnce(ANA);
    renderWithProviders(<LoginForm />, { user: null, token: null });
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "password123");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith("/"));
    expect(createSession).toHaveBeenCalledWith("jwt", "2099-01-01T00:00:00Z");
  });

  it("shows the error for wrong credentials and stays on the page", async () => {
    global.fetch = jest.fn(async () => ({ ok: false, status: 401, statusText: "401", json: async () => ({ error: "Invalid email or password" }) })) as unknown as typeof fetch;
    renderWithProviders(<LoginForm />, { user: null, token: null });
    await userEvent.type(screen.getByLabelText("Email"), "ana@example.com");
    await userEvent.type(screen.getByLabelText("Password"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "Log in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password");
    expect(toastError).toHaveBeenCalledWith("Invalid email or password");
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe("dashboard (R13.2, R13.4)", () => {
  const board: Board = { id: "b1", name: "Launch", created_by: ANA.id, role: "admin", member_count: 1, card_count: 0, created_at: "", updated_at: "" };

  it("shows an empty state that creates a first board", async () => {
    const calls = mockApi({ "POST /api/boards": board });
    renderWithProviders(<BoardGrid initialBoards={[]} />);
    expect(screen.getByRole("heading", { name: "No boards yet" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Create your first board" }));
    await userEvent.type(screen.getByLabelText("Board name"), "Launch");
    await userEvent.click(screen.getByRole("button", { name: "Create board" }));
    expect(await screen.findByRole("link", { name: /Launch/ })).toHaveAttribute("href", "/boards/b1");
    expect(calls.find((c) => c.method === "POST")?.body).toEqual({ name: "Launch" });
    expect(router.refresh).toHaveBeenCalled();
  });

  it("lists boards with their role", () => {
    mockApi({});
    renderWithProviders(<BoardGrid initialBoards={[board, { ...board, id: "b2", name: "Ops", role: "member" }]} />);
    const list = screen.getByRole("list", { name: "Your boards" });
    expect(within(list).getByRole("link", { name: /Launch.*Admin/ })).toBeInTheDocument();
    expect(within(list).getByRole("link", { name: /Ops.*Member/ })).toBeInTheDocument();
  });
});

describe("/my-tasks (R17.1, R17.3, R17.4, R17.5)", () => {
  const card = (id: string, board: string): Card => ({
    id, column_id: "c", title: `Task ${id}`, description: null, assignee_id: ANA.id, assignee: { id: ANA.id, name: ANA.name },
    order: 1, board_id: board, board_name: board === "b1" ? "Launch" : "Ops", created_at: "", updated_at: "",
  });

  it("shows a loading state, then cards grouped by board", async () => {
    mockApi({ "GET /api/cards": [card("1", "b1"), card("2", "b2"), card("3", "b1")] });
    renderWithProviders(<MyTasksPage />);
    expect(screen.getByTestId("tasks-loading")).toBeInTheDocument();
    const launch = await screen.findByRole("region", { name: /Launch/ });
    expect(within(launch).getAllByRole("link")).toHaveLength(2);
    expect(within(screen.getByRole("region", { name: /Ops/ })).getAllByRole("link")).toHaveLength(1);
  });

  it("shows an empty state when nothing is assigned", async () => {
    mockApi({ "GET /api/cards": [] });
    renderWithProviders(<MyTasksPage />);
    expect(await screen.findByRole("heading", { name: "Nothing assigned to you" })).toBeInTheDocument();
  });
});

describe("/profile (R18.2, R18.3, R36.9, R36.10)", () => {
  beforeEach(() => {
    mockApi({
      "GET /api/users/me": ANA,
      "GET /api/boards": [],
      "GET /api/cards": [],
      "PATCH /api/users/me": (body: unknown) => ({ ...ANA, ...(body as object) }),
    });
  });

  it("previews the name live and saves with a success toast", async () => {
    renderWithProviders(<ProfilePage />);
    const save = await screen.findByRole("button", { name: "Save changes" });
    expect(save).toBeDisabled();
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Ana Lee");
    expect(screen.getByTestId("hero-name")).toHaveTextContent("Ana Lee");
    expect(screen.getByRole("status")).toHaveTextContent("Unsaved changes");
    await userEvent.click(save);
    await waitFor(() => expect(toastSuccess).toHaveBeenCalledWith("Profile saved"));
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("shows an error toast when saving fails", async () => {
    renderWithProviders(<ProfilePage />);
    const email = await screen.findByLabelText("Email");
    await waitFor(() => expect(email).toHaveValue(ANA.email));
    global.fetch = jest.fn(async () => ({ ok: false, status: 409, statusText: "409", json: async () => ({ error: "An account with this email already exists" }) })) as unknown as typeof fetch;
    await userEvent.clear(email);
    await userEvent.type(email, "taken@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("An account with this email already exists"));
  });
});

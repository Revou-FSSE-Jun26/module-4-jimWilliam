import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { NavTree } from "@/components/layout/NavTree";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import type { Board } from "@/lib/types";

import { renderWithProviders } from "./test-utils";

const deleteSession = jest.requireMock("@/app/actions/session").deleteSession as jest.Mock;
const setPrefs = jest.requireMock("@/app/actions/prefs").setPrefs as jest.Mock;

const BOARDS: Board[] = [
  { id: "b-admin", name: "Sprint 14", created_by: null, role: "admin", created_at: "", updated_at: "" },
  { id: "b-member", name: "Launch", created_by: null, role: "member", created_at: "", updated_at: "" },
];

describe("NavTree (R35.5, R35.6, R35.8, R35.9)", () => {
  beforeEach(() => sessionStorage.clear());

  it("uses links and disclosure buttons, never role=menu", () => {
    renderWithProviders(<NavTree boards={BOARDS} shell="sb" />);
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).queryByRole("menu")).not.toBeInTheDocument();
    expect(within(nav).getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("button", { name: "Boards" })).toHaveAttribute("aria-controls", "sb-boards");
  });

  it("marks the current page with aria-current", () => {
    renderWithProviders(<NavTree boards={BOARDS} shell="sb" />);
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "My tasks" })).not.toHaveAttribute("aria-current");
  });

  it("expands and collapses a board group in place and remembers it", async () => {
    renderWithProviders(<NavTree boards={BOARDS} shell="sb" />);
    const trigger = screen.getByRole("button", { name: "Sprint 14" });
    const list = document.getElementById(trigger.getAttribute("aria-controls")!)!;
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(list).not.toBeVisible();
    await userEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(list).toBeVisible();
    expect(JSON.parse(sessionStorage.getItem("revotask_nav")!)).toMatchObject({ "board-b-admin": true });
  });

  it("shows Members and Analytics only for boards you administer", async () => {
    renderWithProviders(<NavTree boards={BOARDS} shell="sb" />);
    await userEvent.click(screen.getByRole("button", { name: "Sprint 14" }));
    await userEvent.click(screen.getByRole("button", { name: "Launch" }));
    expect(screen.getByRole("link", { name: "Members" })).toHaveAttribute("href", "/boards/b-admin#members");
    expect(screen.getAllByRole("link", { name: "Members" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Analytics" })).toHaveLength(1);
    expect(screen.getAllByRole("link", { name: "Board" })).toHaveLength(2);
  });
});

describe("ProfileMenu (R36.1–R36.4, R32.7)", () => {
  it("shows the capsule with name and email", () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    const capsule = screen.getByRole("button", { name: /^Account menu: Ana Novak/ });
    expect(capsule).toHaveAttribute("aria-haspopup", "menu");
    expect(capsule).toHaveTextContent("ana@example.com");
  });

  it("offers Profile, an Appearance submenu and Log out as menu items", () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    // jsdom has no native focusgroup, so the fallback adds role="menu" / role="menuitem" (menu guide).
    const menu = screen.getAllByRole("menu", { hidden: true })[0];
    expect(within(menu).getByRole("menuitem", { name: "Profile", hidden: true })).toHaveAttribute("href", "/profile");
    expect(within(menu).getByRole("menuitem", { name: /Appearance/, hidden: true })).toHaveAttribute("aria-haspopup", "menu");
    expect(within(menu).getByRole("menuitem", { name: "Log out", hidden: true })).toBeInTheDocument();
  });

  it("switches theme as a radio group and saves the preference", async () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    const light = screen.getByRole("menuitemradio", { name: "Light", hidden: true });
    expect(screen.getByRole("menuitemradio", { name: "System", hidden: true })).toHaveAttribute("aria-checked", "true");
    await userEvent.click(light);
    expect(light).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(setPrefs).toHaveBeenCalledWith(expect.objectContaining({ theme: "light" }));
  });

  it("toggles a checkable item with Space without closing", async () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    const item = screen.getByRole("menuitemcheckbox", { name: "Reduce transparency", hidden: true });
    item.focus();
    await userEvent.keyboard(" ");
    expect(item).toHaveAttribute("aria-checked", "true");
    expect(document.documentElement).toHaveAttribute("data-glass", "reduced");
  });

  it("moves with Home and End inside the menu", async () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    const group = document.querySelector<HTMLElement>("[data-menu-group]")!;
    const items = [...group.querySelectorAll<HTMLElement>("a, button")].filter((el) => el.closest("[data-menu-group]") === group);
    items[0].focus();
    await userEvent.keyboard("{End}");
    expect(items[items.length - 1]).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(items[0]).toHaveFocus();
  });

  it("logs out from the menu", async () => {
    renderWithProviders(<ProfileMenu idPrefix="t" />);
    await act(async () => {
      await userEvent.click(screen.getByRole("menuitem", { name: "Log out", hidden: true }));
    });
    expect(deleteSession).toHaveBeenCalled();
  });
});

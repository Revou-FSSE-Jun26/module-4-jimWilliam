import AxeBuilder from "@axe-core/playwright";
import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";

import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * Visual and accessibility suite (task 20.5): Property 40 (no nested blur, no page-level horizontal
 * overflow) at seven widths in both themes, an axe scan of every page (R39.6), reduced-motion and
 * forced-colors runs, and README screenshots.
 */
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5050";
const WIDTHS = [320, 375, 768, 1280, 1920, 2560, 3840];
const THEMES = ["dark", "light"] as const;
const SHOTS = "../docs/screenshots";

let token = "";
let boardId = "";

test.beforeAll(async ({ request }) => {
  const email = uniqueEmail("visual");
  expect((await request.post(`${API}/api/auth/register`, { data: { name: "Visual Tester", email, password: PASSWORD } })).ok()).toBe(true);
  const login = await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } })).json();
  token = login.data.token;
  const auth = { Authorization: `Bearer ${token}` };
  boardId = (await (await request.post(`${API}/api/boards`, { headers: auth, data: { name: "Launch plan" } })).json()).data.id;
  const cols: string[] = [];
  for (const name of ["To do", "Doing", "Done"]) {
    cols.push((await (await request.post(`${API}/api/boards/${boardId}/columns`, { headers: auth, data: { name } })).json()).data.id);
  }
  const me = (await (await request.get(`${API}/api/users/me`, { headers: auth })).json()).data;
  const titles = [["Draft the launch email", "Book the venue"], ["Design the landing page"], ["Pick a launch date"]];
  for (const [i, list] of titles.entries()) {
    for (const title of list) {
      const card = (await (await request.post(`${API}/api/columns/${cols[i]}/cards`, { headers: auth, data: { title, assignee_id: me.id } })).json()).data;
      if (i === 1) await request.post(`${API}/api/cards/${card.id}/comments`, { headers: auth, data: { text: "Hero copy is in review." } });
    }
  }
  // A teammate adds the visual tester to their board, which creates an unread notification.
  const mateEmail = uniqueEmail("teammate");
  await request.post(`${API}/api/auth/register`, { data: { name: "Mia Teammate", email: mateEmail, password: PASSWORD } });
  const mate = (await (await request.post(`${API}/api/auth/login`, { data: { email: mateEmail, password: PASSWORD } })).json()).data;
  const mateAuth = { Authorization: `Bearer ${mate.token}` };
  const mateBoard = (await (await request.post(`${API}/api/boards`, { headers: mateAuth, data: { name: "Marketing" } })).json()).data;
  await request.post(`${API}/api/boards/${mateBoard.id}/members`, { headers: mateAuth, data: { email: me.email } });
  mkdirSync(SHOTS, { recursive: true });
});

async function prepare(context: BrowserContext, theme: (typeof THEMES)[number]) {
  const url = new URL(test.info().project.use.baseURL!);
  await context.addCookies([
    { name: "revotask_token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" },
    { name: "revotask_prefs", value: `${theme}.0.0`, domain: url.hostname, path: "/", sameSite: "Lax" },
  ]);
}

const PAGES = () => [
  { name: "dashboard", path: "/", ready: (p: Page) => p.getByRole("heading", { level: 1, name: "Your boards" }) },
  { name: "board", path: `/boards/${boardId}`, ready: (p: Page) => p.getByRole("heading", { level: 1, name: "Launch plan" }) },
  { name: "my-tasks", path: "/my-tasks", ready: (p: Page) => p.getByRole("heading", { level: 2, name: "Launch plan" }) },
  { name: "profile", path: "/profile", ready: (p: Page) => p.getByRole("heading", { level: 1, name: "Profile" }) },
];

/** Waits until entrance animations finish (an observable condition, not a fixed sleep). */
/** Time-based animations have finished. Scroll-driven ones (the sidebar's edge fade) never "finish", so they are skipped. */
async function settled(page: Page) {
  await page.waitForFunction(() =>
    document.getAnimations().every(
      (a) => a.playState !== "running" || !(a.timeline instanceof DocumentTimeline) || (a.effect?.getTiming().iterations ?? 1) === Infinity,
    ),
  );
}

async function checkLayout(page: Page, where: string) {
  await settled(page);
  const result = await page.evaluate(() => {
    // Only rendered elements count, and top-layer elements (open popovers, modal dialogs) are
    // excluded: the top layer escapes its DOM ancestors, so their blur samples the page, not a pane.
    const inTopLayer = (el: Element) => el.matches(":popover-open, dialog:modal");
    const blurred = [...document.querySelectorAll<HTMLElement>("*")].filter((el) => {
      if (!el.checkVisibility() || inTopLayer(el)) return false;
      const s = getComputedStyle(el);
      return (s.backdropFilter && s.backdropFilter !== "none") || ((s as unknown as Record<string, string>).webkitBackdropFilter ?? "none") !== "none";
    });
    const nested = blurred.filter((el) => blurred.some((other) => other !== el && other.contains(el)));
    const root = document.scrollingElement!;
    return { nested: nested.map((el) => el.className.toString().slice(0, 60)), overflow: root.scrollWidth - root.clientWidth };
  });
  expect(result.nested, `no backdrop-filter inside another (R34.3) at ${where}`).toEqual([]);
  expect(result.overflow, `no page-level horizontal scroll (R38.1) at ${where}`).toBeLessThanOrEqual(0);
}

for (const theme of THEMES) {
  test(`signed-in pages: layout at 7 widths and axe scan (${theme})`, async ({ browser }) => {
    // 6 pages x 7 widths plus an axe scan per page: up to ~50 s alone, more beside other workers.
    test.slow();
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    await prepare(context, theme);
    const page = await context.newPage();
    for (const target of PAGES()) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: width >= 2560 ? 1440 : 900 });
        await page.goto(target.path);
        await expect(target.ready(page)).toBeVisible();
        await checkLayout(page, `${target.name} ${width}px ${theme}`);
        if (width === 375 || width === 1280) {
          await page.screenshot({ path: `${SHOTS}/${target.name}-${width}-${theme}.png`, fullPage: true });
        }
      }
      await page.setViewportSize({ width: 1280, height: 900 });
      const scan = await new AxeBuilder({ page }).analyze();
      const serious = scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`), `${target.name} (${theme})`).toEqual([]);
    }
    await context.close();
  });

  test(`auth pages: layout at 7 widths and axe scan (${theme})`, async ({ browser }) => {
    const context = await browser.newContext();
    const url = new URL(test.info().project.use.baseURL!);
    await context.addCookies([{ name: "revotask_prefs", value: `${theme}.0.0`, domain: url.hostname, path: "/" }]);
    const page = await context.newPage();
    for (const path of ["/login", "/register"]) {
      for (const width of WIDTHS) {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(path);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await checkLayout(page, `${path} ${width}px ${theme}`);
        if (width === 375 || width === 1280) {
          await page.screenshot({ path: `${SHOTS}/${path.slice(1)}-${width}-${theme}.png`, fullPage: true });
        }
      }
      const scan = await new AxeBuilder({ page }).analyze();
      const serious = scan.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(serious.map((v) => `${v.id}: ${v.nodes[0]?.target}`), `${path} (${theme})`).toEqual([]);
    }
    await context.close();
  });
}

test("card detail modal and notification bell screenshots", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await prepare(context, "dark");
  const page = await context.newPage();
  await page.goto(`/boards/${boardId}`);
  await page.getByRole("button", { name: "Design the landing page" }).click();
  const dialog = page.getByRole("dialog", { name: "Design the landing page" });
  await expect(dialog.getByTestId("comment-text")).toHaveText("Hero copy is in review.");
  await settled(page);
  await page.screenshot({ path: `${SHOTS}/card-detail-1280-dark.png` });
  await context.close();
});

test("drag in progress and unread notification screenshots", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  await prepare(context, "dark");
  const page = await context.newPage();
  await page.goto(`/boards/${boardId}`);
  await expect(page.getByTestId("unread-count")).toHaveText("1");
  await settled(page);
  await page.getByTestId("notification-bell").click();
  await expect(page.getByText("You were added to Marketing")).toBeVisible();
  await settled(page);
  await page.screenshot({ path: `${SHOTS}/notifications-1280-dark.png` });
  await page.keyboard.press("Escape");

  // Hold a card mid-drag over the Done column: lifted card, highlighted rim, drop placeholder.
  const card = page.locator('[data-testid^="card-"]', { hasText: "Book the venue" });
  const target = page.getByRole("list", { name: "Done cards" });
  const from = (await card.boundingBox())!;
  const to = (await target.boundingBox())!;
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height + 10, { steps: 12 });
  await expect(page.getByRole("region", { name: "Done", exact: true })).toHaveAttribute("data-drop-target", "true");
  await page.screenshot({ path: `${SHOTS}/drag-in-progress-1280-dark.png` });
  await page.mouse.up();
  await context.close();
});

test("reduced motion and forced colors keep content and focus visible", async ({ browser }) => {
  for (const options of [{ reducedMotion: "reduce" as const }, { forcedColors: "active" as const }]) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...options });
    await prepare(context, "dark");
    const page = await context.newPage();
    await page.goto(`/boards/${boardId}`);
    const firstCard = page.locator('[data-testid^="card-"]').first();
    await expect(firstCard).toBeVisible();
    await expect(firstCard).toHaveCSS("opacity", "1");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => getComputedStyle(document.activeElement!).outlineStyle);
    expect(outline).not.toBe("none");
    await context.close();
  }
});

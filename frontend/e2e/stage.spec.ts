import { expect, test } from "@playwright/test";

import { PASSWORD, uniqueEmail } from "./helpers";

/** Board_Stage and Tide_Clock (R44, R45): a one-screen board that scrolls sideways, and the clock. */
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5050";
const NAMES = ["Backlog", "To do", "Doing", "Review", "Done", "Archive"];

test("the board fills the screen, scrolls sideways and shows the clock", async ({ page, request, context }) => {
  const email = uniqueEmail("stage");
  await request.post(`${API}/api/auth/register`, { data: { name: "Stage Tester", email, password: PASSWORD } });
  const token = (await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } })).json()).data.token;
  const auth = { Authorization: `Bearer ${token}` };
  const board = (await (await request.post(`${API}/api/boards`, { headers: auth, data: { name: "Wide board" } })).json()).data;
  for (const name of NAMES) {
    const column = (await (await request.post(`${API}/api/boards/${board.id}/columns`, { headers: auth, data: { name } })).json()).data;
    await request.post(`${API}/api/columns/${column.id}/cards`, { headers: auth, data: { title: `${name} card` } });
  }
  const url = new URL(test.info().project.use.baseURL!);
  await context.addCookies([{ name: "revotask_token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto(`/boards/${board.id}`);
  const row = page.getByRole("region", { name: "Columns" });
  await expect(row.getByRole("region", { name: "Backlog", exact: true })).toBeVisible();
  // The dock is rendered after hydration, once the row has been measured: the wheel handler is live.
  await expect(page.getByRole("navigation", { name: "Jump to a column" })).toBeVisible();

  await test.step("the page itself does not scroll; columns reach the bottom of the screen", async () => {
    const { scroll, height } = await page.evaluate(() => ({ scroll: document.documentElement.scrollHeight, height: innerHeight }));
    expect(scroll).toBeLessThanOrEqual(height);
    const column = (await row.getByRole("region", { name: "Backlog", exact: true }).boundingBox())!;
    expect(column.y + column.height).toBeGreaterThan(720 - 120);
  });

  await test.step("the mouse wheel scrolls the columns sideways", async () => {
    const box = (await row.boundingBox())!;
    await page.mouse.move(box.x + box.width / 2, box.y + box.height - 40);
    await page.mouse.wheel(0, 500);
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeGreaterThan(100);
    await expect(page.getByRole("button", { name: "Scroll columns left" })).toBeVisible();
  });

  await test.step("the dock jumps to a column and marks it in view", async () => {
    const dock = page.getByRole("navigation", { name: "Jump to a column" });
    await dock.getByRole("button", { name: /Backlog/ }).click();
    await expect.poll(() => row.evaluate((el) => el.scrollLeft)).toBeLessThan(5);
    await expect(dock.getByRole("button", { name: /Backlog/ })).toHaveAttribute("aria-current", "true");
    await dock.getByRole("button", { name: /Archive/ }).click();
    await expect(dock.getByRole("button", { name: /Archive/ })).toHaveAttribute("aria-current", "true");
  });

  await test.step("the Tide_Clock shows the time and switches format", async () => {
    const clock = page.getByRole("complementary", { name: "Sidebar" }).getByRole("region", { name: "Clock" });
    const time = clock.getByRole("button", { name: /Switch to (12|24)-hour time/ });
    await expect(time).toHaveText(/^\d{1,2}:\d{2}(AM|PM)?$/);
    const before = await time.getAttribute("aria-label");
    await time.click();
    await expect(time).not.toHaveAttribute("aria-label", before!);
  });
});

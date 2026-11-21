import { expect, test } from "@playwright/test";

import { PASSWORD, uniqueEmail } from "./helpers";

/** Card due dates (R51) and the collapsible sidebar (R53), both kept across a reload. */
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5050";

function isoInDays(days: number) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

test("a card gets a due date, and the sidebar collapse is remembered", async ({ page, request, context }) => {
  const email = uniqueEmail("due");
  await request.post(`${API}/api/auth/register`, { data: { name: "Due Tester", email, password: PASSWORD } });
  const token = (await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } })).json()).data.token;
  const auth = { Authorization: `Bearer ${token}` };
  const board = (await (await request.post(`${API}/api/boards`, { headers: auth, data: { name: "Dates" } })).json()).data;
  const column = (await (await request.post(`${API}/api/boards/${board.id}/columns`, { headers: auth, data: { name: "To do" } })).json()).data;
  await request.post(`${API}/api/columns/${column.id}/cards`, { headers: auth, data: { title: "Send the invoice" } });
  const url = new URL(test.info().project.use.baseURL!);
  await context.addCookies([{ name: "revotask_token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.setViewportSize({ width: 1440, height: 860 });
  await page.goto(`/boards/${board.id}`);

  await test.step("set a due date two days ago: the card shows it as overdue", async () => {
    await page.getByRole("button", { name: "Send the invoice" }).click();
    const dialog = page.getByRole("dialog", { name: "Send the invoice" });
    await dialog.getByLabel("Due date").fill(isoInDays(-2));
    await dialog.getByRole("button", { name: "Save card" }).click();
    await expect(page.getByText("Card saved")).toBeVisible();
    await dialog.getByRole("button", { name: "Close Send the invoice" }).click();
    const card = page.locator('[data-testid^="card-"]', { hasText: "Send the invoice" });
    await expect(card.getByText("2 days overdue")).toBeVisible();
    await page.reload();
    await expect(page.locator('[data-testid^="card-"]', { hasText: "Send the invoice" }).getByText("2 days overdue")).toBeVisible();
  });

  await test.step("collapse the sidebar; it stays collapsed after a reload", async () => {
    await page.getByRole("button", { name: "Collapse sidebar" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
    await expect.poll(async () => (await page.locator("#sidebar").boundingBox())!.width).toBeLessThan(120);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
    await page.getByRole("button", { name: "Expand sidebar" }).click();
    await expect.poll(async () => (await page.locator("#sidebar").boundingBox())!.width).toBeGreaterThan(250);
  });
});

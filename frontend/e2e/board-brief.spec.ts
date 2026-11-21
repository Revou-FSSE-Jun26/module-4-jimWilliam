import { expect, test } from "@playwright/test";

import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * Board purpose, colour, columns, notes and links (R47-R49): set up through the UI, then checked
 * after a reload. SHOTS_DIR, when set, also saves screenshots of the dialogs.
 */
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5050";
const SHOTS = process.env.SHOTS_DIR;

test("an admin sets the purpose, colour and columns; members keep notes and links", async ({ page, request, context }) => {
  const email = uniqueEmail("brief");
  await request.post(`${API}/api/auth/register`, { data: { name: "Brief Tester", email, password: PASSWORD } });
  const token = (await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } })).json()).data.token;
  const auth = { Authorization: `Bearer ${token}` };
  const board = (await (await request.post(`${API}/api/boards`, { headers: auth, data: { name: "Demo board" } })).json()).data;
  for (const name of ["To do", "Doing", "Done"]) {
    const column = (await (await request.post(`${API}/api/boards/${board.id}/columns`, { headers: auth, data: { name } })).json()).data;
    await request.post(`${API}/api/columns/${column.id}/cards`, { headers: auth, data: { title: `${name} card` } });
  }
  const url = new URL(test.info().project.use.baseURL!);
  await context.addCookies([{ name: "revotask_token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
  await page.setViewportSize({ width: 1366, height: 820 });
  await page.goto(`/boards/${board.id}`);
  await expect(page.getByRole("region", { name: "Columns" })).toBeVisible();

  await test.step("settings: purpose, colour and an Ideas column before To do", async () => {
    await page.getByRole("button", { name: "Settings" }).first().click();
    const dialog = page.getByRole("dialog", { name: "Board settings" });
    await dialog.getByLabel("Purpose").fill("Launch the new site by 12 December");
    await dialog.locator("label.color-swatch", { hasText: "Violet" }).click();   // the swatch, as a user clicks it
    await expect(dialog.getByRole("radio", { name: "Violet" })).toBeChecked();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/settings.png` });
    await dialog.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("Board settings saved")).toBeVisible();
    await dialog.getByLabel("New column name").fill("Ideas");
    await dialog.getByLabel("Position").selectOption({ label: "At the start" });
    await dialog.getByRole("button", { name: "Add column" }).click();
    await expect(dialog.getByLabel("Name of column 1")).toHaveValue("Ideas");
    await dialog.getByRole("button", { name: "Close Board settings" }).click();
  });

  await test.step("the purpose shows under the title and Ideas comes first", async () => {
    await expect(page.getByRole("button", { name: /Purpose: Launch the new site/ })).toBeVisible();
    const names = await page.getByRole("region", { name: "Columns" }).locator("h2").allTextContents();
    expect(names.slice(0, 4)).toEqual(["Ideas", "To do", "Doing", "Done"]);
  });

  await test.step("About: notes and a recording link", async () => {
    await page.getByRole("button", { name: "About" }).first().click();
    const dialog = page.getByRole("dialog", { name: "About Demo board" });
    await expect(dialog.getByText("Launch the new site by 12 December")).toBeVisible();
    const notes = dialog.getByRole("textbox", { name: "Board notes" });
    await notes.click();
    await page.keyboard.type("Kick-off: agreed scope");
    await dialog.getByRole("button", { name: "Save notes" }).click();
    await expect(page.getByText("Notes saved")).toBeVisible();
    await dialog.getByLabel("Web address").fill("meet.example.com/rec/42");
    await dialog.getByLabel("Title (optional)").fill("Kick-off recording");
    await dialog.getByRole("button", { name: "Add link" }).click();
    await expect(dialog.getByRole("link", { name: /Kick-off recording/ })).toHaveAttribute("href", "https://meet.example.com/rec/42");
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/about.png` });
  });

  await test.step("everything survives a reload", async () => {
    await page.reload();
    await expect(page.getByRole("button", { name: /Purpose: Launch the new site/ })).toBeVisible();
    await page.getByRole("button", { name: "About" }).first().click();
    const dialog = page.getByRole("dialog", { name: "About Demo board" });
    await expect(dialog.getByRole("textbox", { name: "Board notes" })).toContainText("Kick-off: agreed scope");
    await expect(dialog.getByRole("link", { name: /Kick-off recording/ })).toBeVisible();
    await dialog.getByRole("button", { name: "Close About Demo board" }).click();
    if (SHOTS) await page.screenshot({ path: `${SHOTS}/board.png` });
  });

  await test.step("the favicon is the RevoTask mark", async () => {
    const icon = await page.locator('link[rel="icon"][type="image/svg+xml"]').getAttribute("href");
    expect(icon).toContain("/icon.svg");
    expect((await page.request.get(new URL(icon!, url).toString())).headers()["content-type"]).toContain("image/svg+xml");
  });
});

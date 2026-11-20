import { expect, test, type Page } from "@playwright/test";

import { PASSWORD, uniqueEmail } from "./helpers";

/**
 * Profile photo, card images and the rich-text description (R40-R43): uploads are converted to AVIF,
 * images open in a protected lightbox, and formatted descriptions survive a reload.
 */
const API = process.env.PLAYWRIGHT_API_URL ?? "http://localhost:5050";

let token = "";
let boardId = "";

test.beforeAll(async ({ request }) => {
  const email = uniqueEmail("media");
  expect((await request.post(`${API}/api/auth/register`, { data: { name: "Media Tester", email, password: PASSWORD } })).ok()).toBe(true);
  token = (await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD } })).json()).data.token;
  const auth = { Authorization: `Bearer ${token}` };
  boardId = (await (await request.post(`${API}/api/boards`, { headers: auth, data: { name: "Photo board" } })).json()).data.id;
  const column = (await (await request.post(`${API}/api/boards/${boardId}/columns`, { headers: auth, data: { name: "To do" } })).json()).data;
  await request.post(`${API}/api/columns/${column.id}/cards`, { headers: auth, data: { title: "Shoot the hero image" } });
});

test.beforeEach(async ({ context }) => {
  const url = new URL(test.info().project.use.baseURL!);
  await context.addCookies([{ name: "revotask_token", value: token, domain: url.hostname, path: "/", httpOnly: true, sameSite: "Lax" }]);
});

/** A real PNG drawn on a canvas, so the API has something to convert. */
async function pngFile(page: Page, name: string) {
  const base64 = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 420;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createLinearGradient(0, 0, 640, 420);
    gradient.addColorStop(0, "#9FD8CB");
    gradient.addColorStop(1, "#1F5C63");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 640, 420);
    return canvas.toDataURL("image/png").split(",")[1];
  });
  return { name, mimeType: "image/png", buffer: Buffer.from(base64, "base64") };
}

async function contextMenuBlocked(page: Page, selector: string) {
  return page.locator(selector).first().evaluate((el) => {
    const event = new MouseEvent("contextmenu", { bubbles: true, cancelable: true });
    el.dispatchEvent(event);
    return event.defaultPrevented;
  });
}

test("profile photo is stored as AVIF and protected", async ({ page }) => {
  await page.goto("/profile");
  await expect(page.getByRole("heading", { level: 1, name: "Profile" })).toBeVisible();
  // The duplicate "Profile" link is gone from the main navigation; the capsule menu still has it.
  await expect(page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Profile" })).toHaveCount(0);

  const uploaded = page.waitForResponse((r) => r.url().endsWith("/api/users/me/avatar") && r.request().method() === "POST");
  await page.getByTestId("avatar-input").setInputFiles(await pngFile(page, "me.png"));
  expect((await uploaded).ok()).toBe(true);

  const photo = page.getByRole("button", { name: "View your profile photo" });
  await expect(photo).toBeVisible();
  const src = await photo.locator("img").getAttribute("src");
  expect(src).toMatch(/\/api\/media\/[0-9a-f-]+\?v=full&exp=\d+&sig=[0-9a-f]+/);
  const image = await page.request.get(src!);
  expect(image.headers()["content-type"]).toBe("image/avif");

  // The capsule in the sidebar shows the photo too.
  await expect(page.getByRole("button", { name: /^Account menu/ }).first().locator("img")).toHaveCount(1);

  await photo.click();
  const lightbox = page.locator("dialog.lightbox[open]");
  await expect(lightbox.getByRole("img", { name: /profile photo/ })).toBeVisible();
  expect(await contextMenuBlocked(page, "dialog.lightbox[open] .protected-shield")).toBe(true);
  expect(await contextMenuBlocked(page, "dialog.lightbox[open] img")).toBe(true);
  expect(await lightbox.locator("img").getAttribute("draggable")).toBe("false");
  await page.keyboard.press("Escape");
  await expect(lightbox).toHaveCount(0);
});

test("card description keeps rich formatting and images attach as AVIF", async ({ page }) => {
  await page.goto(`/boards/${boardId}`);
  await page.getByRole("button", { name: "Shoot the hero image" }).click();
  const dialog = page.getByRole("dialog", { name: "Shoot the hero image" });

  const editor = dialog.getByRole("textbox", { name: "Description" });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type("Golden hour");
  await page.keyboard.press("ControlOrMeta+b");
  await page.keyboard.type(" at the pier");
  await dialog.getByRole("button", { name: "Bulleted list" }).click();
  await expect(dialog.getByRole("button", { name: "Bulleted list" })).toHaveAttribute("aria-pressed", "true");
  const saved = page.waitForResponse((r) => /\/api\/cards\/[^/]+$/.test(r.url()) && r.request().method() === "PATCH");
  await dialog.getByRole("button", { name: "Save card" }).click();
  expect((await saved).ok()).toBe(true);

  const uploaded = page.waitForResponse((r) => r.url().endsWith("/attachments") && r.request().method() === "POST");
  await dialog.getByTestId("attachment-input").setInputFiles(await pngFile(page, "pier.png"));
  expect((await uploaded).status()).toBe(201);
  const thumb = dialog.getByRole("button", { name: "View pier.avif" });
  await expect(thumb).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Shoot the hero image" }).click();
  const reopened = page.getByRole("dialog", { name: "Shoot the hero image" });
  await expect(reopened.getByRole("textbox", { name: "Description" }).locator("li strong")).toHaveText("Golden hour");
  await reopened.getByRole("button", { name: "View pier.avif" }).click();
  const lightbox = page.locator("dialog.lightbox[open]");
  await expect(lightbox.getByRole("img", { name: "pier.avif" })).toBeVisible();
  expect(await contextMenuBlocked(page, "dialog.lightbox[open] .protected-shield")).toBe(true);
  await lightbox.getByRole("button", { name: "Close image" }).click();
  // The card on the board shows the image count.
  await page.keyboard.press("Escape");
  await expect(page.getByLabel("1 image")).toBeVisible();
});

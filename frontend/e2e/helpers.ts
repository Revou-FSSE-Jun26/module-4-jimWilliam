import { expect, type Page } from "@playwright/test";

export const PASSWORD = "e2e-password-123";

/** A unique account per run, so the suite can run repeatedly against production (R26.6). */
export function uniqueEmail(tag = "run"): string {
  return `e2e+${tag}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@revotask.test`;
}

export async function register(page: Page, name: string, email: string, password = PASSWORD) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

export async function login(page: Page, email: string, password = PASSWORD) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1, name: "Your boards" })).toBeVisible();
}

export async function logout(page: Page) {
  await page.getByRole("button", { name: /^Account menu/ }).first().click();
  await page.getByRole("menuitem", { name: "Log out" }).or(page.getByRole("button", { name: "Log out" })).first().click();
  await expect(page).toHaveURL(/\/login$/);
}

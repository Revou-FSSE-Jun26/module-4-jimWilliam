import { expect, test } from "@playwright/test";

import { PASSWORD, login, logout, register, uniqueEmail } from "./helpers";

/** The 4 auth scenarios (R26.2). Every wait is a web-first assertion; no waitForTimeout. */
test.describe("auth flow", () => {
  const email = uniqueEmail("auth");

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await register(page, "Auth Tester", email);
    await page.close();
  });

  test("(a) a successful login redirects to the dashboard", async ({ page }) => {
    await login(page, email);
    await expect(page).toHaveURL(/\/$/);
  });

  test("(b) invalid credentials show an error and stay on /login", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(`${PASSWORD}-wrong`);
    await page.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByRole("main").getByRole("alert")).toHaveText("Invalid email or password");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("(c) an unauthenticated visit to / redirects to /login", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole("heading", { name: "Log in" })).toBeVisible();
  });

  test("(d) after logout, visiting / redirects to /login", async ({ page }) => {
    await login(page, email);
    await logout(page);
    await page.goto("/");
    await expect(page).toHaveURL(/\/login$/);
  });
});

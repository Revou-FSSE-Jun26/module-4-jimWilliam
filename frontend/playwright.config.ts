import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite (R26). Runs against the live Vercel URL in PLAYWRIGHT_BASE_URL; PLAYWRIGHT_API_URL is
 * the Flask API used to seed data for the visual suite. The HTML report is committed (R26.5).
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-report", open: "never" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  // PW_CHANNEL=chrome runs on the installed Google Chrome instead of Playwright's own build.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], channel: process.env.PW_CHANNEL || undefined } }],
});

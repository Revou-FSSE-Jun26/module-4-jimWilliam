import { expect, test } from "@playwright/test";

import { login, register, uniqueEmail } from "./helpers";

/** The 8-step Kanban journey (R26.3), including drag and drop and persistence after reload. */
test("kanban journey: board, columns, card, drag, reload, comment", async ({ page }) => {
  const email = uniqueEmail("kanban");
  const boardName = `Sprint ${Date.now() % 10_000}`;
  const cardTitle = "Write the project brief";

  await test.step("1. register", async () => {
    await register(page, "Kanban Tester", email);
  });

  await test.step("2. log in", async () => {
    await login(page, email);
  });

  await test.step("3. create a board", async () => {
    await page.getByRole("button", { name: /New board|Create your first board/ }).first().click();
    await page.getByLabel("Board name").fill(boardName);
    await page.getByRole("button", { name: "Create board" }).click();
    await page.getByRole("link", { name: new RegExp(boardName) }).first().click();
    await expect(page.getByRole("heading", { level: 1, name: boardName })).toBeVisible();
  });

  const todo = page.getByRole("region", { name: "To do", exact: true });
  const done = page.getByRole("region", { name: "Done", exact: true });

  await test.step("4. add two columns", async () => {
    const addColumn = page.getByRole("form", { name: "Add a column" });
    for (const name of ["To do", "Done"]) {
      await addColumn.getByLabel("Column name").fill(name);
      await addColumn.getByRole("button", { name: "Add column" }).click();
      await expect(page.getByRole("region", { name, exact: true })).toBeVisible();
    }
    await expect(todo).toBeVisible();
    await expect(done).toBeVisible();
  });

  const card = page.locator('[data-testid^="card-"]', { hasText: cardTitle });

  await test.step("5. create a card in the first column", async () => {
    await todo.getByRole("button", { name: "Add card" }).click();
    await todo.getByLabel("Card title").fill(cardTitle);
    await todo.getByRole("button", { name: "Add card" }).click();
    await expect(todo.locator('[data-testid^="card-"]', { hasText: cardTitle })).toBeVisible();
  });

  await test.step("6. drag the card to the second column", async () => {
    const saved = page.waitForResponse((r) => r.url().includes("/position") && r.request().method() === "PATCH");
    // A real drag: press on the card, move in several steps (each fires dragover), release on the column.
    const from = (await card.boundingBox())!;
    const to = (await done.getByRole("list", { name: "Done cards" }).boundingBox())!;
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + 24, { steps: 12 });
    await page.mouse.move(to.x + to.width / 2, to.y + 30, { steps: 3 });
    await page.mouse.up();
    expect((await saved).ok()).toBe(true);
    await expect(done.locator('[data-testid^="card-"]', { hasText: cardTitle })).toBeVisible();
  });

  await test.step("7. reload and confirm the card stayed in the second column", async () => {
    await page.reload();
    await expect(done.locator('[data-testid^="card-"]', { hasText: cardTitle })).toBeVisible();
    await expect(todo.locator('[data-testid^="card-"]', { hasText: cardTitle })).toHaveCount(0);
  });

  await test.step("8. open the card, add a comment and edit it", async () => {
    await done.getByRole("button", { name: cardTitle }).click();
    const dialog = page.getByRole("dialog", { name: cardTitle });
    await expect(dialog).toBeVisible();
    await dialog.getByLabel("Add a comment").fill("First draft is ready for review.");
    await dialog.getByRole("button", { name: "Post comment" }).click();
    await expect(dialog.getByTestId("comment-text")).toHaveText("First draft is ready for review.");
    await dialog.getByTestId("comment").hover();
    await dialog.getByRole("button", { name: "Edit comment" }).click();
    await dialog.getByLabel("Edit comment").fill("Final draft is ready for review.");
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog.getByTestId("comment-text")).toHaveText("Final draft is ready for review.");
  });
});

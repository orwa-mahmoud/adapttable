import { expect, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * Highlighting the row a change just landed on, in every kit.
 *
 * The point of this test is what it does NOT need. There is no highlight prop
 * on any table here: `useHighlight` decides which row is marked and the demo
 * turns that into a class through `rowClassName`, which every adapter already
 * honours. So the same assertion holds in all eight without one line of
 * per-kit wiring — and if a kit ever stops passing `rowClassName` through to
 * its rows, this is what says so.
 */

const ADAPTERS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
] as const;

const demo = (page: Page) => page.locator("#demo");

async function openDemo(page: Page, adapter: string): Promise<void> {
  await page.goto("/all-options/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  if (adapter === "mantine") return;
  const tab = page.getByTestId(`adapter-${adapter}`);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(
    demo(page).locator(`[data-adapter="${adapter}"] [data-stagger]`).first()
  ).toBeVisible();
}

for (const adapter of ADAPTERS) {
  test.describe(adapter, () => {
    test("marks the added row, then clears itself", async ({ page }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "add / delete", "On");
      await configureFeatureLab(page, "highlight changed rows", "On");

      const rows = demo(page).locator(
        `[data-adapter="${adapter}"] [data-stagger]`
      );
      await expect(rows.first()).toContainText("Ada Lovelace");

      await demo(page).locator('[data-adapttable-part="add-row"]').click();

      // The new row is the marked one — and it is the only marked one.
      await expect(rows.first()).toHaveClass(/demo-flash/);
      await expect(
        demo(page).locator(`[data-adapter="${adapter}"] .demo-flash`)
      ).toHaveCount(1);

      // A mark that never leaves is a permanent decoration, not a highlight.
      await expect(rows.first()).not.toHaveClass(/demo-flash/, {
        timeout: 5000,
      });
    });

    test("marks the row an edit landed on, wherever it sits", async ({
      page,
    }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "editing mode", "Cell");
      await configureFeatureLab(page, "highlight changed rows", "On");

      const rows = demo(page).locator(
        `[data-adapter="${adapter}"] [data-stagger]`
      );
      const second = rows.nth(1);
      const activate = second
        .locator('[data-adapttable-part="edit-cell-activate"]')
        .first();
      await expect(activate).toBeVisible();
      await activate.dblclick();
      const editor = demo(page)
        .locator(
          `[data-adapter="${adapter}"] [data-adapttable-part="edit-cell-editor"]`
        )
        .first();
      await expect(editor).toBeVisible();
      await editor.fill("Flagged");
      await editor.press("Enter");

      // The edited row, not the first one — the mark is keyed by row id.
      await expect(second).toHaveClass(/demo-flash/);
      await expect(rows.first()).not.toHaveClass(/demo-flash/);
    });
  });
}

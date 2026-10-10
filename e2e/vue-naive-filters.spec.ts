/** Run the real Naive UI filter contracts in the production showcase CI. */
import "../packages/vue/adapter-naive-ui/browser/filters/naive-filters.spec";

import { expect, test } from "@playwright/test";

test("Naive UI filter panel lab boots real controls without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vue/naive-ui/filter-panel/");
  const root = page.locator('[data-adapttable-part="root"]');
  await expect(root).toHaveCount(1);
  await expect(root.locator("table.n-table")).toBeVisible();
  await expect(
    root.locator('[data-adapttable-part="filters-button"]')
  ).toHaveClass(/\bn-button\b/);
  await expect(
    root.locator('[data-adapttable-part="cell"]').first()
  ).not.toBeEmpty();
  expect(errors).toEqual([]);
});

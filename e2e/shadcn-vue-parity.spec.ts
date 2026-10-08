/** Run the package's real-control browser contracts in the production showcase CI. */
import "../packages/vue/adapter-shadcn-vue/test/browser/action-surfaces.spec";
import "../packages/vue/adapter-shadcn-vue/test/browser/feature-parity.spec";
import "../packages/vue/adapter-shadcn-vue/test/browser/filter-panel.spec";

import { expect, test } from "@playwright/test";

test("shadcn-vue feature labs boot real native controls without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  for (const lab of ["filter-panel", "feature-parity", "action-surfaces"]) {
    await page.goto(`/vue/shadcn-vue/${lab}/`);
    const root = page.locator('[data-adapttable-part="root"]');
    await expect(root).toHaveCount(1);
    await expect(root).toHaveClass(/adapttable-shadcn-vue/);
    await expect(
      root.locator('button[data-slot="button"]').first()
    ).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="cell"]').first()
    ).toContainText(/Ada|Bea|Core/);
  }
  expect(errors).toEqual([]);
});

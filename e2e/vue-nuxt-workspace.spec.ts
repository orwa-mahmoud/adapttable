/** Run the real Nuxt UI feature contracts in the production showcase CI. */
import "../packages/vue/adapter-nuxt-ui/browser/workspace/nuxt-workspace.spec";

import { expect, test } from "@playwright/test";

test("Nuxt UI workspace boots real controls without browser errors", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/vue/nuxt-ui/workspace/");
  await expect(
    page.getByRole("heading", { name: "Nuxt UI workspace feature checks" })
  ).toBeVisible();
  const root = page.locator('[data-adapttable-part="root"]');
  await expect(root).toHaveCount(1);
  await expect(
    root.locator('[data-adapttable-part="command-palette-button"]')
  ).toBeVisible();
  await expect(
    root.locator('[data-adapttable-part="cell"]').first()
  ).toContainText("Ada");
  await expect(page.locator('[data-test="rows"]')).toHaveText(
    "a:Core,b:Core,c:Design"
  );
  expect(errors).toEqual([]);
});

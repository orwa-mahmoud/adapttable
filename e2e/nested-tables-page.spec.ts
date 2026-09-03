import { expect, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";
import { gotoFromFeatureGrid } from "./nav";

const KIT = builtAdapters()[0]!.key;
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("nested-tables")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);
const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Nested tables");
  await expect(page).toHaveURL(/\/nested-tables\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/nested-tables/`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(copy(FEATURE.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy(FEATURE.description)
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy(FEATURE.h1)
  );
  await expect(page.locator("main")).toContainText(
    copy(FEATURE.intro[0]!).slice(0, 60)
  );
  await expect(page.locator("main")).toContainText(ADAPTER.pkg);
  await context.close();
});

for (const kit of KITS) {
  test(`${kit}: the first row mounts a nested table of orders`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/nested-tables/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    const nested = root.locator('[data-adapttable-part="nested-table"]');
    await expect(nested).toBeVisible();
    await expect(nested.getByRole("table").first()).toBeVisible();
    await expect(nested).toContainText(
      /Analytical engine|Punch cards|Compiler|Support retainer/
    );
    await expect(
      root.getByRole("button", { name: "Collapse row" }).first()
    ).toBeVisible();
  });
}

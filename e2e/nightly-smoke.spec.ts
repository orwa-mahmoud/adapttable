import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * Extra-browser smoke: each published kit landing paints its table (or cards
 * on the Pixel 5 project). Chromium ignores this file — the per-PR suite
 * already walks these URLs. Firefox, WebKit and mobile-chrome pick it up
 * through `testMatch` in `playwright.config.ts`.
 */

const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");

for (const kit of KITS) {
  test(`${kit} landing paints a table or card list`, async ({ page }) => {
    await page.goto(`/${kit}/`);
    await expect(demo(page).first()).toBeVisible();
    await expect(
      demo(page)
        .locator("table, [data-adapttable-part='cards'], [role='grid']")
        .first()
    ).toBeVisible();
  });
}

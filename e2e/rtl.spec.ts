import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { gotoFromFeatureGrid } from "./nav";

/**
 * The RTL page has to show the filters control, not just a mirrored table.
 * Pixel geometry of the popover is a kit concern — do not assert bounding
 * boxes here; those checks force placement hacks that break the card.
 */

const KIT = builtAdapters()[0]!.key;
const demo = (page: Page) => page.locator(".mx-demo");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "RTL");
  await expect(page).toHaveURL(/\/rtl\/$/);
  await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
});

test("mirrors the table and still offers its filters", async ({ page }) => {
  await page.goto(`/${KIT}/rtl/`);
  await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
  await expect(
    demo(page).getByRole("button", { name: "عوامل التصفية" })
  ).toBeVisible();
});

/**
 * RTL is a per-kit claim: the portalled card must carry dir, or the title
 * stays on the left and Clear all on the right.
 */
const KITS = builtAdapters().map((adapter) => adapter.key);

for (const kit of KITS) {
  test(`${kit}: mirrors the table and the portalled filters card`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/rtl/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(root.locator('[dir="rtl"]').first()).toBeVisible();

    await root.getByRole("button", { name: "عوامل التصفية" }).click();
    const popover = page
      .locator('[data-adapttable-part="filters-form"]')
      .first();
    await expect(popover).toBeVisible();

    // Kits animate the card in (antd zooms it); measure it at rest. A
    // transition the kit replaces ends cancelled, so wait for each to settle.
    await page.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished)
      )
    );

    const rtlRoot = popover.locator("xpath=ancestor::*[@dir='rtl'][1]");
    await expect(rtlRoot).toBeAttached();
    const title = rtlRoot.getByText("عوامل التصفية").first();
    const clear = rtlRoot.getByRole("button", { name: "مسح الكل" });
    const titleBox = await title.boundingBox();
    const clearBox = await clear.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(clearBox).not.toBeNull();
    expect(titleBox!.x).toBeGreaterThan(clearBox!.x);
  });
}

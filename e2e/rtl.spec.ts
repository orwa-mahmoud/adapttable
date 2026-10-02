import { expect, type Page, test } from "@playwright/test";

import { builtAdapters, featuresOf } from "../apps/showcase/matrix.mjs";
import { getDirection, locales } from "../packages/shared/i18n/src/index";
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

/** A document direction alone cannot override a kit root's explicit ltr. */
for (const kit of builtAdapters("angular")) {
  const pages = [
    kit.key,
    ...featuresOf(kit).map((feature) => `${kit.key}/${feature.slug}`),
  ];
  for (const path of pages) {
    for (const width of [1280, 390]) {
      test(`${path}: every actual table is RTL at ${String(width)}px`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(`/${path}/?locale=ar&dir=rtl`);
        const roots = demo(page).locator('[data-adapttable-part="root"]');
        await expect(roots.first()).toBeVisible();
        // The nested destination opens its first child by default: assert both
        // roots so removing the child's presentation binding cannot go green.
        if (path.endsWith("/nested-tables")) await expect(roots).toHaveCount(2);
        const count = await roots.count();
        expect(count).toBeGreaterThan(0);
        for (let index = 0; index < count; index++) {
          await expect(roots.nth(index)).toHaveAttribute("dir", "rtl");
          await expect(roots.nth(index)).toHaveCSS("direction", "rtl");
        }
        const search = demo(page).locator('[data-adapttable-part="search"]');
        if (!path.endsWith("/pivot")) {
          await expect(search.first()).toHaveAccessibleName(locales.ar.search);
          await expect(search.first()).toHaveAttribute(
            "placeholder",
            locales.ar.searchPlaceholder
          );
        }
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth - window.innerWidth
        );
        expect(overflow, path).toBeLessThanOrEqual(1);
      });
    }
  }

  for (const [locale, labels] of Object.entries(locales)) {
    test(`${kit.key}: ${locale} labels reach the table, pager and filter overlay`, async ({
      page,
    }) => {
      await page.goto(`/${kit.key}/?locale=${locale}`);
      const root = demo(page).locator('[data-adapttable-part="root"]');
      await expect(root).toHaveAttribute("dir", getDirection(locale));
      await expect(
        root.locator('[data-adapttable-part="search"]')
      ).toHaveAccessibleName(labels.search);
      await expect(
        root.locator('[data-adapttable-part="search"]')
      ).toHaveAttribute("placeholder", labels.searchPlaceholder);
      await expect(
        root.locator('[data-adapttable-part="page-prev"]')
      ).toHaveAccessibleName(labels.previousPage);
      await expect(
        root.locator('[data-adapttable-part="page-next"]')
      ).toHaveAccessibleName(labels.nextPage);
      const trigger = root.locator('[data-adapttable-part="filters-button"]');
      await expect(trigger).toHaveAccessibleName(labels.filters);
      await trigger.click();
      const panel = page.locator('[data-adapttable-part="filters-popover"]');
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("dir", getDirection(locale));
      await expect(
        panel.locator('[data-adapttable-part="filters-clear"]')
      ).toHaveText(labels.clearAll);
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }
}

for (const kit of builtAdapters("angular")) {
  test(`${kit.key}: RTL grid arrows move along the visual axis`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/accessibility/?dir=rtl`);
    const cells = demo(page)
      .locator('[data-adapttable-part="row"]')
      .first()
      .locator('[data-adapttable-part="cell"]');
    await cells.first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(cells.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(cells.first()).toBeFocused();
  });

  test(`${kit.key}: a start-pinned column sticks to the right in RTL`, async ({
    page,
  }) => {
    await page.goto(`/${kit.key}/columns/?dir=rtl`);
    const pinned = demo(page)
      .getByRole("columnheader")
      .and(page.locator('[data-column-key="person"]'));
    await expect(pinned).toHaveCSS("position", "sticky");
    await expect(pinned).toHaveCSS("right", "0px");
    const before = await pinned.boundingBox();
    expect(before).not.toBeNull();
    const scroller = demo(page).locator('[data-adapttable-part="scroll-box"]');
    const offset = await scroller.evaluate((element) => {
      element.scrollLeft = -300;
      return element.scrollLeft;
    });
    expect(offset).toBeLessThan(-100);
    const after = await pinned.boundingBox();
    expect(after).not.toBeNull();
    expect(Math.abs(after!.x - before!.x)).toBeLessThan(2);
  });
}

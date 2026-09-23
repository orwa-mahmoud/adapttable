import { devices, expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../../apps/showcase/matrix.mjs";

/**
 * Chromium visual baselines for the v3 showcase UI.
 *
 * One snapshot name per (kit × viewport × theme × direction × surface).
 * Baselines live in `e2e/visual/baselines/<platform>/` — see README.md
 * in this folder for how to update them.
 */

const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");

const SCREENSHOT = {
  animations: "disabled" as const,
  caret: "hide" as const,
  maxDiffPixelRatio: 0.012,
};

async function waitForDemo(page: Page): Promise<void> {
  await expect(demo(page).first()).toBeVisible();
  await expect(
    demo(page)
      .locator("table, [data-adapttable-part='cards'], [role='grid']")
      .first()
  ).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

async function setTheme(page: Page, theme: "light" | "dark"): Promise<void> {
  const current = await page.locator("html").getAttribute("data-theme");
  if (current === theme) return;
  await page.getByRole("button", { name: "Toggle dark mode" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
}

/**
 * Grow the viewport to the page's full height. A capture taller than the
 * viewport is taken while scrolling, and every sticky element (the site
 * header, a table toolbar) is painted at the scroll offset — in the middle of
 * the image. With the whole page on screen nothing scrolls.
 */
async function fitViewportToPage(page: Page): Promise<void> {
  const viewport = page.viewportSize()!;
  const height = await page.evaluate(() =>
    Math.ceil(document.documentElement.scrollHeight)
  );
  if (height > viewport.height) {
    await page.setViewportSize({ width: viewport.width, height });
  }
}

async function snapshotDemo(page: Page, name: string): Promise<void> {
  await waitForDemo(page);
  await fitViewportToPage(page);
  await expect(demo(page)).toHaveScreenshot(`${name}.png`, SCREENSHOT);
}

test.describe("desktop LTR", () => {
  for (const kit of KITS) {
    test(`${kit} columns light`, async ({ page }) => {
      await page.goto(`/${kit}/columns/`);
      await setTheme(page, "light");
      await snapshotDemo(page, `${kit}-desktop-light-ltr`);
    });

    test(`${kit} columns dark`, async ({ page }) => {
      await page.goto(`/${kit}/columns/`);
      await setTheme(page, "dark");
      await snapshotDemo(page, `${kit}-desktop-dark-ltr`);
    });
  }
});

test.describe("desktop RTL", () => {
  for (const kit of KITS) {
    test(`${kit} rtl light`, async ({ page }) => {
      await page.goto(`/${kit}/rtl/`);
      await setTheme(page, "light");
      await snapshotDemo(page, `${kit}-desktop-light-rtl`);
    });
  }
});

test.describe("mobile LTR", () => {
  // Viewport only — spreading the full Pixel 5 device sets
  // `defaultBrowserType` and Playwright refuses that inside describe.
  test.use({
    viewport: devices["Pixel 5"].viewport,
    isMobile: true,
    hasTouch: true,
  });

  for (const kit of KITS) {
    test(`${kit} mobile-cards light`, async ({ page }) => {
      await page.goto(`/${kit}/mobile-cards/`);
      await setTheme(page, "light");
      await snapshotDemo(page, `${kit}-mobile-light-ltr`);
    });
  }
});

test.describe("overlays", () => {
  for (const kit of KITS) {
    test(`${kit} filters popover`, async ({ page }) => {
      await page.goto(`/${kit}/filtering/`);
      await setTheme(page, "light");
      await waitForDemo(page);
      await fitViewportToPage(page);
      await demo(page)
        .getByRole("button", { name: "Filters", exact: true })
        .click();
      const form = page
        .locator('[data-adapttable-part="filters-form"]')
        .first();
      await expect(form).toBeVisible();
      // The form scrolls inside the kit's popover card, so its own box runs
      // past the card into the page behind. The card — header, Clear all and
      // the visible fields — is the first positioned ancestor in every kit.
      await form.evaluate((element) => {
        let node = element.parentElement;
        while (
          node &&
          !["absolute", "fixed"].includes(getComputedStyle(node).position)
        ) {
          node = node.parentElement;
        }
        node?.setAttribute("data-visual-surface", "");
      });
      const card = page.locator("[data-visual-surface]");
      await expect(card).toHaveCount(1);
      await expect(card).toHaveScreenshot(
        `${kit}-overlay-filters.png`,
        SCREENSHOT
      );
    });

    test(`${kit} column menu`, async ({ page }) => {
      await page.goto(`/${kit}/columns/`);
      await setTheme(page, "light");
      await waitForDemo(page);
      await page
        .locator('[data-adapttable-part="column-menu-button"]')
        .first()
        .click();
      const item = page
        .locator('[data-adapttable-part="column-menu-item"]')
        .first();
      await expect(item).toBeVisible();
      const menu = page
        .getByRole("dialog", { name: "Columns" })
        .or(page.getByRole("group", { name: "Columns" }))
        .first();
      await expect(menu).toBeVisible();
      await expect(menu).toHaveScreenshot(
        `${kit}-overlay-column-menu.png`,
        SCREENSHOT
      );
    });
  }
});

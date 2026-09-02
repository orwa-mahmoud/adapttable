import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

const KITS = builtAdapters().map((adapter) => adapter.key);

/**
 * Windows High Contrast drops authored fills and box-shadows. Focus, find
 * hits and dirty cells have to keep an outline made of a system color, or
 * the mark disappears.
 */
async function outlineOf(page: Page, selector: string): Promise<string> {
  return page
    .locator(selector)
    .first()
    .evaluate((node) => {
      const style = getComputedStyle(node);
      return `${style.outlineStyle} ${style.outlineWidth} ${style.boxShadow}`;
    });
}

test.describe("forced-colors", () => {
  test("every kit keeps a visible outline on the focused cell", async ({
    page,
  }) => {
    test.setTimeout(180_000);
    for (const kit of KITS) {
      await page.goto(`/${kit}/accessibility/`);
      await page.emulateMedia({ forcedColors: "active" });
      const cell = page.locator("[data-grid-cell]").first();
      await expect(cell, `${kit} has no navigable cell`).toBeVisible();
      await cell.focus();
      await expect(cell).toBeFocused();

      const outline = await outlineOf(page, "[data-grid-cell]:focus");
      expect(
        outline.startsWith("none") || outline.includes(" 0px "),
        `${kit} focused cell has no outline under forced-colors (${outline})`
      ).toBe(false);
      expect(
        outline.includes("none") && !outline.includes("solid"),
        `${kit} focused cell relies on box-shadow instead of outline (${outline})`
      ).toBe(false);

      await page.keyboard.press("ArrowRight");
      const moved = page.locator("[data-grid-cell]").nth(1);
      await expect(moved).toBeFocused();
      const next = await outlineOf(page, "[data-grid-cell]:focus");
      expect(
        next.startsWith("none") || next.includes(" 0px "),
        `${kit} arrow-moved focus lost its outline (${next})`
      ).toBe(false);
    }
  });

  test("mantine and antd mark find hits and dirty cells without color alone", async ({
    page,
  }) => {
    test.setTimeout(120_000);
    for (const kit of ["mantine", "antd"] as const) {
      const kitQuery = kit === "mantine" ? "" : `?kit=${kit}`;
      await page.goto(`/${kitQuery}`);
      await page.emulateMedia({ forcedColors: "active" });
      const root = page.locator(`[data-adapter="${kit}"]`);
      const cell = root.getByText("Ada Lovelace").first();
      await expect(cell).toBeVisible({ timeout: 30_000 });
      await cell.click();
      await page.keyboard.press("Meta+f");
      const find = page.locator('[data-adapttable-part="find-input"]');
      await expect(find, `${kit} find bar did not open`).toBeVisible();
      await find.fill("Ada");
      const match = page.locator("[data-cell-match]").first();
      await expect(match, `${kit} find hit is missing`).toBeVisible();
      const matchOutline = await outlineOf(page, "[data-cell-match]");
      expect(
        matchOutline.startsWith("none") || matchOutline.includes(" 0px "),
        `${kit} find hit has no outline under forced-colors (${matchOutline})`
      ).toBe(false);

      await page.keyboard.press("Escape");
      const dirty = page.locator("[data-grid-cell]").first();
      await dirty.evaluate((node) => {
        node.setAttribute("data-dirty", "");
      });
      const dirtyOutline = await outlineOf(page, "[data-dirty]");
      expect(
        dirtyOutline.startsWith("none") || dirtyOutline.includes(" 0px "),
        `${kit} dirty cell has no outline under forced-colors (${dirtyOutline})`
      ).toBe(false);
    }
  });
});

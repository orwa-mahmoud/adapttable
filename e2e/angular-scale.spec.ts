import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's scale page: fifty thousand rows, a few dozen of
     * them in the page, and sorting over the whole set.
     */

    const PAGE = `/${kit.key}/scale/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    test("renders only the rows in view and follows the scroll", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect(part(page, "row").first()).toHaveAttribute(
        "data-row-id",
        "1"
      );
      const rendered = await part(page, "row").count();
      expect(rendered).toBeGreaterThan(5);
      expect(rendered).toBeLessThan(80);

      // The window starts with five hundred rows and grows as the reader
      // nears its end: keep scrolling to the bottom until it has.
      await expect
        .poll(async () => {
          await part(page, "scroll-box").evaluate((box) => {
            box.scrollTop = box.scrollHeight;
          });
          return Number(
            await part(page, "row").first().getAttribute("data-row-id")
          );
        })
        .toBeGreaterThan(1000);
      expect(await part(page, "row").count()).toBeLessThan(80);
    });

    test("sorts the whole dataset, not the rows drawn", async ({ page }) => {
      await page.goto(PAGE);
      await part(page, "sort-button").first().click();
      const first = part(page, "row")
        .first()
        .locator('[data-adapttable-part="cell"]')
        .first();
      // Every name in the fifty thousand starts with one of the dataset's
      // first names; ascending order puts the alphabetically first one on top.
      await expect(first).toHaveText(/^\s*A/);
      await expect(part(page, "row").first()).not.toHaveAttribute(
        "data-row-id",
        "1"
      );
    });
  });
}

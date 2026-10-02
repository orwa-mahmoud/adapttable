import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart, selectAngularOption } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's grouping page: nested groups with their totals,
     * folding, keyboard level moves, and the grouping in the URL.
     */

    const PAGE = `/${kit.key}/grouping/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    test("nests rows by Team then Status, with counts and Budget sums", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await expect(page).toHaveURL(/grp\.groupBy=team%2Cstatus/);
      await expect(part(page, "group-row").first()).toHaveText(
        /Core\s*\(6\)\s*\$414,300/
      );
      await expect(part(page, "grouping-chip")).toHaveText([/Team/, /Status/]);
    });

    test("folds a group's rows away", async ({ page }) => {
      await page.goto(PAGE);
      await expect(part(page, "row")).toHaveCount(30);
      const toggle = part(page, "group-toggle").first();
      await toggle.click();
      await expect(toggle).toHaveAttribute("aria-expanded", "false");
      await expect(part(page, "row")).toHaveCount(24);
    });

    test("moves a level with the arrow keys and announces it", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await part(page, "grouping-chip-handle").nth(1).focus();
      await page.keyboard.press("ArrowLeft");
      await expect(part(page, "grouping-chip")).toHaveText([/Status/, /Team/]);
      await expect(part(page, "grouping-announcer")).toHaveText(
        "Status moved to grouping position 1"
      );
      await expect(page).toHaveURL(/grp\.groupBy=status%2Cteam/);
    });

    test("adds a level from the panel's select", async ({ page }) => {
      await page.goto(PAGE);
      await selectAngularOption(kit, part(page, "grouping-add"), {
        value: "load",
        label: "Load",
      });
      await expect(part(page, "grouping-chip")).toHaveText([
        /Team/,
        /Status/,
        /Load/,
      ]);
    });
  });
}

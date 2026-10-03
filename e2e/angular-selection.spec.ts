import { expect, type Page, test } from "@playwright/test";

import {
  ANGULAR_KITS,
  angularPart,
  checkAngularCheckbox,
  expectAngularCheckboxMixed,
} from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's selection page: a set of ids that survives
     * paging, and bulk actions the host runs over it.
     */

    const PAGE = `/${kit.key}/selection/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    const rowBox = (page: Page, index: number) =>
      part(page, "row").nth(index).getByRole("checkbox");

    test("keeps a selection across pages and hands the whole set to a bulk action", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await checkAngularCheckbox(kit, rowBox(page, 0));
      await checkAngularCheckbox(kit, rowBox(page, 2));
      await expect(part(page, "bulk-bar")).toContainText("2 selected");

      await part(page, "page-number").nth(1).click();
      await checkAngularCheckbox(
        kit,
        part(page, "selection-header").getByRole("checkbox")
      );
      await expect(part(page, "bulk-bar")).toContainText("12 selected");

      await part(page, "page-number").nth(0).click();
      await expect(rowBox(page, 0)).toBeChecked();
      await expect(rowBox(page, 2)).toBeChecked();

      await part(page, "bulk-bar")
        .getByRole("button", { name: "Archive" })
        .click();
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "Archive: 1, 3, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20"
      );
    });

    test("offers every matching row once the page is selected", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await checkAngularCheckbox(
        kit,
        part(page, "selection-header").getByRole("checkbox")
      );
      const banner = part(page, "select-all-banner");
      await expect(banner).toContainText("10 on this page");
      await part(page, "select-all-button").click();
      await expect(part(page, "bulk-bar")).toContainText("30");
    });

    test("the mixed header checkbox selects and clears the page from the keyboard", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const header = part(page, "selection-header").getByRole("checkbox");
      await checkAngularCheckbox(kit, rowBox(page, 0));
      await expectAngularCheckboxMixed(kit, header, true);
      await expect(header).toHaveAccessibleName(/.+/);
      await header.focus();
      await expect(header).toBeFocused();
      await page.keyboard.press("Space");
      await expect(header).toBeChecked();
      await expectAngularCheckboxMixed(kit, header, false);
      await expect(
        part(page, "row").getByRole("checkbox", { checked: true })
      ).toHaveCount(10);
      await expect(part(page, "bulk-bar")).toContainText("10 selected");
      await page.keyboard.press("Space");
      await expect(header).not.toBeChecked();
      await expectAngularCheckboxMixed(kit, header, false);
      await expect(
        part(page, "row").getByRole("checkbox", { checked: true })
      ).toHaveCount(0);
      await expect(part(page, "bulk-bar")).toHaveCount(0);
    });
  });
}

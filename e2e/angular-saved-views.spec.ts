import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's saved-views page: save the table's state under
     * a name, change it, and put it back from the menu.
     */

    const PAGE = `/${kit.key}/saved-views/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    const firstPerson = (page: Page) =>
      part(page, "row")
        .first()
        .locator('[data-adapttable-part="cell"]')
        .first();

    test("saves a sorted view by name and restores it from the menu", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await page.evaluate(
        (key) => localStorage.removeItem(key),
        `adapttable-angular-${kit.key}-demo-views`
      );
      await page.reload();

      const sort = part(page, "sort-button").first();
      await sort.click();
      await sort.click();
      await expect(firstPerson(page)).toHaveText("Yann LeCun");

      await part(page, "views-button").click();
      await part(page, "views-input").fill("Z to A");
      await part(page, "views-save").click();
      const savedItems =
        kit.key === "ng-zorro"
          ? part(page, "views-panel").getByRole("button", {
              name: "Z to A",
              exact: true,
            })
          : part(page, "views-item");
      await expect(savedItems).toHaveText(["Z to A"]);
      if (kit.key === "ng-zorro") {
        await expect(
          part(page, "views-panel").getByRole("button", {
            name: /^Delete view:/,
          })
        ).toHaveCount(1);
      }

      await sort.click();
      await expect(firstPerson(page)).toHaveText("Ada Lovelace");

      await expect(part(page, "views-button")).toHaveAttribute(
        "aria-expanded",
        /^(true|false)$/
      );
      if (
        (await part(page, "views-button").getAttribute("aria-expanded")) ===
        "false"
      ) {
        await part(page, "views-button").click();
      }
      await savedItems.filter({ hasText: "Z to A" }).click();
      await expect(firstPerson(page)).toHaveText("Yann LeCun");
    });
  });
}

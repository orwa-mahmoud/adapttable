import { expect, type Page, test } from "@playwright/test";

import {
  ANGULAR_KITS,
  angularPart,
  checkAngularCheckbox,
  dismissTaigaDrawerBackdrop,
  expectAngularDrawerBackdrop,
  expectAngularSelection,
  openAngularOptions,
  selectAngularOption,
} from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's filtering page: the popover's fields and AND/OR
     * tree, chips, the URL, the drawer and header funnels.
     */

    const PAGE = `/${kit.key}/filtering/`;

    const part = (page: Page, name: string) => angularPart(kit, page, name);

    /** The Team column's text in every rendered row. */
    const teams = (page: Page) =>
      part(page, "row").evaluateAll((rows) =>
        rows.map(
          (row) =>
            row
              .querySelectorAll('[data-adapttable-part="cell"]')[1]
              ?.textContent?.trim() ?? ""
        )
      );

    test("builds each declared filter as a kit field in the popover", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await part(page, "filters-button").click();
      const popover = part(page, "filters-popover");
      await expect(popover).toBeVisible();
      const labels = popover.locator('[data-adapttable-part="filter-label"]');
      await expect(labels).toHaveText([
        "Person",
        "Team",
        "Status",
        "Budget",
        "Start",
        "Allocation count",
        "Core team",
      ]);
      await expect(
        popover.getByRole("checkbox", { name: "Core" })
      ).toBeVisible();
      await expect(
        popover.locator('[data-adapttable-part="filter-tree"]')
      ).toHaveCount(1);
    });

    test("filters rows, shows a chip and writes the URL; the chip removes itself", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await part(page, "filters-button").click();
      await checkAngularCheckbox(
        kit,
        part(page, "filters-popover").getByRole("checkbox", { name: "Core" })
      );
      await expect(part(page, "row")).toHaveCount(6);
      expect(new Set(await teams(page))).toEqual(new Set(["Core"]));
      await expect(part(page, "chip").first()).toContainText("Team: Core");
      if (kit.key === "ng-zorro") {
        await expect(part(page, "filters-count")).toHaveAttribute("title", "1");
      } else {
        await expect(part(page, "filters-count")).toHaveText("1");
      }
      await expect(page).toHaveURL(/flt\.f_team=Core/);

      await page.keyboard.press("Escape");
      await part(page, "chip-remove").first().click();
      await expect(part(page, "row")).toHaveCount(25);
      await expect(page).not.toHaveURL(/f_team/);
    });

    test("restores a filtered view from its link", async ({ page }) => {
      await page.goto(`${PAGE}?flt.f_team=Core&flt.atv=1`);
      await expect(part(page, "row")).toHaveCount(6);
      await expect(part(page, "chip").first()).toContainText("Team: Core");
    });

    test("selects a filter inside the popover without dismissing its parent", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const trigger = part(page, "filters-button");
      await trigger.click();
      const popover = part(page, "filters-popover");
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(part(page, "filters-backdrop")).toHaveCount(0);
      const core = popover.getByRole("combobox", {
        name: "Core team",
        exact: true,
      });
      await selectAngularOption(core, { value: "true", label: "True" });
      await expectAngularSelection(kit, core, { value: "true", label: "True" });
      if (kit.key === "ng-zorro") await expect(core).toBeFocused();
      await expect(popover).toBeVisible();
      await expect(part(page, "row")).toHaveCount(6);
      expect(new Set(await teams(page))).toEqual(new Set(["Core"]));
      await expect(page).toHaveURL(/flt\.f_core=true/);
      await page.keyboard.press("Escape");
      await expect(popover).toHaveCount(0);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
    });

    if (kit.key === "ng-zorro") {
      test("Escape closes the nested select before its parent without changing the filter", async ({
        page,
      }) => {
        await page.goto(PAGE);
        const trigger = part(page, "filters-button");
        await trigger.click();
        const popover = part(page, "filters-popover");
        const core = popover.getByRole("combobox", {
          name: "Core team",
          exact: true,
        });
        const options = await openAngularOptions(core);
        await expect(options).toHaveCount(3);
        await core.press("Escape");
        await expect(options).toHaveCount(0);
        await expect(core).toHaveAttribute("aria-expanded", "false");
        await expect(core).toBeFocused();
        await expect(popover).toBeVisible();
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(part(page, "row")).toHaveCount(25);
        await expect(page).not.toHaveURL(/f_core/);
        await core.press("Escape");
        await expect(popover).toHaveCount(0);
        await expect(trigger).toBeFocused();
      });
    }

    test("outside click dismisses the popover without changing its rows", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const trigger = part(page, "filters-button");
      await trigger.click();
      await expect(part(page, "filters-popover")).toBeVisible();
      await page.getByRole("heading", { level: 1 }).click();
      await expect(part(page, "filters-popover")).toHaveCount(0);
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(part(page, "row")).toHaveCount(25);
    });

    test("narrows through the AND/OR tree", async ({ page }) => {
      await page.goto(PAGE);
      await part(page, "filters-button").click();
      const tree = part(page, "filter-tree");
      await tree
        .locator('[data-adapttable-part="filter-tree-summary"]')
        .click();
      await tree.getByRole("button", { name: "Add condition" }).click();
      const condition = tree.locator(
        '[data-adapttable-part="filter-tree-condition"]'
      );
      await condition
        .locator('[data-adapttable-part="filter-input"]')
        .fill("Grace");
      await expect(part(page, "row")).toHaveCount(1);
      await expect(part(page, "row").first()).toContainText("Grace Hopper");
      await expect(part(page, "chip").first()).toContainText("Grace");
    });

    test("opens a drawer that holds focus and closes on Escape", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await page.getByRole("button", { name: "Drawer", exact: true }).click();
      await part(page, "filters-button").click();
      const drawer = part(page, "filters-panel");
      await expect(drawer).toBeVisible();
      await expectAngularDrawerBackdrop(kit, page, drawer);
      await expect
        .poll(() =>
          drawer.evaluate((panel) => panel.contains(document.activeElement))
        )
        .toBe(true);
      await page.keyboard.press("Escape");
      await expect(drawer).toHaveCount(0);
      await expect(part(page, "filters-button")).toBeFocused();
      if (kit.key === "taiga-ui") {
        await part(page, "filters-button").click();
        await expect(drawer).toBeVisible();
        await expectAngularDrawerBackdrop(kit, page, drawer);
        await drawer
          .getByRole("heading", { name: "Filters", exact: true })
          .click();
        await expect(drawer).toBeVisible();
        await dismissTaigaDrawerBackdrop(page, drawer);
        await expect(drawer).toHaveCount(0);
        await expect(part(page, "filters-button")).toBeFocused();
      }
    });

    test("filters one column from its header funnel", async ({ page }) => {
      await page.goto(PAGE);
      await page.getByRole("button", { name: "Header", exact: true }).click();
      const funnels = part(page, "filter-header-trigger");
      // Person, Team, Status, Timeline, Budget, Load — every column with a filter.
      await expect(funnels).toHaveCount(6);
      await funnels.nth(1).click();
      await checkAngularCheckbox(
        kit,
        page.getByRole("checkbox", { name: "Core" })
      );
      await expect(part(page, "row")).toHaveCount(6);
      expect(new Set(await teams(page))).toEqual(new Set(["Core"]));
    });
  });
}

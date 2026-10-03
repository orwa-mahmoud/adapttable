import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /**
     * Each Angular kit's rows page: pin a row from its 3-dot menu, keep
     * it through a reload, and watch it stay put while the rest scroll.
     */

    const PAGE = `/${kit.key}/rows/`;

    const demo = (page: Page) => page.locator(".mx-demo");
    const row = (page: Page, id: string) =>
      demo(page).locator(`tbody tr[data-row-id="${id}"]`);

    /** Choose an entry from a row's 3-dot menu. */
    async function choose(page: Page, id: string, entry: string) {
      const target = row(page, id);
      const trigger = target.locator(
        '[data-adapttable-part="row-actions-trigger"]'
      );
      await trigger.click();
      const nativeDetails = ["unstyled", "aria"].includes(kit.key);
      let menu = nativeDetails
        ? target.locator(
            'details[data-adapttable-part="row-actions-menu"][open]'
          )
        : page.locator('[data-adapttable-part="row-actions-menu"]:visible');
      if (
        [
          "material",
          "ng-bootstrap",
          "ngx-bootstrap",
          "angular-cdk",
          "spartan",
          "taiga-ui",
        ].includes(kit.key)
      ) {
        await expect(trigger).toHaveAttribute("aria-expanded", "true");
        await expect(trigger).toHaveAttribute("aria-controls", /\S+/);
        const menuId = (await trigger.getAttribute("aria-controls"))!;
        const role = ["spartan", "taiga-ui"].includes(kit.key)
          ? "dialog"
          : "menu";
        menu = page
          .getByRole(role)
          .and(page.locator(`[id=${JSON.stringify(menuId)}]`));
        if (role === "dialog")
          await expect(menu).toHaveAccessibleName("Row actions");
        await expect(menu).toBeVisible();
      }
      const action = menu.locator('[data-adapttable-part="action-button"]');
      await action
        .and(
          page.getByRole(
            ["unstyled", "spartan", "taiga-ui"].includes(kit.key)
              ? "button"
              : "menuitem",
            {
              name: entry,
              exact: true,
            }
          )
        )
        .click();
      if (nativeDetails) {
        // A closed details host (and its summary) stays visible. Its open
        // state, not the wrapper's visibility, proves dismissal after a row
        // moves or is removed by the host action.
        await expect(
          demo(page).locator(
            'details[data-adapttable-part="row-actions-menu"][open]'
          )
        ).toHaveCount(0);
      } else {
        await expect(menu).toBeHidden();
      }
    }

    test("pins a row from its menu and keeps it through a reload", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await choose(page, "5", "Pin to top");
      const pinned = row(page, "5");
      await expect(pinned).toHaveAttribute(
        "data-adapttable-part",
        "pinned-top"
      );
      await expect(demo(page).locator("tbody tr").first()).toHaveAttribute(
        "data-row-id",
        "5"
      );
      await expect(page).toHaveURL(/rowPin/);

      await page.reload();
      await expect(row(page, "5")).toHaveAttribute(
        "data-adapttable-part",
        "pinned-top"
      );
    });

    test("keeps a top pin in view while the rest scroll", async ({ page }) => {
      await page.goto(PAGE);
      await choose(page, "5", "Pin to top");
      await expect(row(page, "5")).toHaveAttribute(
        "data-adapttable-part",
        "pinned-top"
      );
      const box = demo(page).locator('[data-adapttable-part="scroll-box"]');
      await box.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
      });
      await expect
        .poll(() => box.evaluate((element) => element.scrollTop))
        .toBeGreaterThan(0);
      // Sticky rows attach to the scroll viewport inside its border.
      const boxTop = await box.evaluate(
        (element) => element.getBoundingClientRect().top + element.clientTop
      );
      await expect
        .poll(async () => Math.round((await row(page, "5").boundingBox())!.y))
        .toBe(Math.round(boxTop));
    });

    test("writes a team that runs down the page as one cell", async ({
      page,
    }) => {
      await page.goto(PAGE);
      const merged = demo(page).locator(
        'tbody [data-adapttable-part="cell"][data-cell-span]'
      );
      await expect(merged.first()).toBeVisible();
      const span = Number(await merged.first().getAttribute("rowspan"));
      expect(span).toBeGreaterThan(1);
    });

    test("pins to the bottom, and unpins", async ({ page }) => {
      await page.goto(PAGE);
      await choose(page, "2", "Pin to bottom");
      await expect(row(page, "2")).toHaveAttribute(
        "data-adapttable-part",
        "pinned-bottom"
      );
      await expect(demo(page).locator("tbody tr").last()).toHaveAttribute(
        "data-row-id",
        "2"
      );
      await choose(page, "2", "Unpin row");
      await expect(row(page, "2")).toHaveAttribute(
        "data-adapttable-part",
        "row"
      );
    });

    test("asks the host to add, duplicate and confirm deletion", async ({
      page,
    }) => {
      await page.goto(PAGE);
      await demo(page).locator('[data-adapttable-part="add-row"]').click();
      await expect(row(page, "31")).toContainText("New person");
      await choose(page, "31", "Duplicate row");
      await expect(row(page, "32")).toContainText("New person");
      page.once("dialog", (dialog) => dialog.dismiss());
      await choose(page, "31", "Delete row");
      await expect(row(page, "31")).toContainText("New person");
      page.once("dialog", (dialog) => dialog.accept());
      await choose(page, "31", "Delete row");
      await expect(row(page, "31")).toHaveCount(0);
      await expect(row(page, "32")).toContainText("New person");
    });
  });
}

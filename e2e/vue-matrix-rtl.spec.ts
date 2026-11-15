/** Native overlays must retain their viewport and keyboard owner in Arabic dark mode. */
import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src/index";

const part = (page: Page, name: string) =>
  page.locator(`[data-adapttable-part="${name}"]`);
const copy = { person: "الشخص", team: "الفريق" };
/** The filtering page's first consultant, in Arabic. */
const arabicName = "بريا نير";
async function open(page: Page, trigger: Locator) {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await trigger.evaluate((element) =>
    window.scrollBy({
      top: element.getBoundingClientRect().top - 300,
      behavior: "instant",
    })
  );
  await trigger.press("Enter");
}
async function bounds(surface: Locator, width: number) {
  await expect
    .poll(async () => {
      const box = await surface.boundingBox();
      return (
        box !== null &&
        box.x >= 0 &&
        box.x + box.width <= width + 1 &&
        box.y >= 0 &&
        box.y + box.height <= 901
      );
    })
    .toBe(true);
}
async function presentation(page: Page, width: number) {
  await page.setViewportSize({ width, height: 900 });
  await page.addInitScript(() =>
    localStorage.setItem("adapttable-demo-theme", "dark")
  );
}

for (const kit of builtAdapters("vue")) {
  for (const width of [1440, 390]) {
    test(`${kit.key}/columns: ${width}px Arabic dark rename, reorder and repeated native focus`, async ({
      page,
    }, info) => {
      await presentation(page, width);
      await page.goto(`/vue/${pathOf(kit)}/columns/?locale=ar`);
      await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
      await expect(
        page.locator('.mx-demo [data-adapttable-part="root"]')
      ).toHaveAttribute("dir", "rtl");
      const trigger = part(page, "column-menu-button");
      const panel = part(page, "column-menu-panel");
      await open(page, trigger);
      const viewport =
        kit.key === "quasar"
          ? panel
              .locator(
                "xpath=ancestor::*[contains(concat(' ', normalize-space(@class), ' '), ' q-menu ')]"
              )
              .first()
          : panel;
      await bounds(viewport, width);
      const person = panel
        .locator('[data-adapttable-part="column-menu-item"]')
        .first();
      await person
        .locator('[data-adapttable-part="column-menu-more"]')
        .press("Enter");
      await person
        .getByRole("button", {
          name: getLabels("ar").renameColumn,
          exact: true,
        })
        .press("Enter");
      const editor = panel
        .locator('[data-adapttable-part="column-rename-form"]')
        .getByRole("textbox");
      await editor.fill("اسم الشخص");
      await editor.press("Enter");
      await expect(
        panel.locator('[data-adapttable-part="column-menu-label"]').first()
      ).toHaveText("اسم الشخص");
      const team = panel
        .locator('[data-adapttable-part="column-menu-item"]')
        .filter({
          has: page
            .locator('[data-adapttable-part="column-menu-label"]')
            .filter({ hasText: copy.team }),
        });
      const grip = team.locator('[data-adapttable-part="column-menu-grip"]');
      // Team moves up past Role; Person stays first, pinned to the start.
      await grip.press("ArrowUp");
      await expect(grip).toBeFocused();
      await expect(
        panel.locator('[data-adapttable-part="column-menu-item"]').nth(1)
      ).toContainText(copy.team);
      await page.screenshot({
        path: info.outputPath(`${kit.key}-${width}-rtl-columns.png`),
        animations: "disabled",
      });
      await grip.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      for (let cycle = 0; cycle < 2; cycle++) {
        await open(page, trigger);
        await expect(panel).toBeVisible();
        await bounds(viewport, width);
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
      }
    });
    test(`${kit.key}/filtering: ${width}px Arabic dark portals repeat native Done and Escape`, async ({
      page,
    }, info) => {
      await presentation(page, width);
      await page.goto(`/vue/${pathOf(kit)}/filtering/?locale=ar`);
      const trigger = part(page, "filters-button");
      const surface = part(page, "filters-popover");
      for (let cycle = 0; cycle < 2; cycle++) {
        await open(page, trigger);
        await expect(surface).toBeVisible();
        await bounds(surface, width);
        const person = surface.getByRole("textbox", {
          name: copy.person,
          exact: true,
        });
        await person.fill(arabicName);
        await expect(
          page.locator(
            `.mx-demo [data-adapttable-part="${width === 390 ? "card" : "row"}"]`
          )
        ).toHaveCount(1);
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${width}-rtl-filter-${cycle}.png`),
          animations: "disabled",
        });
        await part(page, "filters-done").press("Enter");
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
        await open(page, trigger);
        await expect(person).toHaveValue(arabicName);
        await person.fill("");
        await person.press("Escape");
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
      }
    });
  }
}

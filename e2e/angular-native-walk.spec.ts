/** Expanded native surfaces stay usable in the matrix's localized layouts. */
import { expect, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  for (const locale of ["en", "ar"] as const) {
    for (const width of [390, 1280]) {
      test(`${kit.key}: ${locale} saved views restore search by keyboard at ${width}px`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          locale === "ar" ? "dark" : "light"
        );
        await page.goto(`/${kit.key}/saved-views/?locale=${locale}&live=off`);
        const root = page
          .locator('.mx-demo [data-adapttable-part="root"]')
          .first();
        const search = root.getByRole("searchbox");
        const query = locale === "ar" ? "آدا" : "Ada";
        const row = root.locator(
          `[data-adapttable-part="${width === 390 ? "card" : "row"}"]`
        );
        await search.fill(query);
        await expect(row).toHaveCount(1);
        const trigger = angularPart(kit, page, "views-button", root);
        await trigger.evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "center" })
        );
        await trigger.focus();
        await trigger.press("Enter");
        const panel = angularPart(kit, page, "views-panel");
        await expect(panel).toBeVisible();
        const input = angularPart(kit, page, "views-input");
        expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(120);
        await input.fill("Evaluator view");
        const save = angularPart(kit, page, "views-save");
        await save.focus();
        await save.press("Enter");
        const view = panel.getByRole("button", {
          name: "Evaluator view",
          exact: true,
        });
        await expect(view).toBeVisible();
        await view.click({ trial: true });
        const bounds = await panel.boundingBox();
        expect(bounds!.x).toBeGreaterThanOrEqual(0);
        expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
        const path = info.outputPath(`${kit.key}-${locale}-${width}-views.png`);
        await page.screenshot({ path, animations: "disabled" });
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(trigger).toHaveAttribute("aria-expanded", "false");
        await search.fill("");
        await expect(row).not.toHaveCount(1);
        await trigger.press("Enter");
        await view.focus();
        await view.press("Enter");
        await expect(search).toHaveValue(query);
        await expect(row).toHaveCount(1);
      });
    }

    test(`${kit.key}: ${locale} columns panel keeps each native action reachable`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1280, height: 844 });
      await page.addInitScript(
        (theme) => localStorage.setItem("adapttable-demo-theme", theme),
        locale === "ar" ? "dark" : "light"
      );
      await page.goto(`/${kit.key}/columns/?locale=${locale}&live=off`);
      const trigger = angularPart(kit, page, "column-menu-button");
      await trigger.evaluate((node) =>
        node.scrollIntoView({ behavior: "instant", block: "center" })
      );
      await trigger.focus();
      await trigger.press("Enter");
      const panel = angularPart(kit, page, "column-menu-panel");
      await expect(panel).toBeVisible();
      const controls = panel.locator(
        "button:visible, input:visible, select:visible"
      );
      expect(await controls.count()).toBeGreaterThan(7);
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const rect = await control.boundingBox();
        expect(rect).not.toBeNull();
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(1281);
        expect(rect!.y).toBeGreaterThanOrEqual(0);
        expect(rect!.y + rect!.height).toBeLessThanOrEqual(845);
      }
      const path = info.outputPath(`${kit.key}-${locale}-1280-columns.png`);
      await page.screenshot({ path, animations: "disabled" });
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await trigger.press("Enter");
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
    });
  }
}

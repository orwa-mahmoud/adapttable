/** Phone editors must fit their card and preserve the native keyboard flow. */
import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import people from "../apps/showcase/src/people.json" with { type: "json" };

for (const kit of builtAdapters("vue")) {
  for (const { width, locale, theme } of [
    { width: 1440, locale: "en", theme: "light" },
    { width: 390, locale: "en", theme: "light" },
    { width: 1440, locale: "ar", theme: "dark" },
    { width: 390, locale: "ar", theme: "dark" },
  ]) {
    test(`${kit.key}: ${width}px ${locale} ${theme} editing saves, reverses, resolves conflicts and rolls back`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.addInitScript(
        (value) => localStorage.setItem("adapttable-demo-theme", value),
        theme
      );
      await page.goto(`/vue/${pathOf(kit)}/editing/?locale=${locale}`);
      const row = page
        .locator(
          `.mx-demo [data-adapttable-part="${width === 390 ? "card" : "row"}"]`
        )
        .first();
      const name = row
        .locator(
          '[data-column-key="person"] [data-adapttable-part="edit-cell-activate"]'
        )
        .first();
      const editor = row.getByRole("textbox");
      const ada = people[0];
      if (!ada) throw new Error("Missing Ada fixture");
      const originalName = locale === "ar" ? ada.nameAr : ada.name;
      const begin = async (draft: string) => {
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await name.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 360,
            behavior: "instant",
          })
        );
        await name.focus();
        await name.press("Enter");
        await expect(editor).toBeFocused();
        await editor.fill(draft);
      };
      await begin("Ada Saved");
      await editor.press("Enter");
      await expect(name).toHaveText("Ada Saved");
      await expect(name).toBeFocused();
      await page.locator('[data-adapttable-part="undo-button"]').click();
      await expect(name).toHaveText(originalName);
      await page.locator('[data-adapttable-part="redo-button"]').click();
      await expect(name).toHaveText("Ada Saved");

      await begin("Ada Draft");
      await page
        .getByRole("button", { name: "Receive live name update", exact: true })
        .click();
      await expect(
        row.locator('[data-adapttable-part="edit-cell-conflict"]')
      ).toBeVisible();
      await expect(editor).toHaveValue("Ada Draft");
      await row
        .locator('[data-adapttable-part="edit-cell-take-theirs"]')
        .click();
      await expect(editor).toHaveValue("Ada Live");
      await editor.press("Enter");
      await expect(name).toHaveText("Ada Live");
      await page
        .getByRole("button", { name: "Reject next save", exact: true })
        .click();
      await begin("Ada Rejected");
      await editor.press("Enter");
      await expect(
        row.locator('[data-adapttable-part="edit-cell-save-error"]')
      ).toContainText("The demo server rejected this change");
      await row.locator('[data-adapttable-part="edit-cell-rollback"]').click();
      await expect(name).toHaveText("Ada Live");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "Restored Ada Live after the rejected save."
      );

      await begin("Detached draft");
      await page
        .getByRole("button", { name: "Allow editing", exact: true })
        .click();
      await expect(editor).toHaveCount(0);
      await expect(
        row.locator('[data-adapttable-part="edit-cell-activate"]')
      ).toHaveCount(0);
      await expect(row).toContainText("Ada Live");
      await page
        .getByRole("button", { name: "Allow editing", exact: true })
        .click();
      await expect(name).toHaveText("Ada Live");
      await begin("Cancelled second draft");
      await editor.press("Escape");
      await expect(name).toHaveText("Ada Live");
    });
  }
  for (const locale of ["en", "ar"]) {
    test(`${kit.key}: ${locale} phone editable values fit and cancel a draft`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`/vue/${pathOf(kit)}/editing/?locale=${locale}`);
      const card = page
        .locator('.mx-demo [data-adapttable-part="card"]')
        .first();
      await expect(card).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const bounds = (await card.boundingBox())!;
      const buttons = card.locator(
        '[data-adapttable-part="edit-cell-activate"]'
      );
      expect(await buttons.count()).toBeGreaterThan(3);
      for (const button of await buttons.all()) {
        const box = (await button.boundingBox())!;
        expect(box.x).toBeGreaterThanOrEqual(bounds.x);
        expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      }
      const activate = buttons.first();
      const name = await activate.textContent();
      await activate.focus();
      await activate.press("Enter");
      const editor = card.getByRole("textbox");
      await expect(editor).toBeFocused();
      await editor.fill("Cancelled draft");
      await editor.press("Escape");
      await expect(activate).toHaveText(name!);
      await expect(activate).toBeFocused();
    });
  }
}

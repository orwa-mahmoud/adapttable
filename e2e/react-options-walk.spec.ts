/** Every React kit renders the Feature Lab recipes with its native controls. */
import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { configureFeatureLab } from "./feature-lab";

for (const kit of builtAdapters("react")) {
  for (const locale of ["en", "ar"] as const) {
    for (const width of [390, 1440]) {
      test(`${kit.key}: ${locale} recipes at ${width}px retain readable native previews`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          locale === "ar" ? "dark" : "light"
        );
        await page.goto("/all-options/?live=off");
        if (kit.key !== "mantine")
          await page.getByTestId(`adapter-${kit.key}`).click();
        if (locale === "ar")
          await configureFeatureLab(page, "locale", "العربية");
        const recipes = page.getByRole("group", { name: "Feature recipes" });
        for (const recipe of [
          "Baseline",
          "Filters",
          "Structure",
          "Editing",
          "Rows",
        ]) {
          await recipes
            .getByRole("button", { name: new RegExp(`^${recipe}`) })
            .click();
          const root = page
            .locator('.lab-preview [data-adapttable-part="root"]')
            .first();
          await expect(root).toBeVisible();
          await expect(root).toHaveCSS(
            "direction",
            locale === "ar" ? "rtl" : "ltr"
          );
          await expect(
            root
              .locator(
                '[data-adapttable-part="row"][data-row-id], [data-adapttable-part="card"]'
              )
              .first()
          ).toBeVisible();
          await page.evaluate(() => document.fonts.ready.then(() => undefined));
          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth
            )
          ).toBeLessThanOrEqual(1);
          await root.evaluate((node) =>
            window.scrollBy({
              top: node.getBoundingClientRect().top - 90,
              behavior: "instant",
            })
          );
          await page.screenshot({
            path: info.outputPath(
              `${kit.key}-${locale}-${width}-${recipe.toLowerCase()}.png`
            ),
            animations: "disabled",
          });
        }
        await page.getByRole("button", { name: "Configure options" }).click();
        const dialog = page.getByRole("dialog", {
          name: "Configure Feature Lab",
        });
        await expect(dialog).toBeVisible();
        await expect(dialog).toHaveCSS(
          "transform",
          /^(?:none|matrix\(1, 0, 0, 1, 0, 0\))$/
        );
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${locale}-${width}-options.png`),
          animations: "disabled",
        });
        await dialog.getByRole("button", { name: "Close options" }).click();
        await expect(dialog).toBeHidden();
      });
    }
  }
}

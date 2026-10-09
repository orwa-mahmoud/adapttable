/** Phone cards keep their fields inside the card when row appearance is armed. */
import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { configureFeatureLab } from "./feature-lab";

for (const kit of builtAdapters("react")) {
  for (const locale of ["en", "ar"]) {
    test(`${kit.key}: ${locale} styled phone cards contain their row content`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.addInitScript(
        (theme) => localStorage.setItem("adapttable-demo-theme", theme),
        locale === "ar" ? "dark" : "light"
      );
      await page.goto("/all-options/?live=off");
      if (kit.key !== "mantine")
        await page.getByTestId(`adapter-${kit.key}`).click();
      if (locale === "ar") await configureFeatureLab(page, "locale", "العربية");
      await page
        .getByRole("group", { name: "Feature recipes" })
        .getByRole("button", { name: /^Rows/ })
        .click();
      const root = page.locator('.lab-preview [data-adapttable-part="root"]');
      const cards = root.locator('[data-adapttable-part="card"]');
      await expect(cards.first()).toBeVisible();
      await expect(
        cards.first().locator('[data-adapttable-part="card-value"]').first()
      ).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await cards
        .first()
        .evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "start" })
        );
      await page.screenshot({
        path: info.outputPath(`${kit.key}-${locale}-styled-cards.png`),
        animations: "disabled",
      });
      const clipped = await cards.evaluateAll((nodes) =>
        nodes.flatMap((card, index) => {
          const outer = card.getBoundingClientRect();
          return [
            ...card.querySelectorAll('[data-adapttable-part="card-value"]'),
          ].flatMap((field) => {
            const value = field.getBoundingClientRect();
            return value.top < outer.top - 1 || value.bottom > outer.bottom + 1
              ? [`card ${index}: ${field.textContent}`]
              : [];
          });
        })
      );
      expect(clipped).toEqual([]);
    });
  }
}

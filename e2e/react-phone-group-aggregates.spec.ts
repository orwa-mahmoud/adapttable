/** Group cards retain the host's column formatting and captions. */
import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { configureFeatureLab } from "./feature-lab";

for (const kit of builtAdapters("react")) {
  for (const locale of ["en", "ar"]) {
    test(`${kit.key}: ${locale} phone structure recipe shows formatted group budgets`, async ({
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
        .getByRole("button", { name: /^Structure/ })
        .click();
      const card = page
        .locator('.lab-preview [data-adapttable-part="group-card"]')
        .first();
      const budget = card.locator(
        '[data-adapttable-part="group-aggregate"][data-column="budget"]'
      );
      await expect(budget).toBeVisible();
      await expect(budget).toContainText("$");
      await expect(card).toContainText(
        locale === "ar" ? "الميزانية" : "Budget"
      );
      await card.evaluate((node) =>
        node.scrollIntoView({ behavior: "instant", block: "center" })
      );
      await page.screenshot({
        path: info.outputPath(`${kit.key}-${locale}-phone-subtotal.png`),
        animations: "disabled",
      });
    });
  }
}

for (const locale of ["en", "ar"]) {
  for (const slug of ["grouping", "aggregation"]) {
    test(`antd ${slug}: ${locale} phone budget subtotal has its currency and caption`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 390, height: 900 });
      await page.goto(`/antd/${slug}/?locale=${locale}&live=off`);
      const card = page.locator('[data-adapttable-part="group-card"]').first();
      const budget = card.locator(
        '[data-adapttable-part="group-aggregate"][data-column="budget"]'
      );
      await expect(budget).toBeVisible();
      await expect(budget).toContainText("$");
      await expect(card).toContainText(
        locale === "ar" ? "الميزانية" : "Budget"
      );
      await card.evaluate((node) =>
        node.scrollIntoView({ behavior: "instant", block: "center" })
      );
      await page.screenshot({
        path: info.outputPath(`antd-${slug}-${locale}-phone-subtotal.png`),
        animations: "disabled",
      });
    });
  }
}

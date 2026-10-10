/** Compact native rename controls leave the header caption readable. */
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"] as const) {
  for (const width of [1280, 1440]) {
    test(`Chakra ${locale}: header rename remains compact and keyboard usable at ${width}px`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.addInitScript(
        (theme) => localStorage.setItem("adapttable-demo-theme", theme),
        locale === "ar" ? "dark" : "light"
      );
      await page.goto("/");
      await page.getByTestId("adapter-chakra").click();
      if (locale === "ar") {
        await page
          .getByRole("group", { name: "locale", exact: true })
          .getByRole("button", { name: "العربية", exact: true })
          .click();
      }
      const root = page.locator(
        '#demo [data-adapter="chakra"] [data-adapttable-part="root"]'
      );
      const trigger = root
        .locator('[data-adapttable-part="header-rename-button"]')
        .first();
      await expect(trigger).toBeVisible();
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      await trigger.evaluate((node) =>
        node.scrollIntoView({ behavior: "instant", block: "center" })
      );
      expect((await trigger.boundingBox())!.width).toBeLessThanOrEqual(32);
      await expect(trigger.locator("svg")).toHaveCount(1);
      await expect(trigger).toHaveText("");
      await expect(trigger).toHaveAccessibleName(
        locale === "ar" ? /إعادة تسمية العمود:/ : /Rename column:/
      );
      const path = info.outputPath(`chakra-${locale}-${width}-header.png`);
      await page.screenshot({ path, animations: "disabled" });
      await trigger.focus();
      await trigger.press("Enter");
      const input = root.locator(
        '[data-adapttable-part="header-rename-input"]'
      );
      await expect(input).toBeFocused();
      await input.press("Escape");
      await expect(trigger).toBeFocused();
      await trigger.press("Enter");
      await input.fill(locale === "ar" ? "جهة الاتصال" : "Primary contact");
      await input.press("Enter");
      await expect(trigger).toBeFocused();
      await expect(root.locator('th[data-column-key="person"]')).toContainText(
        locale === "ar" ? "جهة الاتصال" : "Primary contact"
      );
    });
  }
}

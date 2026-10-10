/** Standalone Reka controls use the same supplied palette as their table. */
import { expect, test } from "@playwright/test";

for (const slug of ["pivot", "ai"]) {
  test(`reka-ui/${slug}: standalone controls follow light and dark palette changes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto(`/vue/reka-ui/${slug}/?locale=en`);
    const control =
      slug === "pivot"
        ? page
            .locator('.mx-demo [data-zone="rows"]')
            .getByRole("combobox", { name: "Add field", exact: true })
        : page.locator('[data-adapttable-part="assistant-launcher"]');
    const table = page.locator('.mx-demo [data-adapttable-part="root"]');
    await expect(control).toBeVisible();
    for (const mode of ["light", "dark", "light"]) {
      if ((await page.locator("html").getAttribute("data-theme")) !== mode) {
        await page
          .getByRole("button", { name: "Toggle dark mode", exact: true })
          .click();
      }
      await expect(page.locator("html")).toHaveAttribute("data-theme", mode);
      const palette = await table.evaluate((element) => ({
        background: getComputedStyle(element).backgroundColor,
        text: getComputedStyle(element).color,
      }));
      await expect
        .poll(() =>
          control.evaluate((element) => ({
            background: getComputedStyle(element).backgroundColor,
            text: getComputedStyle(element).color,
          }))
        )
        .toEqual(palette);
    }
  });
}

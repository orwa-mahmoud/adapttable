/** Native aggregation choices keep their complete localized captions. */
import { expect, test } from "@playwright/test";

for (const locale of ["en", "ar"]) {
  for (const slug of ["grouping", "aggregation"]) {
    for (const width of [390, 1280]) {
      test(`antd ${slug}: ${locale} aggregation caption at ${width}px`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.goto(`/antd/${slug}/?locale=${locale}&live=off`);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const select = page
          .locator('[data-adapttable-part="grouping-aggregation-operation"]')
          .first();
        await expect(select).toBeVisible();
        await select.evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "center" })
        );
        await page.screenshot({
          path: info.outputPath(`antd-${slug}-${locale}-${width}.png`),
          animations: "disabled",
        });
        const caption = select.locator(".ant-select-content");
        await expect(caption).toHaveText(locale === "ar" ? "المجموع" : "Sum");
        const overflow = await caption.evaluate(
          (node) => node.scrollWidth - node.clientWidth
        );
        expect(overflow).toBeLessThanOrEqual(1);
        await select.getByRole("combobox").focus();
        await page.keyboard.press("ArrowDown");
        await expect(select.getByRole("combobox")).toHaveAttribute(
          "aria-expanded",
          "true"
        );
        await expect(page.locator(".ant-select-dropdown")).toBeVisible();
        await page.keyboard.press("Escape");
      });
    }
  }
}

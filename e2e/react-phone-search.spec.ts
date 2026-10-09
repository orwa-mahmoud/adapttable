/** The native search input remains usable beside wrapped toolbar controls. */
import { expect, test } from "@playwright/test";

for (const kit of ["shadcn", "tailwind"]) {
  for (const locale of ["en", "ar"]) {
    for (const slug of ["", "filtering/"]) {
      test(`${kit}/${slug || "entry"}: ${locale} phone search has room to type`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          locale === "ar" ? "dark" : "light"
        );
        await page.goto(`/${kit}/${slug}?locale=${locale}&live=off`);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const root = page
          .locator('.mx-demo [data-adapttable-part="root"]')
          .first();
        const search = root.getByRole("searchbox");
        await search.evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "center" })
        );
        await page.screenshot({
          path: info.outputPath(
            `${kit}-${locale}-${slug ? "filtering" : "entry"}-search.png`
          ),
          animations: "disabled",
        });
        expect((await search.boundingBox())!.width).toBeGreaterThanOrEqual(140);
        await search.focus();
        await search.pressSequentially(locale === "ar" ? "بريا" : "Priya");
        await expect(root.locator('[data-adapttable-part="card"]')).toHaveCount(
          1
        );
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
      });
    }
  }
}

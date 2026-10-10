import { expect, test } from "@playwright/test";

for (const slug of ["grouping", "aggregation", "ai"]) {
  for (const locale of ["en", "ar"]) {
    for (const width of [390, 1440]) {
      test(`taiga-ui: ${slug} selected label fits at ${locale}/${width}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          locale === "ar" ? "dark" : "light"
        );
        await page.goto(`/taiga-ui/${slug}/?locale=${locale}&live=off`);
        await page.evaluate(() => document.fonts.ready);
        const select = page
          .locator(
            `[data-adapttable-part="${slug === "ai" ? "demo-approval-surface" : "grouping-aggregation-operation"}"]`
          )
          .first();
        const sumLabel = locale === "ar" ? "المجموع" : "Sum";
        await expect(select).toHaveValue(
          slug === "ai" ? "Assistant" : sumLabel
        );
        const sizing = await select.evaluate((node) => {
          const input = node as HTMLInputElement;
          const style = getComputedStyle(input);
          const context = document.createElement("canvas").getContext("2d")!;
          context.font = style.font;
          return {
            available:
              input.clientWidth -
              Number.parseFloat(style.paddingInlineStart) -
              Number.parseFloat(style.paddingInlineEnd),
            needed: context.measureText(input.value).width,
          };
        });
        expect(sizing.available).toBeGreaterThanOrEqual(sizing.needed);
        await select.evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "center" })
        );
        await select.focus();
        const path = info.outputPath(
          `taiga-ui-${slug}-${locale}-${width}-label.png`
        );
        await page.screenshot({ path, animations: "disabled" });
      });
    }
  }
}

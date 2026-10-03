/** Complete Angular docs inventory: visual evidence and framework-safe links. */
import { expect, test } from "@playwright/test";

import { ANGULAR_DOCS } from "../../scripts/angular-docs.mjs";

const DOCS_URL = "http://localhost:4323";
test.use({ baseURL: DOCS_URL });
for (const source of ANGULAR_DOCS) {
  const route = `/${source.replace(/\.md$/, "")}/`;
  test(`${route}: Angular documentation navigation and visual evidence`, async ({
    page,
  }, info) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(
      page.locator("[data-framework-select]:visible").first()
    ).toHaveValue("angular");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(
      page.locator('#starlight__sidebar a[href^="/react/"]:visible')
    ).toHaveCount(0);
    await expect(page.locator('main a[href^="/react/"]:visible')).toHaveCount(
      0
    );
    expect(errors).toEqual([]);
    await info.attach("desktop", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    await page.setViewportSize({ width: 320, height: 844 });
    const width = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
    await info.attach("phone", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  });
}

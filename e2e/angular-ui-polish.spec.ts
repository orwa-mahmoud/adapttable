/** Responsive loading, native control alignment and opaque pinned-cell regressions. */
import { expect, test } from "@playwright/test";

import { builtAdapters, featuresOf } from "../apps/showcase/matrix.mjs";

for (const kit of builtAdapters("angular")) {
  for (const suffix of [
    "",
    ...featuresOf(kit).map((feature) => feature.slug),
  ]) {
    const route = `/${kit.key}/${suffix ? suffix + "/" : ""}`;
    test(`${route}: pre-mount copy fits a 320px viewport`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 320, height: 844 },
      });
      try {
        const page = await context.newPage();
        await page.goto(new URL(route, baseURL).href, {
          waitUntil: "domcontentloaded",
        });
        await expect(page.locator(".at-fallback")).toBeVisible();
        const width = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
      } finally {
        await context.close();
      }
    });
  }
}

test("NG-ZORRO search prefix stays in its native input group", async ({
  page,
}) => {
  await page.goto("/ng-zorro/filtering/");
  const group = page
    .locator('nz-input-wrapper[data-adapttable-part="search-field"]')
    .first();
  await expect(group).toBeVisible();
  const icon = await group
    .locator('[data-adapttable-part="search-icon"]')
    .boundingBox();
  const input = await group
    .locator('input[data-adapttable-part="search"]')
    .boundingBox();
  expect(icon).not.toBeNull();
  expect(input).not.toBeNull();
  expect(
    Math.abs(icon!.y + icon!.height / 2 - input!.y - input!.height / 2)
  ).toBeLessThan(3);
  await group.getByRole("searchbox").fill("No matching person");
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(0);
  await group.getByRole("searchbox").clear();
  await expect(
    page.locator('[data-adapttable-part="row"]').first()
  ).toBeVisible();
});

test("NG-ZORRO pinned body cells paint over horizontally scrolling text", async ({
  page,
}) => {
  await page.goto("/ng-zorro/columns/");
  const pinned = page
    .locator('td[data-adapttable-part="cell"][data-pinned]')
    .first();
  await expect(pinned).toBeVisible();
  const color = await pinned.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  );
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
  expect(color).not.toBe("transparent");
  const before = await pinned.boundingBox();
  await page
    .locator('[data-adapttable-part="scroll-box"]')
    .first()
    .evaluate((element) => {
      element.scrollLeft = 160;
    });
  const after = await pinned.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(before!.x - after!.x)).toBeLessThanOrEqual(1);
  await expect(pinned).toContainText("Ada Lovelace");
});

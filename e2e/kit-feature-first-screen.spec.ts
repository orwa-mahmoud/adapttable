import { expect, test } from "@playwright/test";

import { adapterByKey } from "../apps/showcase/matrix.mjs";

/**
 * A kit feature page puts its live table on the first screen, lets the page
 * scroll over its code, and copies the kit's install command — in every
 * framework.
 */
const PAGES = [
  { kit: "mui", path: "/mui/nested-tables/" },
  { kit: "material", path: "/material/nested-tables/" },
  { kit: "element-plus", path: "/vue/element-plus/nested-tables/" },
];

for (const { kit, path } of PAGES) {
  test(`${kit}: the live table is on the first screen`, async ({ page }) => {
    await page.goto(path);
    const table = page.locator('[data-adapttable-part="root"]').first();
    await table.waitFor();
    const box = await table.boundingBox();
    const height = page.viewportSize()?.height ?? 0;
    expect(box?.y ?? Infinity).toBeLessThan(height);
  });

  test(`${kit}: a wheel over the code scrolls the page`, async ({ page }) => {
    await page.goto(path);
    const code = page.locator(".mx-code pre");
    await code.scrollIntoViewIfNeeded();
    const before = await page.evaluate(() => window.scrollY);
    const box = await code.boundingBox();
    await page.mouse.move(
      (box?.x ?? 0) + (box?.width ?? 0) / 2,
      (box?.y ?? 0) + Math.min(40, (box?.height ?? 0) / 2)
    );
    await page.mouse.wheel(0, 300);
    await page.waitForFunction((start) => window.scrollY > start, before);
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(before);
  });

  test(`${kit}: the install button copies the kit's install command`, async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto(path);
    await page.getByRole("button", { name: "Copy install" }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      adapterByKey(kit)?.install
    );
  });
}

/** Compact density, the status strip and the kit card border on every Vue kit. */
import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

async function openKit(
  page: Page,
  kit: string,
  query: Record<string, string>,
  route = "vue-main"
): Promise<void> {
  const search = new URLSearchParams({ kit, editing: "off", ...query });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(`/${route}/?${search.toString()}`);
}

async function rowHeight(
  page: Page,
  kit: string,
  density: "comfortable" | "compact"
): Promise<number> {
  await openKit(page, kit, { density });
  const row = page.locator('.mx-demo [data-adapttable-part="row"]').first();
  await expect(row).toBeVisible();
  const box = await row.boundingBox();
  if (!box) throw new Error(`${kit} ${density} row has no box`);
  return box.height;
}

for (const kit of builtAdapters("vue")) {
  test(`${kit.key}: compact density shortens the row`, async ({ page }) => {
    const comfortable = await rowHeight(page, kit.key, "comfortable");
    const compact = await rowHeight(page, kit.key, "compact");
    expect(compact).toBeLessThan(comfortable - 3);
  });

  test(`${kit.key}: the status bar stays in the card and skips the footer count`, async ({
    page,
  }) => {
    // The live demo mounts no status bar, like React's; the lab page does.
    await openKit(page, kit.key, { selection: "on" }, "vue-all-options");
    const root = page.locator('.mx-demo [data-adapttable-part="root"]');
    const footer = root.locator('[data-adapttable-part="footer"]');
    await expect(footer).toContainText("Showing");
    const row = root.locator('[data-adapttable-part="row"]').first();
    const checkbox = row.getByRole("checkbox");
    if (kit.key === "element-plus")
      await row
        .locator("label")
        .filter({ has: page.getByRole("checkbox") })
        .click();
    else await checkbox.check();
    const bar = root.locator('[data-adapttable-part="status-bar"]');
    await expect(bar).toBeVisible();
    await expect(bar).not.toContainText("Showing");
    const rootBox = await root.boundingBox();
    const barBox = await bar.boundingBox();
    expect(rootBox).toBeTruthy();
    expect(barBox).toBeTruthy();
    expect(barBox!.y).toBeGreaterThanOrEqual(rootBox!.y - 1);
    expect(barBox!.y + barBox!.height).toBeLessThanOrEqual(
      rootBox!.y + rootBox!.height + 1
    );
  });

  test(`${kit.key}: the selected kit card draws one border`, async ({
    page,
  }) => {
    await openKit(page, kit.key, {});
    const card = page.locator(".demo-kit-cards .adtab.is-on");
    await expect(card).toBeVisible();
    await card.click();
    const selected = page.locator(".demo-kit-cards .adtab.is-on");
    await expect(selected).toBeVisible();
    const look = await selected.evaluate((node) => {
      const style = getComputedStyle(node);
      return {
        shadow: style.boxShadow,
        outlineStyle: style.outlineStyle,
        outlineOffset: style.outlineOffset,
      };
    });
    expect(look.shadow.includes("0px 0px 0px 1px")).toBe(false);
    expect(look.outlineOffset === "3px" && look.outlineStyle !== "none").toBe(
      false
    );
  });
}

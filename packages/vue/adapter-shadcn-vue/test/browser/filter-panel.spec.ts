import { expect, test } from "@playwright/test";

const fixture =
  process.env.SHADCN_FILTER_FIXTURE_URL ?? "/vue/shadcn-vue/filter-panel/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

for (const mode of ["popover", "drawer"] as const) {
  for (const dir of ["ltr", "rtl"] as const) {
    test(`${mode} ${dir}: genuine controls, nested Escape, focus, and teardown`, async ({
      page,
    }) => {
      await page.goto(fixture);
      if (mode === "drawer") await page.locator("#mode-toggle").click();
      if (dir === "rtl") await page.locator("#direction-toggle").click();
      const trigger = page.locator(part("filters-button"));
      await expect(trigger).toHaveCount(1);
      await trigger.click();
      const panel = page.locator(
        part(mode === "drawer" ? "filters-panel" : "filters-popover")
      );
      await expect(panel).toBeVisible();
      await expect(panel).toHaveAttribute("dir", dir);
      if (mode === "drawer") {
        await expect(page.locator(part("filters-backdrop"))).toBeVisible();
        await expect(panel).toHaveAccessibleName("Filters");
        await expect(panel.locator(part("filters-close"))).toHaveCount(1);
      } else
        await expect(page.locator(part("filters-backdrop"))).toHaveCount(0);
      await panel.locator(part("filter-header-input")).click();
      await expect(page.locator(part("filter-header-menu"))).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.locator(part("filter-header-menu"))).toBeHidden();
      await expect(panel).toBeVisible();
      await panel.locator("input[aria-label=Person]").fill("Ada");
      await expect(page.locator("tbody")).toContainText("Ada");
      await expect(page.locator("tbody")).not.toContainText("Bea");
      await panel.locator(part("filters-done")).click();
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      await trigger.click();
      if (mode === "popover") {
        await page.locator("#outside-focus").click();
        await expect(panel).toBeHidden();
        await expect(page.locator("#outside-focus")).toBeFocused();
      } else {
        await panel.locator(part("filters-close")).click();
        await expect(trigger).toBeFocused();
      }
      await page.locator("#feature-toggle").click();
      await expect(trigger).toHaveCount(0);
      await expect(panel).toHaveCount(0);
      await expect(page.locator(part("filters-backdrop"))).toHaveCount(0);
    });
  }
}

test("375px RTL and fullscreen use the same real panel and 44px input target", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(fixture);
  await page.locator("#direction-toggle").click();
  await page.locator(part("filters-button")).click();
  const panel = page.locator(part("filters-popover"));
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds?.x).toBeGreaterThanOrEqual(0);
  expect((bounds?.x ?? 0) + (bounds?.width ?? 0)).toBeLessThanOrEqual(376);
  expect(
    await panel
      .locator("input[aria-label=Person]")
      .evaluate((element) => element.getBoundingClientRect().height)
  ).toBeGreaterThanOrEqual(44);
  await page.keyboard.press("Escape");
  await page.locator(part("fullscreen-toggle")).click();
  await page.locator(part("filters-button")).click();
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          !!document.fullscreenElement?.contains(
            document.querySelector('[data-adapttable-part="filters-popover"]')
          )
      )
    )
    .toBe(true);
});

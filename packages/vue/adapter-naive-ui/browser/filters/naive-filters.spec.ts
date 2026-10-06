import { expect, test } from "@playwright/test";

const route = "/vue/naive-ui/filtering/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
for (const scenario of [
  { name: "desktop", query: "", width: 1365, height: 900, modal: false },
  {
    name: "mobile",
    query: "?mobile&mode=drawer",
    width: 390,
    height: 844,
    modal: true,
  },
  { name: "rtl", query: "?rtl", width: 1365, height: 900, modal: false },
]) {
  test(`Naive filtering ${scenario.name}: native controls, nested Escape and screenshot`, async ({
    page,
  }, info) => {
    await page.setViewportSize({
      width: scenario.width,
      height: scenario.height,
    });
    await page.goto(route + scenario.query);
    await expect(page.locator(part("scroll-box"))).toHaveCount(1);
    await expect(
      page
        .locator(
          scenario.modal
            ? ".n-card[data-adapttable-part='card']"
            : "table.n-table"
        )
        .first()
    ).toBeVisible();
    const trigger = page.locator(part("filters-button"));
    await trigger.focus();
    await page.keyboard.press("Enter");
    const surface = page.locator(
      part(scenario.modal ? "filters-panel" : "filters-popover")
    );
    await expect(surface).toBeVisible();
    await expect(surface).toHaveAttribute("role", "dialog");
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(scenario.width + 1);
    expect(box!.y + box!.height).toBeLessThanOrEqual(scenario.height + 1);
    if (scenario.modal) {
      await expect(surface).toHaveAttribute("aria-modal", "true");
      await expect(page.locator(".n-drawer-mask")).toBeVisible();
      await expect(page.locator(part("filters-backdrop"))).toHaveCount(0);
      await page
        .locator("#outside")
        .evaluate((element) => (element as HTMLElement).focus());
      expect(
        await surface.evaluate((element) =>
          element.contains(document.activeElement)
        )
      ).toBe(true);
    }
    const screenshot = info.outputPath(`naive-filter-${scenario.name}.png`);
    await page.screenshot({ path: screenshot, fullPage: true });
    await info.attach(`Naive filtering ${scenario.name}`, {
      path: screenshot,
      contentType: "image/png",
    });
    const combo = surface.locator('input[role="combobox"]').first();
    await combo.click();
    await expect(combo).toHaveAttribute("aria-expanded", "true");
    await combo.press("Escape");
    await expect(combo).toHaveAttribute("aria-expanded", "false");
    await expect(surface).toBeVisible();
    await combo.press("Escape");
    await expect(surface).toHaveCount(0);
    await expect(trigger).toBeFocused();
    if (scenario.modal)
      expect(
        await page.evaluate(() => document.documentElement.style.overflow)
      ).not.toBe("hidden");
  });
}

test("Naive filter writes and genuine mask dismissal work in the shared order dataset", async ({
  page,
}) => {
  await page.goto(`${route}?mode=drawer`);
  await page.locator(part("filters-button")).click();
  const drawer = page.locator(part("filters-panel"));
  await drawer
    .locator(`input${part("filter-input")}`)
    .first()
    .fill("Atelier");
  await expect(page.locator("tbody")).toContainText("Atelier North");
  await expect(page.locator("tbody")).not.toContainText("Common Ground");
  await page.locator(".n-drawer-mask").click({ position: { x: 8, y: 8 } });
  await expect(drawer).toHaveCount(0);
  await page.locator(part("chip-remove")).first().click();
  await expect(page.locator("tbody")).toContainText("Common Ground");
});

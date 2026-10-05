import { expect, test } from "@playwright/test";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
for (const mode of ["popover", "drawer"] as const) {
  test(`${mode} leaves the native top layer during KeepAlive and resumes one table`, async ({
    page,
  }) => {
    await page.goto(`/vue/unstyled/composition/?mode=${mode}&rtl`);
    await page.locator(part("filters-button")).click();
    const surface = page.locator(
      part(mode === "drawer" ? "filters-panel" : "filters-popover")
    );
    await expect(surface).toBeVisible();
    if (mode === "popover")
      expect(
        await surface.evaluate((node) => node.matches(":popover-open"))
      ).toBe(true);
    else
      expect(await surface.evaluate((node) => node.matches(":modal"))).toBe(
        true
      );
    // A programmatic fixture control represents a route change even when a modal blocks outside clicks.
    await page
      .locator("#toggle")
      .evaluate((node: HTMLButtonElement) => node.click());
    await expect(surface).toBeHidden();
    await expect(surface).toHaveAttribute("inert", "");
    expect(
      await surface.evaluate((node) => node.matches(":popover-open, :modal"))
    ).toBe(false);
    await page.locator("#other").focus();
    await page.keyboard.press("Escape");
    await expect(page.locator("#other")).toBeFocused();
    await page.locator("#toggle").click();
    await expect(surface).toBeVisible();
    await expect(page.locator("#mounts")).toHaveText("1");
    await page.keyboard.press("Escape");
    await expect(surface).toHaveCount(0);
    await expect(page.locator(part("filters-button"))).toBeFocused();
  });
}
test("tree select-all includes the editable child and Tab reaches it", async ({
  page,
}) => {
  await page.goto("/vue/unstyled/composition/");
  await page.locator("thead input[type=checkbox]").check();
  await expect(page.locator("#selection")).toHaveText('["p","c"]');
  const parent = page.locator('[data-row-id="p"]');
  const child = page.locator('[data-row-id="c"]');
  await parent.locator(part("edit-cell-activate")).focus();
  await page.keyboard.press("F2");
  await parent.locator(part("edit-cell-editor")).fill("Changed parent");
  await page.keyboard.press("Tab");
  await expect(child.locator(part("edit-cell-editor"))).toBeFocused();
  await child.locator(part("edit-cell-editor")).fill("Changed child");
  await page.keyboard.press("Enter");
  await expect(page.locator("#writes")).toHaveText("2");
});

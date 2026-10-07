import { expect, test } from "@playwright/test";

for (const mobile of [false, true]) {
  test(`native hierarchy and actions mobile=${mobile}`, async ({
    page,
  }, info) => {
    await page.setViewportSize({ width: mobile ? 390 : 1280, height: 900 });
    await page.goto(
      `/test/browser/row-hierarchy.html?mobile=${mobile ? "1" : "0"}`
    );
    const toggle = page
      .locator('#hierarchy [data-adapttable-part="tree-toggle"]')
      .first();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await toggle.focus();
    await page.keyboard.press("ArrowRight");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await page.keyboard.press("ArrowLeft");
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(toggle).toBeFocused();
    const trigger = page
      .locator('#actions [data-adapttable-part="row-actions-trigger"]')
      .first();
    await trigger.focus();
    await page.keyboard.press("Enter");
    const menu = page.locator('[data-adapttable-part="row-actions-menu"]');
    await expect(menu).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await trigger.click();
    await menu.getByRole("button", { name: "Open record" }).click();
    await expect(page.locator("#row-request")).toHaveText("a");
    await expect(menu).not.toBeVisible();
    await page.screenshot({
      path: info.outputPath("hierarchy.png"),
      fullPage: true,
    });
  });

  test(`native virtual row window mobile=${mobile}`, async ({ page }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1280, height: 900 });
    await page.goto(
      `/test/browser/row-hierarchy.html?mobile=${mobile ? "1" : "0"}`
    );
    const scope = page.locator("#window");
    await expect(
      scope.locator('[data-adapttable-part="virtual-spacer"]')
    ).toHaveCount(2);
    const rows = scope.locator(
      `[data-adapttable-part="${mobile ? "card" : "row"}"]`
    );
    expect(await rows.count()).toBeLessThan(150);
    const scroll = scope.locator('[data-adapttable-part="scroll-box"]');
    await scroll.evaluate((node) => {
      node.scrollTop = node.scrollHeight;
    });
    await expect(
      scope.getByText("Window row 149", { exact: true })
    ).toBeVisible();
    await expect(
      scope.locator('[data-adapttable-part="pinned-summary-top"]')
    ).toContainText("Window total");
  });
}

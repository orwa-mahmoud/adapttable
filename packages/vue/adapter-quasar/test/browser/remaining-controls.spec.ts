import { expect, test } from "@playwright/test";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test("native palette retains disabled active commands, traps Tab and restores focus", async ({
  page,
}) => {
  await page.goto("/test/browser/remaining-controls.html");
  const trigger = page.locator(part("command-palette-button"));
  await trigger.click();
  const input = page.locator(part("command-input"));
  await expect(input).toBeFocused();
  await input.fill("Custom");
  await input.press("Enter");
  await expect(page.locator("#requested")).toHaveText("");
  await input.press("Tab");
  await expect(page.locator(part("command-palette"))).toContainText(
    "Custom run"
  );
  await expect
    .poll(() =>
      page.evaluate(
        () => document.activeElement?.closest('[role="dialog"]') !== null
      )
    )
    .toBe(true);
  await input.focus();
  await input.press("ArrowDown");
  await input.press("Enter");
  await expect(page.locator("#requested")).toHaveText("command");
  await expect(trigger).toBeFocused();
});
test("context menu owns one native popup and returns focus after keyboard selection", async ({
  page,
}) => {
  await page.goto("/test/browser/remaining-controls.html");
  const cell = page.locator('#navigation [data-grid-cell="0:0"]');
  await cell.focus();
  await cell.press("Shift+F10");
  const menu = page.locator(part("context-menu"));
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute("dir", "rtl");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.locator("#requested")).toHaveText("context");
  await expect(cell).toBeFocused();
});
for (const mobile of [false, true])
  test(`native grouping/reorder and RTL side-panel controls, mobile=${mobile}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: mobile ? 390 : 1280, height: 900 });
    await page.goto(
      `/test/browser/remaining-controls.html?mobile=${mobile ? "1" : "0"}`
    );
    const tabs = page.locator(part("side-panel-tab"));
    await tabs.first().focus();
    await page.keyboard.press("ArrowLeft");
    await expect(page.locator(part("side-panel-body"))).toHaveText(
      "History body"
    );
    const trigger = page.locator(
      `#grouping [data-row-id="a"] ${part("row-move-menu-trigger")}`
    );
    await trigger.click();
    await page
      .locator(`${part("row-move-menu-item")}:not([aria-disabled="true"])`)
      .first()
      .click();
    const dialog = page.locator(part("row-move-confirmation"));
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("role", "alertdialog");
    await expect(page.locator(part("row-move-cancel"))).toBeFocused();
    await page.screenshot({
      path: test
        .info()
        .outputPath(`quasar-remaining-${mobile ? "mobile" : "desktop"}.png`),
      fullPage: true,
    });
    await page.locator(part("row-move-cancel")).click();
    await expect(trigger).toBeFocused();
    await expect(page.locator("#requested")).toHaveText("");
  });

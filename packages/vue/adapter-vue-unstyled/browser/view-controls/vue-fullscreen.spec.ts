import { expect, test } from "@playwright/test";

// Browser-owned fullscreen handling uses the full Chromium binary.
test.use({ channel: "chromium" });

const PREVIEW = "/vue/unstyled/view-controls/";

test("Vue native fullscreen keeps overlays visible and follows Escape", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  const table = page.locator('[data-demo-table="view-controls"]');
  await table.locator('[data-adapttable-part="fullscreen-button"]').click();
  await expect
    .poll(() =>
      table.evaluate(
        (element) => element.ownerDocument.fullscreenElement === element
      )
    )
    .toBe(true);
  const trigger = table.locator('[data-adapttable-part="views-button"]');
  const panel = page.locator('[data-adapttable-part="views-panel"]');
  await trigger.click();
  await expect(panel).toBeVisible();
  await expect(
    panel.locator('[data-adapttable-part="views-input"]')
  ).toBeFocused();
  await page.keyboard.press("Escape");
  // Escape dismisses the owned overlay and restores focus before the next key.
  await expect(panel).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await expect(trigger).toBeFocused();
  await expect
    .poll(() =>
      table.evaluate(
        (element) => element.ownerDocument.fullscreenElement === element
      )
    )
    .toBe(true);
  await page.keyboard.press("Escape");
  await expect
    .poll(() =>
      table.evaluate(
        (element) => element.ownerDocument.fullscreenElement === element
      )
    )
    .toBe(false);
});

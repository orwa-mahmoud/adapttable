import { expect, test } from "@playwright/test";

import {
  observeFullscreenInput,
  x11DiagnosticEnabled,
} from "../../../../../e2e/helpers/fullscreen-input-diagnostic";

// Browser-owned fullscreen handling uses the full Chromium binary.
test.use({ channel: "chromium", headless: false });

const PREVIEW = "/vue/unstyled/view-controls/";
const ROOT = '[data-demo-table="view-controls"]';
const OVERLAY = '[data-adapttable-part="views-panel"]';

test("Vue DOM Escape dismisses its overlay within fullscreen", async ({
  page,
  channel,
  headless,
}, testInfo) => {
  await page.goto(PREVIEW);
  const diagnostic = await observeFullscreenInput(
    page,
    testInfo,
    { root: ROOT, overlay: OVERLAY },
    { channel, headless }
  );
  try {
    const table = page.locator(ROOT);
    await table.locator('[data-adapttable-part="fullscreen-toggle"]').click();
    await expect
      .poll(() =>
        table.evaluate(
          (element) => element.ownerDocument.fullscreenElement === element
        )
      )
      .toBe(true);
    const trigger = table.locator('[data-adapttable-part="views-button"]');
    const panel = page.locator(OVERLAY);
    await trigger.click();
    await expect(panel).toBeVisible();
    await expect(
      panel.locator('[data-adapttable-part="views-input"]')
    ).toBeFocused();
    await diagnostic.pressEscape("playwright-escape-1", () =>
      page.keyboard.press("Escape")
    );
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
    // The native button remains an independently exercised exit path.
    await table.locator('[data-adapttable-part="fullscreen-toggle"]').click();
    await expect
      .poll(() =>
        table.evaluate(
          (element) => element.ownerDocument.fullscreenElement === element
        )
      )
      .toBe(false);
  } finally {
    await diagnostic.attach("vue-fullscreen-platform-events");
  }
});

test.describe("CI native fullscreen input", () => {
  // XTest is safe only in the explicitly enabled CI Xvfb session, where the
  // workflow installs its native input dependency and runs one browser worker.
  test.skip(!x11DiagnosticEnabled, "Requires Linux CI with Xvfb and xdotool");

  test("Vue native Escape exits fullscreen before dismissing its overlay", async ({
    page,
    channel,
    headless,
  }, testInfo) => {
    await page.goto(PREVIEW);
    const diagnostic = await observeFullscreenInput(
      page,
      testInfo,
      { root: ROOT, overlay: OVERLAY },
      { channel, headless }
    );
    try {
      const escape = await diagnostic.prepareX11();
      const table = page.locator(ROOT);
      await table.locator('[data-adapttable-part="fullscreen-toggle"]').click();
      await expect
        .poll(() =>
          table.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(true);
      const trigger = table.locator('[data-adapttable-part="views-button"]');
      const fullscreen = table.locator(
        '[data-adapttable-part="fullscreen-toggle"]'
      );
      await expect(fullscreen).toHaveAttribute("aria-pressed", "true");
      await trigger.click();
      const panel = page.locator(OVERLAY);
      await expect(panel).toBeVisible();
      await expect(
        panel.locator('[data-adapttable-part="views-input"]')
      ).toBeFocused();
      // Chromium owns the first native Escape and consumes it before DOM
      // keydown. The next key reaches the overlay in the restored viewport.
      await diagnostic.pressEscape("xtest-escape-1", escape);
      await expect
        .poll(() =>
          table.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(false);
      await expect(fullscreen).toHaveAttribute("aria-pressed", "false");
      await expect(panel).toBeVisible();
      await expect(trigger).toHaveAttribute("aria-expanded", "true");
      await expect(
        panel.locator('[data-adapttable-part="views-input"]')
      ).toBeFocused();
      await diagnostic.pressEscape("xtest-escape-2", escape);
      await expect(panel).toBeHidden();
      await expect(trigger).toHaveAttribute("aria-expanded", "false");
      await expect(trigger).toBeFocused();
      await expect
        .poll(() =>
          table.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(false);
    } finally {
      await diagnostic.attach("vue-fullscreen-native-input");
    }
  });
});

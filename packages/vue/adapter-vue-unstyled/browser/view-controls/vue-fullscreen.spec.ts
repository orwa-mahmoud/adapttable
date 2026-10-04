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

test("Vue native fullscreen keeps overlays visible and follows Escape", async ({
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
    await table.locator('[data-adapttable-part="fullscreen-button"]').click();
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
    await diagnostic.pressEscape("playwright-escape-2", () =>
      page.keyboard.press("Escape")
    );
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

test.describe("CI X11 input comparison", () => {
  // XTest is safe only in the explicitly enabled CI Xvfb session, where the
  // workflow installs its native input dependency and runs one browser worker.
  test.skip(!x11DiagnosticEnabled, "CI-only XTest input comparison");

  test("Vue native fullscreen X11 Escape observation", async ({
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
      await table.locator('[data-adapttable-part="fullscreen-button"]').click();
      await expect
        .poll(() =>
          table.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(true);
      await table.locator('[data-adapttable-part="views-button"]').click();
      const panel = page.locator(OVERLAY);
      await expect(panel).toBeVisible();
      await expect(
        panel.locator('[data-adapttable-part="views-input"]')
      ).toBeFocused();
      // Observe native Chrome's actual ordering before deciding whether the
      // first-Escape-keeps-fullscreen expectation above describes native input.
      await diagnostic.pressEscape("xtest-escape-1", escape);
      await diagnostic.pressEscape("xtest-escape-2", escape);
    } finally {
      await diagnostic.attach("vue-fullscreen-x11-observation");
    }
  });
});

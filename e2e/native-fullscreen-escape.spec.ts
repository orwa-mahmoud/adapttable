import { expect, type Page, test } from "@playwright/test";

import {
  observeFullscreenInput,
  x11DiagnosticEnabled,
} from "./helpers/fullscreen-input-diagnostic";

// Exercise browser-owned fullscreen handling in full Chromium.
test.use({ channel: "chromium", headless: false });

// Platform control: no framework, overlay, Escape handler, or fullscreen shim.
const ROOT = "#native-fullscreen-control";

async function openControl(page: Page): Promise<void> {
  await page.setContent(`
    <main id="native-fullscreen-control">
      <button type="button">Enter fullscreen</button>
    </main>
  `);
  await page.locator(ROOT).evaluate((element) => {
    element.querySelector("button")?.addEventListener("click", () => {
      void element.requestFullscreen();
    });
  });
}

test.describe("CI native fullscreen input", () => {
  // XTest is safe only in the explicitly enabled CI Xvfb session, where the
  // workflow installs its native input dependency and runs one browser worker.
  test.skip(!x11DiagnosticEnabled, "Requires Linux CI with Xvfb and xdotool");

  test("native fullscreen exits on native Escape", async ({
    page,
    channel,
    headless,
  }, testInfo) => {
    await openControl(page);
    const root = page.locator(ROOT);
    const diagnostic = await observeFullscreenInput(
      page,
      testInfo,
      { root: ROOT },
      { channel, headless }
    );
    try {
      const escape = await diagnostic.prepareX11();
      await page.getByRole("button", { name: "Enter fullscreen" }).click();
      await expect
        .poll(() =>
          root.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(true);
      await diagnostic.pressEscape("xtest-escape-1", escape);
      await expect
        .poll(() =>
          root.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(false);
      await diagnostic.pressEscape("xtest-escape-2", escape);
      await expect
        .poll(() =>
          root.evaluate(
            (element) => element.ownerDocument.fullscreenElement === element
          )
        )
        .toBe(false);
    } finally {
      await diagnostic.attach("native-fullscreen-native-input");
    }
  });
});

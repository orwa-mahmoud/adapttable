import { expect, type Page, test } from "@playwright/test";

import {
  observeFullscreenInput,
  x11DiagnosticEnabled,
} from "./helpers/fullscreen-input-diagnostic";

// Exercise browser-owned fullscreen handling in full Chromium.
test.use({ channel: "chromium", headless: false });

// Diagnostic control: no framework, overlay, Escape handler, or fullscreen shim.
// Keep this assertion failing if the browser input path cannot exit fullscreen.
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

test("native fullscreen platform control follows Escape", async ({
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
    await expect(root).toBeVisible();
    await page.getByRole("button", { name: "Enter fullscreen" }).click();
    await expect
      .poll(() =>
        root.evaluate(
          (element) => element.ownerDocument.fullscreenElement === element
        )
      )
      .toBe(true);
    await diagnostic.pressEscape("playwright-escape-1", () =>
      page.keyboard.press("Escape")
    );
    await expect
      .poll(() =>
        root.evaluate(
          (element) => element.ownerDocument.fullscreenElement === element
        )
      )
      .toBe(false);
  } finally {
    await diagnostic.attach("native-fullscreen-platform-events");
  }
});

test.describe("CI X11 input comparison", () => {
  // XTest is safe only in the explicitly enabled CI Xvfb session, where the
  // workflow installs its native input dependency and runs one browser worker.
  test.skip(!x11DiagnosticEnabled, "CI-only XTest input comparison");

  test("native fullscreen X11 Escape observation", async ({
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
      // Keep both observations even if native Chrome exits on the first Escape.
      // The independent Playwright control above retains its behavior assertion.
      await diagnostic.pressEscape("xtest-escape-1", escape);
      await diagnostic.pressEscape("xtest-escape-2", escape);
    } finally {
      await diagnostic.attach("native-fullscreen-x11-observation");
    }
  });
});

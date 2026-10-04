import { expect, test } from "@playwright/test";

// Exercise browser-owned fullscreen handling in full Chromium.
test.use({ channel: "chromium" });

// Diagnostic control: no framework, overlay, Escape handler, or fullscreen shim.
// Keep this assertion failing if the browser input path cannot exit fullscreen.
test("native fullscreen platform control follows Escape", async ({
  page,
  browser,
}, testInfo) => {
  const events: string[] = [];
  page.on("console", (message) => events.push(message.text()));
  await page.setContent(`
    <main id="native-fullscreen-control">
      <button type="button">Enter fullscreen</button>
    </main>
  `);
  const root = page.locator("#native-fullscreen-control");
  await root.evaluate((element) => {
    const doc = element.ownerDocument;
    const report = (event: Event): void => {
      console.info(
        JSON.stringify({
          type: event.type,
          key: event instanceof KeyboardEvent ? event.key : undefined,
          trusted: event.isTrusted,
          defaultPrevented: event.defaultPrevented,
          fullscreen: doc.fullscreenElement === element,
          focused: doc.activeElement?.tagName,
        })
      );
    };
    // Observe only; no event is cancelled and Escape never calls exitFullscreen.
    doc.defaultView?.addEventListener("keydown", report);
    doc.defaultView?.addEventListener("keyup", report);
    doc.addEventListener("fullscreenchange", report);
    element.querySelector("button")?.addEventListener("click", () => {
      void element.requestFullscreen();
    });
  });
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
    await page.keyboard.press("Escape");
    await expect
      .poll(() =>
        root.evaluate(
          (element) => element.ownerDocument.fullscreenElement === element
        )
      )
      .toBe(false);
  } finally {
    await testInfo.attach("native-fullscreen-platform-events", {
      contentType: "application/json",
      body: JSON.stringify(
        {
          browserVersion: browser.version(),
          project: testInfo.project.name,
          headless: testInfo.project.use.headless ?? true,
          channel: "chromium",
          events,
        },
        null,
        2
      ),
    });
  }
});

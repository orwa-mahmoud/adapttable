/** Native assistant launchers must fit their control and remain keyboard operable. */
import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";

for (const kit of builtAdapters("vue")) {
  for (const width of [1440, 390]) {
    for (const locale of ["en", "ar"]) {
      test(`${kit.key}: ${width}px ${locale} assistant launcher fits and restores keyboard focus`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 900 });
        await page.addInitScript(() =>
          localStorage.setItem("adapttable-demo-theme", "dark")
        );
        await page.goto(`/vue/${pathOf(kit)}/ai/?locale=${locale}`);
        if (kit.key === "quasar") {
          const approvalSurface = page.locator(
            '[data-adapttable-part="demo-approval-surface"]'
          );
          const nativeField = approvalSurface.locator("xpath=ancestor::label");
          await expect(nativeField.locator(".q-icon svg")).toBeVisible();
          await expect(nativeField).not.toContainText("arrow_drop_down");
        }
        const launcher = page.locator(
          '[data-adapttable-part="assistant-launcher"]'
        );
        await expect(launcher).toBeVisible();
        const box = (await launcher.boundingBox())!;
        expect(box.width).toBeGreaterThanOrEqual(32);
        expect(box.width).toBeLessThanOrEqual(96);
        expect(box.height).toBeGreaterThanOrEqual(32);
        expect(box.height).toBeLessThanOrEqual(64);
        const mark = (await launcher
          .locator('[data-adapttable-part="assistant-launcher-mark"]')
          .boundingBox())!;
        expect(mark.width).toBeGreaterThanOrEqual(16);
        expect(mark.width).toBeLessThanOrEqual(40);
        expect(mark.height).toBeGreaterThanOrEqual(16);
        expect(mark.height).toBeLessThanOrEqual(40);
        expect(mark.x).toBeGreaterThanOrEqual(box.x);
        expect(mark.y).toBeGreaterThanOrEqual(box.y);
        expect(mark.x + mark.width).toBeLessThanOrEqual(box.x + box.width);
        expect(mark.y + mark.height).toBeLessThanOrEqual(box.y + box.height);
        for (let repeat = 0; repeat < 2; repeat++) {
          await launcher.focus();
          await launcher.press("Enter");
          const composer = page.locator(
            '[data-adapttable-part="assistant-input"]'
          );
          await expect(composer).toBeVisible();
          await expect(composer).toBeFocused();
          if (repeat === 0) {
            const path = info.outputPath(
              `${kit.key}-${width}-${locale}-assistant-open.png`
            );
            await page.screenshot({ path, animations: "disabled" });
            await info.attach("native assistant open", {
              path,
              contentType: "image/png",
            });
          }
          await page.keyboard.press("Escape");
          await expect(composer).toHaveCount(0);
          await expect(launcher).toBeFocused();
        }
        await page.locator(".mx-demo").evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 80,
            behavior: "instant",
          })
        );
        const path = info.outputPath(
          `${kit.key}-${width}-${locale}-assistant-closed.png`
        );
        await page.screenshot({ path, animations: "disabled" });
        await info.attach("native assistant closed", {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { angularPart } from "./angular-kit";

const selector = (name: string) => `[data-adapttable-part="${name}"]`;

function runningAnimations(element: Element): number {
  let running = 0;
  let ancestor: Element | null = element;
  for (
    let depth = 0;
    ancestor && depth < 5;
    depth++, ancestor = ancestor.parentElement
  ) {
    running += ancestor
      .getAnimations()
      .filter(
        (animation) =>
          animation.playState === "running" &&
          animation.effect?.getComputedTiming().iterations !== Infinity
      ).length;
  }
  return running;
}

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  await page.screenshot({ path: testInfo.outputPath("failure.png") });
  console.log(
    "Focused element on failure:",
    await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 1000))
  );
});

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const presentation of [
      { width: 1440, locale: "en", theme: "light" },
      { width: 1440, locale: "ar", theme: "dark" },
      { width: 390, locale: "en", theme: "light" },
    ]) {
      const { width, locale, theme } = presentation;
      test(`${framework}/${kit.key}: ${width}px ${locale} ${theme} assistant matches reference composition`, async ({
        page,
      }, testInfo) => {
        await page.setViewportSize({ width, height: 1000 });
        const route =
          framework === "vue"
            ? `/vue/${pathOf(kit)}/ai/`
            : `/${pathOf(kit)}/ai/`;
        await page.goto(`${route}?locale=${locale}&theme=${theme}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const part = (name: string) =>
          framework === "angular"
            ? angularPart(kit, page, name)
            : page.locator(selector(name));
        await page
          .locator(framework === "react" ? ".ai-demo__stage" : ".ai-demo")
          .scrollIntoViewIfNeeded();
        await part("assistant-launcher").click();
        const surface = page.locator(selector("assistant-surface"));
        const composer = page.locator(selector("assistant-composer"));
        const input = part("assistant-input");
        const send = part("assistant-send");
        await expect(input).toBeFocused();
        // Measure settled kit surfaces; a slide transition changes the
        // coordinates between two consecutive bounding-box reads.
        await expect.poll(() => surface.evaluate(runningAnimations)).toBe(0);
        await expect
          .poll(async () => {
            const rect = await surface.boundingBox();
            return rect ? rect.x + rect.width : Infinity;
          })
          .toBeLessThanOrEqual(width + 1);
        const pane = await surface.boundingBox();
        expect(pane!.x).toBeGreaterThanOrEqual(0);
        if (width === 1440) {
          if (locale === "en") expect(pane!.x).toBeGreaterThan(900);
          else expect(pane!.x).toBeLessThan(80);
        }
        const composeRect = await composer.boundingBox();
        const inputRect = await input.boundingBox();
        const sendRect = await send.boundingBox();
        const backRect =
          width === 390 ? await part("assistant-back").boundingBox() : null;
        // Mobile keeps the explicit Back to table action below the composer.
        expect(
          pane!.y + pane!.height - composeRect!.y - composeRect!.height
        ).toBeLessThan(40 + (backRect?.height ?? 0));
        if (width === 1440) {
          expect(
            await surface.evaluate((element) => {
              let owner: Element | null = element;
              while (owner && owner !== document.body) {
                // Radix Card paints its surface through a pseudo-element.
                const painted = [undefined, "::before", "::after"].some(
                  (pseudo) => {
                    const style = getComputedStyle(owner!, pseudo);
                    return (
                      style.backgroundColor !== "rgba(0, 0, 0, 0)" &&
                      style.backgroundColor !== "transparent"
                    );
                  }
                );
                if (painted) return true;
                if (
                  owner.getAttribute("data-adapttable-part") ===
                  "assistant-window"
                )
                  return false;
                owner = owner.parentElement;
              }
              return false;
            })
          ).toBe(true);
        }
        expect(composeRect!.height).toBeLessThan(80);
        expect(inputRect!.width).toBeGreaterThan(150);
        expect(
          Math.abs(
            inputRect!.y +
              inputRect!.height / 2 -
              sendRect!.y -
              sendRect!.height / 2
          )
        ).toBeLessThan(22);
        await expect(send.locator("svg")).toBeVisible();
        await expect(part("assistant-close").locator("svg")).toBeVisible();

        await part("assistant-examples-menu").click();
        await expect(part("assistant-examples-item").first()).toBeVisible();
        await expect
          .poll(() =>
            part("assistant-examples-item")
              .first()
              .evaluate((item) => {
                const rect = item.getBoundingClientRect();
                const hit = document.elementFromPoint(
                  rect.x + rect.width / 2,
                  rect.y + rect.height / 2
                );
                return !!hit && item.contains(hit);
              })
          )
          .toBe(true);
        await expect
          .poll(() =>
            part("assistant-examples-item").first().evaluate(runningAnimations)
          )
          .toBe(0);
        await page.screenshot({
          path: testInfo.outputPath(
            `${framework}-${kit.key}-${width}-${locale}-shortcuts.png`
          ),
        });
        await page.keyboard.press("Escape");
        await expect(surface).toBeVisible();
        await expect(part("assistant-examples-item").first()).toBeHidden();
        await input.fill("Sort by salary, highest first.");
        await input.press("Enter");
        await expect(
          part("assistant-receipts-toggle-button").last()
        ).toBeVisible();
        await part("assistant-receipts-toggle-button").last().click();
        await expect(part("assistant-receipt").last()).toHaveAttribute(
          "data-status",
          "executed"
        );
        for (const message of await page
          .locator(selector("assistant-message-text"))
          .all()) {
          const rect = await message.boundingBox();
          expect(rect!.width).toBeGreaterThan(90);
        }
        expect(
          await surface.evaluate(
            (element) => element.scrollWidth - element.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        await page.screenshot({
          path: testInfo.outputPath(
            `${framework}-${kit.key}-${width}-${locale}-conversation.png`
          ),
        });
        await part("assistant-close").click();
        await expect(part("assistant-launcher")).toBeFocused();
      });
    }
  }
}

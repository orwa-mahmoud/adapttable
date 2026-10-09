/** Native filter controls remain reachable when the opener is near the viewport bottom. */
import { writeFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { pathOf } from "../apps/showcase/matrix.mjs";
import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  for (const locale of ["en", "ar"]) {
    for (const width of [390, 1280]) {
      test(`${kit.key} ${locale} ${width}: near-bottom filter keeps its heading and Done reachable`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 720 });
        await page.goto(`/${pathOf(kit)}/?locale=${locale}&live=off`);
        const trigger = angularPart(kit, page, "filters-button").first();
        const panel = angularPart(kit, page, "filters-popover");
        await expect(trigger).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        await trigger.evaluate((button) =>
          button.scrollIntoView({ block: "end", behavior: "instant" })
        );
        const origin = (await trigger.boundingBox())!;
        expect(720 - origin.y - origin.height).toBeLessThan(80);
        await trigger.click();
        await expect(panel).toBeVisible();
        const screenshot = info.outputPath(
          `${kit.key}-${locale}-${width}-filter.png`
        );
        await page.screenshot({ path: screenshot, animations: "disabled" });
        await info.attach("Near-bottom native filter", {
          path: screenshot,
          contentType: "image/png",
        });
        const heading = panel.locator("header h3");
        const done = panel.locator("footer button").last();
        await expect(heading).toBeInViewport({ ratio: 1 });
        await expect(done).toBeInViewport({ ratio: 1 });
        await heading.click({ trial: true });
        const fields = panel.locator('[data-adapttable-part="filter-field"]');
        await expect(fields).toHaveCount(7);
        for (const field of await fields.all()) {
          const controls = field
            .getByRole("textbox")
            .or(field.getByRole("combobox"))
            .or(field.getByRole("spinbutton"))
            .or(field.getByRole("checkbox"));
          expect(await controls.count()).toBeGreaterThan(0);
          for (const control of await controls.all()) {
            await control.scrollIntoViewIfNeeded();
            try {
              await expect(control).toBeInViewport({ ratio: 1 });
            } catch (error) {
              await writeFile(
                info.outputPath("clipped-control.json"),
                JSON.stringify(
                  await control.evaluate((element) => {
                    const chain = [];
                    for (
                      let current: Element | null = element;
                      current;
                      current = current.parentElement
                    ) {
                      const rect = current.getBoundingClientRect();
                      const css = getComputedStyle(current);
                      chain.push({
                        tag: current.tagName,
                        part: current.getAttribute("data-adapttable-part"),
                        class: current.getAttribute("class"),
                        rect: rect.toJSON(),
                        overflow: css.overflow,
                        scrollWidth: current.scrollWidth,
                        clientWidth: current.clientWidth,
                        scrollHeight: current.scrollHeight,
                        clientHeight: current.clientHeight,
                      });
                    }
                    return chain;
                  }),
                  null,
                  2
                )
              );
              await page.screenshot({
                path: info.outputPath("clipped-control.png"),
                animations: "disabled",
              });
              throw error;
            }
          }
        }
        await expect(heading).toBeInViewport({ ratio: 1 });
        await expect(done).toBeInViewport({ ratio: 1 });
        await page.screenshot({
          path: info.outputPath(
            `${kit.key}-${locale}-${width}-filter-traversed.png`
          ),
          animations: "disabled",
        });
        await done.click();
        await expect(panel).toBeHidden();
        await trigger.click();
        await expect(panel).toBeVisible();
        await panel.getByRole("textbox").first().focus();
        await page.keyboard.press("Escape");
        await expect(panel).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    }
  }
}

/** Nested native Bootstrap controls retain their enclosing color mode. */
import { readFile } from "node:fs/promises";

import { expect, test } from "@playwright/test";

import { getLabels } from "../packages/shared/i18n/src/catalog";

for (const kit of ["ng-bootstrap", "ngx-bootstrap"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`${kit}: nested controls inherit ${theme} while explicit light stays light`, async ({
      page,
    }) => {
      const css = await readFile(
        `packages/angular/adapter-${kit}/styles.css`,
        "utf8"
      );
      const scope = `adapttable-${kit}`;
      await page.setContent(`<style>${css}</style>
        <div class="${scope}" data-bs-theme="${theme}">
          <select id="direct" class="form-select"><option>Direct</option></select>
          <div class="${scope}"><select id="nested" class="form-select"><option>Nested</option></select></div>
          <div class="${scope}" data-bs-theme="light"><select id="explicit" class="form-select"><option>Explicit light</option></select></div>
        </div>`);
      const colors = await page.locator("select").evaluateAll((controls) =>
        controls.map((control) => {
          const style = getComputedStyle(control);
          return { color: style.color, background: style.backgroundColor };
        })
      );
      expect(colors[1]).toEqual(colors[0]);
      expect(colors[2]).toEqual({
        color: "rgb(33, 37, 41)",
        background: "rgb(255, 255, 255)",
      });
    });
  }

  for (const locale of ["en", "ar"] as const) {
    for (const width of [390, 1440]) {
      test(`${kit}: ${locale} dark AI table controls keep readable native colors at ${width}px`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(() =>
          localStorage.setItem("adapttable-demo-theme", "dark")
        );
        await page.goto(`/${kit}/ai/?locale=${locale}`);
        const stage = page.locator(".ai-demo__stage");
        const part = width < 600 ? "card" : "row";
        await expect(
          stage.locator(`[data-adapttable-part="${part}"]`)
        ).toHaveCount(5);
        // The kit draws the table's own controls: the filters trigger and
        // the pager's page-size select read light on the dark surface.
        const filters = stage
          .locator('[data-adapttable-part="toolbar"]')
          .getByRole("button", {
            name: new RegExp(`^${getLabels(locale).filters}`),
          });
        await expect(filters).toBeVisible();
        await expect(filters).toHaveCSS("color", "rgb(222, 226, 230)");
        await expect(stage.locator("select.form-select").first()).toHaveCSS(
          "background-color",
          "rgb(33, 37, 41)"
        );
        await filters.focus();
        await expect(filters).toBeFocused();
        await page
          .locator(".ai-demo")
          .evaluate((demo) =>
            demo.scrollIntoView({ block: "start", behavior: "instant" })
          );
        const path = info.outputPath(`${kit}-${locale}-${width}-dark-ai.png`);
        await page.screenshot({ path, animations: "disabled" });
        await info.attach(`${kit}-${locale}-${width}-dark-ai`, {
          path,
          contentType: "image/png",
        });
      });
    }
  }
}

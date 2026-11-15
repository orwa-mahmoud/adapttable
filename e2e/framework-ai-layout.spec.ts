import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { angularPart } from "./angular-kit";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

/** The staff table's headings, in each language the page reads in. */
const HEADERS = {
  en: ["Person", "Team", "Status", "Salary", "Started"],
  ar: ["الشخص", "الفريق", "الحالة", "الراتب", "تاريخ البدء"],
} as const;
for (const framework of ["angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const locale of ["en", "ar"] as const) {
      test(`${framework}/${kit.key}: ${locale} AI workspace keeps assistant at the trailing edge`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        const route =
          framework === "vue" ? `/vue/${pathOf(kit)}/ai/` : `/${kit.key}/ai/`;
        await page.goto(`${route}?locale=${locale}`, {
          waitUntil: "domcontentloaded",
        });
        const demo = page.locator(".ai-demo__stage");
        await expect(demo.locator(part("row"))).toHaveCount(5);
        for (const header of HEADERS[locale])
          await expect(
            demo.getByRole("columnheader").filter({ hasText: header })
          ).toHaveCount(1);
        for (const name of ["column-menu-button", "filters-button"]) {
          // The selected kit owns the actual toolbar controls.
          await expect(
            framework === "angular"
              ? angularPart(kit, page, name, demo)
              : demo.locator(part(name))
          ).toBeVisible();
        }
        await page.locator(part("assistant-launcher")).click();
        const surface = page.locator(part("assistant-window"));
        await expect(surface).toBeVisible();
        const bounds = await surface.boundingBox();
        if (!bounds) throw new Error("Assistant has no bounds");
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.y).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(1441);
        expect(bounds.y + bounds.height).toBeLessThanOrEqual(1001);
        if (locale === "en") expect(bounds.x).toBeGreaterThan(900);
        else expect(bounds.x).toBeLessThan(50);
        const header = page.locator(part("assistant-header"));
        expect(
          await header.evaluate((element) => getComputedStyle(element).display)
        ).toBe("flex");
        await expect(page.locator(part("assistant-input"))).toBeFocused();
        await page.locator(part("assistant-close")).click();
        await expect(surface).toBeHidden();
        await expect(page.locator(part("assistant-launcher"))).toBeFocused();
      });
    }
  }
}

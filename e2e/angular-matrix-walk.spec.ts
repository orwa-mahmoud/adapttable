/** Every registered Angular matrix page mounts its genuine kit in each presentation. */
import { expect, test } from "@playwright/test";

import { builtAdapters, featuresOf, pathOf } from "../apps/showcase/matrix.mjs";

const presentations = [
  {
    name: "desktop-light",
    width: 1440,
    height: 1000,
    theme: "light",
    locale: "en",
  },
  {
    name: "desktop-dark",
    width: 1440,
    height: 1000,
    theme: "dark",
    locale: "en",
  },
  {
    name: "desktop-rtl-dark",
    width: 1440,
    height: 1000,
    theme: "dark",
    locale: "ar",
  },
  {
    name: "phone-light",
    width: 390,
    height: 844,
    theme: "light",
    locale: "en",
  },
  {
    name: "phone-rtl-dark",
    width: 390,
    height: 844,
    theme: "dark",
    locale: "ar",
  },
] as const;

for (const kit of builtAdapters("angular")) {
  for (const slug of ["", ...featuresOf(kit).map((feature) => feature.slug)]) {
    for (const presentation of presentations) {
      test(`${kit.key}/${slug || "entry"}: ${presentation.name} mounts readable native content`, async ({
        page,
      }, info) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize(presentation);
        await page.addInitScript(
          (theme) =>
            window.localStorage.setItem("adapttable-demo-theme", theme),
          presentation.theme
        );
        const suffix = slug ? slug + "/" : "";
        const route = `/${pathOf(kit)}/${suffix}`;
        const response = await page.goto(
          `${route}?locale=${presentation.locale}&live=off`
        );
        expect(response?.status()).toBe(200);
        await expect(page.locator("adapt-showcase-matrix-page")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          presentation.theme
        );
        const root = page
          .locator('.mx-demo [data-adapttable-part="root"]')
          .first();
        await expect(root).toBeVisible();
        await expect(root).toHaveAttribute(
          "dir",
          presentation.locale === "ar" ? "rtl" : "ltr"
        );
        await expect(
          root
            .locator(
              '[data-adapttable-part="row"][data-row-id], [data-adapttable-part="card"]'
            )
            .first()
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        if (slug === "pivot" && presentation.width === 390) {
          const names = await root
            .locator('[data-adapttable-part="card"]')
            .first()
            .locator('[data-adapttable-part="card-label"]')
            .allTextContents();
          expect(names).toHaveLength(6);
          expect(new Set(names).size).toBe(names.length);
          expect(names.join(" ")).toContain("Planned / sum Budget");
          expect(names.join(" ")).toContain("Active / sum Budget");
        }
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        const search = root.getByRole("searchbox");
        if (await search.count()) {
          await search.focus();
          await expect(search).toBeFocused();
          await search.press("Tab");
          expect(
            await root.evaluate((element) =>
              element.contains(document.activeElement)
            )
          ).toBe(true);
        }
        await page.locator(".mx-demo").evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 80,
            behavior: "instant",
          })
        );
        const path = info.outputPath(
          `${kit.key}-${slug || "entry"}-${presentation.name}.png`
        );
        await page.screenshot({ path, animations: "disabled" });
        await info.attach(presentation.name, {
          path,
          contentType: "image/png",
        });
        expect(errors).toEqual([]);
      });
    }
  }
}

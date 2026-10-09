/** Every registered React matrix page mounts its genuine kit in each presentation. */
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

for (const kit of builtAdapters("react")) {
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
        const locale = slug === "rtl" ? "ar" : presentation.locale;
        const response = await page.goto(
          `${route}?locale=${locale}&dir=${locale === "ar" ? "rtl" : "ltr"}&live=off`
        );
        expect(response?.status()).toBe(200);
        await expect(page.locator("html")).toHaveAttribute(
          "data-theme",
          presentation.theme
        );
        const root = page
          .locator(
            '.mx-demo [data-adapttable-part="root"], .ai-demo__stage [data-adapttable-part="root"]'
          )
          .first();
        await expect(root).toBeVisible();
        await expect(root).toHaveCSS(
          "direction",
          locale === "ar" ? "rtl" : "ltr"
        );
        await expect(
          root
            .locator(
              '[data-adapttable-part="row"][data-row-id], [data-adapttable-part="card"]'
            )
            .first()
        ).toBeVisible();
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
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
        await root.evaluate((element) =>
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

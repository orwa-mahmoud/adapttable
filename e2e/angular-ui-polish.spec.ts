/** Responsive loading, native control alignment and opaque pinned-cell regressions. */
import { expect, test } from "@playwright/test";

import { builtAdapters, featuresOf } from "../apps/showcase/matrix.mjs";

for (const kit of builtAdapters("angular")) {
  for (const suffix of [
    "",
    ...featuresOf(kit).map((feature) => feature.slug),
  ]) {
    const route = `/${kit.key}/${suffix ? suffix + "/" : ""}`;
    test(`${route}: pre-mount copy fits a 320px viewport`, async ({
      browser,
      baseURL,
    }) => {
      const context = await browser.newContext({
        javaScriptEnabled: false,
        viewport: { width: 320, height: 844 },
      });
      try {
        const page = await context.newPage();
        await page.goto(new URL(route, baseURL).href, {
          waitUntil: "domcontentloaded",
        });
        await expect(page.locator(".at-fallback")).toBeVisible();
        const width = await page.evaluate(() => ({
          document: document.documentElement.scrollWidth,
          viewport: window.innerWidth,
        }));
        expect(width.document).toBeLessThanOrEqual(width.viewport + 1);
      } finally {
        await context.close();
      }
    });
  }
}

test("NG-ZORRO search prefix stays in its native input group", async ({
  page,
}) => {
  await page.goto("/ng-zorro/filtering/");
  const group = page
    .locator('nz-input-wrapper[data-adapttable-part="search-field"]')
    .first();
  await expect(group).toBeVisible();
  const icon = await group
    .locator('[data-adapttable-part="search-icon"]')
    .boundingBox();
  const input = await group
    .locator('input[data-adapttable-part="search"]')
    .boundingBox();
  expect(icon).not.toBeNull();
  expect(input).not.toBeNull();
  expect(
    Math.abs(icon!.y + icon!.height / 2 - input!.y - input!.height / 2)
  ).toBeLessThan(3);
  await group.getByRole("searchbox").fill("No matching person");
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(0);
  await group.getByRole("searchbox").clear();
  await expect(
    page.locator('[data-adapttable-part="row"]').first()
  ).toBeVisible();
});

test("NG-ZORRO pinned body cells paint over horizontally scrolling text", async ({
  page,
}) => {
  await page.goto("/ng-zorro/columns/");
  const pinned = page
    .locator('td[data-adapttable-part="cell"][data-pinned]')
    .first();
  await expect(pinned).toBeVisible();
  const color = await pinned.evaluate(
    (element) => getComputedStyle(element).backgroundColor
  );
  expect(color).not.toBe("rgba(0, 0, 0, 0)");
  expect(color).not.toBe("transparent");
  const before = await pinned.boundingBox();
  await page
    .locator('[data-adapttable-part="scroll-box"]')
    .first()
    .evaluate((element) => {
      element.scrollLeft = 160;
    });
  const after = await pinned.boundingBox();
  expect(before).not.toBeNull();
  expect(after).not.toBeNull();
  expect(Math.abs(before!.x - after!.x)).toBeLessThanOrEqual(1);
  await expect(pinned).toContainText("Ada Lovelace");
});

for (const key of [
  "unstyled",
  "ng-zorro",
  "material",
  "ng-bootstrap",
  "aria",
  "ngx-bootstrap",
  "angular-cdk",
  "spartan",
  "taiga-ui",
]) {
  for (const locale of ["en", "ar"]) {
    test(`${key} ${locale}: filters stay beneath their trigger with reachable dismissal`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 856 });
      await page.goto(`/angular-main/?kit=${key}`);
      if (locale === "ar")
        await page
          .getByRole("combobox", { name: "Locale", exact: true })
          .selectOption("ar");
      const trigger = page.getByRole("button", {
        name: locale === "ar" ? "عوامل التصفية" : "Filters",
        exact: true,
      });
      await trigger.click();
      const nativePanelSelectors: Readonly<Record<string, string>> = {
        material: ".adapt-material-filters-popover",
        "ng-zorro": ".ant-popover section[dir]",
      };
      const panel = page.locator(
        nativePanelSelectors[key] ??
          '[data-adapttable-part="filters-popover"], [data-spartan-part="filters-popover"], [data-taiga-part="filters-popover"], [data-ng-bootstrap-part="filters-popover"], [data-ngx-bootstrap-part="filters-popover"]'
      );
      await expect(panel).toBeVisible();
      await expect
        .poll(async () => {
          const anchor = await trigger.boundingBox();
          const card = await panel.boundingBox();
          return card!.y - anchor!.y - anchor!.height;
        })
        .toBeGreaterThanOrEqual(0);
      const person = panel.getByRole("textbox", {
        name: locale === "ar" ? "الشخص" : "Person",
        exact: true,
      });
      const operator = panel
        .getByRole("combobox", {
          name: locale === "ar" ? "المُعامل" : "Operator",
          exact: true,
        })
        .first();
      const personBox = await person.boundingBox();
      const operatorBox = await operator.boundingBox();
      expect(personBox!.width).toBeGreaterThan(80);
      expect(Math.abs(personBox!.y - operatorBox!.y)).toBeLessThanOrEqual(8);
      const done = panel.locator("footer button").last();
      await expect(done).toBeVisible();
      expect(
        (await done.boundingBox())!.y + (await done.boundingBox())!.height
      ).toBeLessThanOrEqual(856);
      const core = panel.getByRole("checkbox", {
        name: locale === "ar" ? "الأساسية" : "Core",
        exact: true,
      });
      // Brain's button reflects checked state after Angular's render, unlike
      // a native input whose checked property changes during the click.
      if (key === "spartan") await core.click();
      else await core.check();
      await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(6);
      await expect(
        panel.getByRole("checkbox", {
          name: locale === "ar" ? "الأساسية" : "Core",
          exact: true,
        })
      ).toBeChecked();
      await page.screenshot({
        path: testInfo.outputPath("native-filter-under-button.png"),
      });
      await done.click();
      await expect(panel).toBeHidden();
      await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(6);
    });
  }
}

test("NG-ZORRO native overlays follow the selected light and dark theme", async ({
  page,
}) => {
  await page.goto("/angular-main/?kit=ng-zorro");
  const theme = page.getByRole("button", { name: "Toggle dark mode" });
  const background = () =>
    page
      .locator(".ant-popover-inner")
      .evaluate((element) => getComputedStyle(element).backgroundColor);
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect(page.locator(".ant-popover-inner")).toBeVisible();
  await expect.poll(background).toBe("rgb(255, 255, 255)");
  await theme.click();
  await page.getByRole("button", { name: "Filters", exact: true }).click();
  await expect.poll(background).toBe("rgb(31, 31, 31)");
  const card = page.locator(".ant-popover-inner");
  await card.getByRole("checkbox", { name: "Core", exact: true }).check();
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(6);
  await theme.click();
  await page.getByRole("button", { name: "Filters (1)", exact: true }).click();
  await expect.poll(background).toBe("rgb(255, 255, 255)");
  await card.getByRole("button", { name: "Done", exact: true }).click();
  await page
    .getByRole("radio", { name: "Angular Material", exact: true })
    .check();
  await expect(
    page.locator('[data-angular-kit="material"] table')
  ).toBeVisible();
  await expect(page.locator('link[href*="ng-zorro-antd"]')).toHaveCount(0);
});

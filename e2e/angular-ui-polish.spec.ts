/** Responsive loading, native control alignment and opaque pinned-cell regressions. */
import { expect, type Locator, test } from "@playwright/test";

import { builtAdapters, featuresOf } from "../apps/showcase/matrix.mjs";

async function expectMaterialClearAllFits(chips: Locator, locale: string) {
  const clear = chips.getByRole("button", {
    name: locale === "ar" ? "مسح الكل" : "Clear all",
    exact: true,
  });
  await expect(clear).toHaveClass(/mat-mdc-button/);
  await expect(clear).not.toHaveClass(/mat-mdc-chip-remove/);
  await expect(clear).toHaveAttribute("data-adapttable-part", "chip-remove");
  const bounds = await clear.evaluate((button) => {
    const label = button.querySelector(".mdc-button__label")!;
    const range = document.createRange();
    range.selectNodeContents(label);
    const lines = [...range.getClientRects()].filter(
      (rect) => rect.width > 0 && rect.height > 0
    );
    const edges = (rect: DOMRect) => ({
      left: rect.left,
      right: rect.right,
      top: rect.top,
      bottom: rect.bottom,
    });
    return {
      button: edges(button.getBoundingClientRect()),
      label: edges(range.getBoundingClientRect()),
      lineCount: new Set(lines.map((rect) => Math.round(rect.top))).size,
      viewportWidth: document.documentElement.clientWidth,
      clientWidth: button.clientWidth,
      scrollWidth: button.scrollWidth,
    };
  });
  expect(bounds.lineCount).toBe(1);
  expect(bounds.label.left).toBeGreaterThanOrEqual(bounds.button.left - 1);
  expect(bounds.label.right).toBeLessThanOrEqual(bounds.button.right + 1);
  expect(bounds.label.top).toBeGreaterThanOrEqual(bounds.button.top - 1);
  expect(bounds.label.bottom).toBeLessThanOrEqual(bounds.button.bottom + 1);
  expect(bounds.scrollWidth).toBeLessThanOrEqual(bounds.clientWidth + 1);
  expect(bounds.button.left).toBeGreaterThanOrEqual(0);
  expect(bounds.button.right).toBeLessThanOrEqual(bounds.viewportWidth);
  return clear;
}

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
    test(`${key} ${locale}: filters stay anchored with reachable dismissal`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 1440, height: 856 });
      await page.goto(`/angular-main/?kit=${key}`);
      if (locale === "ar")
        await page.getByRole("radio", { name: "العربية", exact: true }).check();
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
      const surface =
        key === "material"
          ? page.locator(".cdk-overlay-pane .adapt-material-filter-card")
          : panel;
      await expect
        .poll(async () => {
          const anchor = await trigger.boundingBox();
          const card = await surface.boundingBox();
          if (!anchor || !card) return false;
          return (
            card.y >= anchor.y + anchor.height ||
            card.y + card.height <= anchor.y
          );
        })
        .toBe(true);
      if (key === "material") {
        await expect(surface).toBeInViewport({ ratio: 1 });
        await expect(panel.locator("header")).toBeInViewport({ ratio: 1 });
      }
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
      if (key === "unstyled" || key === "aria") {
        // Native intrinsic widths vary with platform font metrics. Keep the
        // controls paired even when the input's intrinsic size is larger.
        await person.evaluate((input) => input.setAttribute("size", "40"));
      }
      const personBox = await person.boundingBox();
      const operatorBox = await operator.boundingBox();
      expect(personBox!.width).toBeGreaterThan(80);
      expect(Math.abs(personBox!.y - operatorBox!.y)).toBeLessThanOrEqual(8);
      const done = panel.locator("footer button").last();
      await expect(done).toBeVisible();
      if (key === "material") await expect(done).toBeInViewport({ ratio: 1 });
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
      const capture = testInfo.outputPath(
        key === "material"
          ? `material-filter-layout-polish-${locale}.png`
          : "native-filter-anchored.png"
      );
      await page.screenshot({ path: capture });
      if (key === "material") {
        await testInfo.attach("Material anchored filters", {
          path: capture,
          contentType: "image/png",
        });
        await expectMaterialClearAllFits(
          page.locator('[data-adapttable-part="chips"]'),
          locale
        );
      }
      await done.click();
      await expect(panel).toBeHidden();
      await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(6);
      if (key === "material") {
        const chips = page.locator('[data-adapttable-part="chips"]');
        const clear = await expectMaterialClearAllFits(chips, locale);
        await clear.focus();
        await page.keyboard.press("Shift+Tab");
        await expect(clear).not.toBeFocused();
        await page.keyboard.press("Tab");
        await expect(clear).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(chips).toHaveCount(0);
        await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(
          10
        );

        await trigger.click();
        await core.check();
        await done.click();
        await expect(panel).toBeHidden();
        await page.setViewportSize({ width: 320, height: 844 });
        await expect(page.locator('[data-adapttable-part="card"]')).toHaveCount(
          6
        );
        await chips.scrollIntoViewIfNeeded();
        const mobileClear = await expectMaterialClearAllFits(chips, locale);
        await expect(mobileClear).toBeInViewport({ ratio: 1 });
        const mobileCapture = testInfo.outputPath(
          `material-chip-clear-mobile-${locale}.png`
        );
        await page.screenshot({ path: mobileCapture });
        await testInfo.attach("Material mobile chip actions", {
          path: mobileCapture,
          contentType: "image/png",
        });
        await mobileClear.focus();
        await page.keyboard.press("Shift+Tab");
        await expect(mobileClear).not.toBeFocused();
        await page.keyboard.press("Tab");
        await expect(mobileClear).toBeFocused();
        await page.keyboard.press("Space");
        await expect(chips).toHaveCount(0);
        await expect(page.locator('[data-adapttable-part="card"]')).toHaveCount(
          10
        );
      }
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

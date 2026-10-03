/** Framework navigation retains context without cross-binding documentation leaks. */
import { expect, test } from "@playwright/test";

import { ORIGIN } from "../../scripts/site.mjs";
import { expectNoBlockingAxe } from "../axe";

const DOCS_URL = "http://localhost:4323";
const SWITCH = "[data-framework-select]:visible";
test.use({ baseURL: DOCS_URL });

test("an unavailable counterpart explains the Angular destination", async ({
  page,
}) => {
  await page.goto("/react/migrate-from-ag-grid/", {
    waitUntil: "domcontentloaded",
  });
  await page.locator(SWITCH).first().selectOption("angular");
  await expect(page).toHaveURL(
    `${DOCS_URL}/angular/getting-started/?unavailable=migrate-from-ag-grid`
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Get started with Angular tables"
  );
  await expect(page.locator("[data-framework-notice]")).toContainText(
    "not available for Angular"
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${ORIGIN}/angular/getting-started/`
  );
  await expect(page.locator("main .sl-markdown-content")).toContainText(
    "AdaptDataTable"
  );
});

test("shared guides remember the framework across navigation and reload", async ({
  page,
}) => {
  await page.goto("/concepts/", { waitUntil: "domcontentloaded" });
  for (const framework of ["angular", "react"]) {
    await page.locator(SWITCH).first().selectOption(framework);
    await expect(page).toHaveURL(`${DOCS_URL}/concepts/`);
    await expect(page.locator(SWITCH).first()).toHaveValue(framework);
    await page.reload();
    await expect(page.locator(SWITCH).first()).toHaveValue(framework);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Headless engine, React and Angular bindings"
    );
    await expect(
      page
        .locator("#starlight__sidebar a")
        .filter({ hasText: /^Getting started$/ })
        .first()
    ).toHaveAttribute("href", `/${framework}/getting-started/`);
  }
});

test("Angular sidebar and header remain in Angular after changing topics", async ({
  page,
}) => {
  await page.goto("/angular/sparkline/");
  await expect(
    page.locator('#starlight__sidebar a[href^="/react/"]')
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "Live demo", exact: true }).first()
  ).toHaveAttribute("href", "/angular/demo/unstyled/");
  await page.locator('#starlight__sidebar a[href="/angular/sorting/"]').click();
  await expect(page).toHaveURL(`${DOCS_URL}/angular/sorting/`);
  await page.goBack();
  await expect(page).toHaveURL(`${DOCS_URL}/angular/sparkline/`);
  await expect(page.locator(SWITCH).first()).toHaveValue("angular");
});

for (const width of [320, 390]) {
  test(`framework selection remains visible and keyboard accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/react/sorting/", { waitUntil: "domcontentloaded" });
    const select = page.locator(SWITCH).first();
    await expect(select).toBeVisible();
    await expect(select).toHaveValue("react");
    await expect(select.locator("option")).toHaveCount(2);
    const box = await select.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    expect(box!.height).toBeGreaterThanOrEqual(24);
    await expectNoBlockingAxe(page, ".site-brand");
    for (let tabs = 0; tabs < 12; tabs += 1) {
      await page.keyboard.press("Tab");
      if (
        await select.evaluate((element) => element === document.activeElement)
      )
        break;
    }
    await expect(select).toBeFocused();
    const focus = await select.evaluate((element) => ({
      style: getComputedStyle(element).outlineStyle,
      width: Number.parseFloat(getComputedStyle(element).outlineWidth),
    }));
    expect(focus.style).toBe("solid");
    expect(focus.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${DOCS_URL}/angular/sorting/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Angular table sorting and multi-sort"
    );
    await expect(page.locator(SWITCH).first()).toHaveValue("angular");
    await expect(page.locator(SWITCH).first()).toBeVisible();
  });
}

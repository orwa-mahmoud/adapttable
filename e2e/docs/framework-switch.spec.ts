/** Exercise framework navigation, shared guides and accessible docs controls. */
import { expect, test } from "@playwright/test";

import { ORIGIN } from "../../scripts/site.mjs";
import { expectNoBlockingAxe } from "../axe";

const DOCS_URL = "http://localhost:4323";
const SWITCH = 'nav[aria-label="Framework documentation"]';

test.use({ baseURL: DOCS_URL });

test("a React-only guide switches to Angular getting started", async ({
  page,
}) => {
  await page.goto("/react/migrate-from-ag-grid/", {
    waitUntil: "domcontentloaded",
  });
  const angular = page
    .locator(SWITCH)
    .getByRole("link", { name: "Angular", exact: true });
  await expect(angular).toHaveAttribute("href", "/angular/getting-started/");
  await angular.click();
  await expect(page).toHaveURL(`${DOCS_URL}/angular/getting-started/`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Get started with Angular tables"
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${ORIGIN}/angular/getting-started/`
  );
  await expect(page.locator("main .sl-markdown-content")).toContainText(
    "AdaptDataTable"
  );
});

test("shared concepts remain shared when changing framework", async ({
  page,
}) => {
  await page.goto("/concepts/", { waitUntil: "domcontentloaded" });
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveText(
    "Headless engine, React and Angular bindings"
  );
  for (const name of ["Angular", "React"]) {
    const link = page.locator(SWITCH).getByRole("link", { name, exact: true });
    await expect(link).toHaveAttribute("href", "/concepts/");
    await expect(link).not.toHaveAttribute("aria-current", "page");
    await link.click();
    await expect(page).toHaveURL(`${DOCS_URL}/concepts/`);
    await expect(heading).toHaveText(
      "Headless engine, React and Angular bindings"
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `${ORIGIN}/concepts/`
    );
  }
});

for (const width of [320, 390]) {
  test(`the framework switch is visible and keyboard accessible at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto("/react/sorting/", { waitUntil: "domcontentloaded" });
    const frameworks = page.getByRole("navigation", {
      name: "Framework documentation",
      exact: true,
    });
    await expect(frameworks).toBeVisible();
    await expect(frameworks.getByRole("link")).toHaveCount(2);
    const react = frameworks.getByRole("link", { name: "React", exact: true });
    const angular = frameworks.getByRole("link", {
      name: "Angular",
      exact: true,
    });
    await expect(react).toHaveAttribute("aria-current", "page");
    await expect(angular).not.toHaveAttribute("aria-current", "page");
    for (const link of [react, angular]) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.y + box!.height).toBeLessThanOrEqual(844);
      expect(box!.height).toBeGreaterThanOrEqual(24);
    }
    await expectNoBlockingAxe(page, SWITCH);

    // Enter the switch by real tab navigation, without assigning focus.
    for (let tabs = 0; tabs < 12; tabs += 1) {
      await page.keyboard.press("Tab");
      if (await angular.evaluate((link) => link === document.activeElement))
        break;
    }
    await expect(angular).toBeFocused();
    const focus = await angular.evaluate((link) => {
      const style = getComputedStyle(link);
      return {
        style: style.outlineStyle,
        width: Number.parseFloat(style.outlineWidth),
      };
    });
    expect(focus.style).toBe("solid");
    expect(focus.width).toBeGreaterThanOrEqual(2);
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(`${DOCS_URL}/angular/sorting/`);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Angular table sorting and multi-sort"
    );
    await expect(
      frameworks.getByRole("link", { name: "Angular", exact: true })
    ).toHaveAttribute("aria-current", "page");
    await expect(frameworks).toBeVisible();
  });
}

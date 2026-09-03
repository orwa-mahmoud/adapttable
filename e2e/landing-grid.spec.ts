import { expect, test } from "@playwright/test";

import { builtAdapters, MATRIX_FEATURES } from "../apps/showcase/matrix.mjs";

const KIT = builtAdapters()[0]!.key;

async function columnCount(grid: {
  evaluate: (fn: (el: Element) => number) => Promise<number>;
}): Promise<number> {
  return grid.evaluate((el) => {
    const value = getComputedStyle(el).gridTemplateColumns;
    return value.split(/\s+(?![^(]*\))/).filter(Boolean).length;
  });
}

test("the kit landing grid is three, two, then one column", async ({
  page,
}) => {
  await page.goto(`/${KIT}/`);
  const grid = page.locator(".mx-grid");
  await expect(grid).toBeVisible();
  await expect(grid.locator("a")).toHaveCount(MATRIX_FEATURES.length);

  await page.setViewportSize({ width: 1280, height: 800 });
  expect(await columnCount(grid)).toBe(3);

  await page.setViewportSize({ width: 900, height: 800 });
  expect(await columnCount(grid)).toBe(2);

  await page.setViewportSize({ width: 390, height: 844 });
  expect(await columnCount(grid)).toBe(1);
});

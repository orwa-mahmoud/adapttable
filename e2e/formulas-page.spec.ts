import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

import { gotoFromFeatureGrid } from "./nav";

/**
 * The /formulas/ page.
 *
 * A formula column is worth a page of its own because it is the one column the
 * reader creates: everything else on the table is a choice among things the
 * table offered. So the tests here type one, read the arithmetic that appears,
 * and check the two failures a formula engine has to survive in public — a
 * value that cannot be computed, and two formulas that reference each other.
 *
 * The cells are found by `data-column-key`, which every kit puts on the header
 * and the cell alike, so the same assertions hold across the switcher.
 */

/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive.
 */
/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

const KITS = builtAdapters().map((adapter) => adapter.key);

/** Priya Nair is row 1 on this page; her budget still derives from id 1: 25300. */
const ADA_MARGIN = "3795";

const table = (page: Page) => page.locator('[data-adapter="mantine"]');

/** Every body cell of one formula column, in the order the table shows them. */
async function columnText(root: Locator, key: string): Promise<string[]> {
  return root.locator(`tbody [data-column-key="${key}"]`).allTextContents();
}

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Formulas");
  await expect(page).toHaveURL(/\/formulas\/$/);
});

test("opens with columns the page never declared", async ({ page }) => {
  await page.goto(`/${KIT}/formulas/`);
  // `=ROUND(budget * 0.15, 0)` and `=UPPER(team) & " · " & role`, computed per
  // row from fields the table already had.
  await expect(
    table(page).locator(`tbody [data-column-key="margin"]`).first()
  ).toHaveText(ADA_MARGIN);
  await expect(
    table(page).locator(`tbody [data-column-key="tag"]`).first()
  ).toHaveText("CORE · Engineer");
  await expect(page.getByTestId("formula-report")).toContainText(
    "every formula parses"
  );
});

test("a typed formula becomes a column of computed values", async ({
  page,
}) => {
  await page.goto(`/${KIT}/formulas/`);

  await page.getByTestId("formula-name").fill("Doubled");
  await page.getByTestId("formula-text").fill("=budget * 2");
  await page.getByTestId("formula-add").click();

  const cells = table(page).locator('tbody [data-column-key="Doubled"]');
  await expect(cells.first()).toHaveText("50600");
  // Every visible row computed, not just the first.
  expect((await cells.allTextContents()).filter(Boolean)).toHaveLength(5);
  await expect(
    table(page).locator('thead [data-column-key="Doubled"]')
  ).toContainText("Doubled");
});

test("POWER and SQRT compute from the example buttons", async ({ page }) => {
  await page.goto(`/${KIT}/formulas/`);
  await page.getByTestId("formula-example-power").click();
  await expect(
    table(page).locator('tbody [data-column-key="power"]').first()
  ).toHaveText("8");

  await page.getByTestId("formula-example-root").click();
  await expect(
    table(page).locator('tbody [data-column-key="root"]').first()
  ).toHaveText("159");
});

test("a formula that cannot compute shows its error in the cell", async ({
  page,
}) => {
  await page.goto(`/${KIT}/formulas/`);
  await page.getByTestId("formula-example-broken").click();

  await expect(
    table(page).locator('tbody [data-column-key="broken"]').first()
  ).toHaveText("#DIV/0!");
  // The rest of the table is unharmed: one broken column is one broken column.
  await expect(
    table(page).locator('tbody [data-column-key="margin"]').first()
  ).toHaveText(ADA_MARGIN);
});

test("two formulas in a loop read #CYCLE! instead of recursing", async ({
  page,
}) => {
  await page.goto(`/${KIT}/formulas/`);
  await page.getByTestId("formula-example-loop").click();

  await expect(
    table(page).locator('tbody [data-column-key="loop"]').first()
  ).toHaveText("#CYCLE!");
  await expect(
    table(page).locator('tbody [data-column-key="knot"]').first()
  ).toHaveText("#CYCLE!");
  await expect(page.getByTestId("formula-report")).toContainText(
    "reference each other"
  );
});

test("a text formula column sorts alphabetically from its header", async ({
  page,
}) => {
  await page.goto(`/${KIT}/formulas/`);
  await page.getByTestId("formula-example-shout").click();

  // The sort control is a button inside the header cell, in every kit.
  const header = table(page).locator(
    'thead [data-column-key="shout"] button:not([data-adapttable-part])'
  );
  // Sorting reorders all thirty rows and re-pages, so the page changes and
  // what it shows is in order. A column whose every sort key was equal — the
  // bug — would have left both untouched.
  const seed = await columnText(table(page), "shout");
  await header.click();
  await expect
    .poll(async () => columnText(table(page), "shout"))
    .not.toEqual(seed);
  const ascending = await columnText(table(page), "shout");
  expect(ascending).toEqual([...ascending].sort((a, b) => a.localeCompare(b)));

  // And the second click reverses it: the page shows the LAST five names.
  await header.click();
  await expect
    .poll(async () => (await columnText(table(page), "shout"))[0])
    .not.toBe(ascending[0]);
  const descending = await columnText(table(page), "shout");
  expect(descending).toEqual(
    [...descending].sort((a, b) => b.localeCompare(a))
  );
});

test("removing a column takes it out of the table", async ({ page }) => {
  await page.goto(`/${KIT}/formulas/`);
  await page.getByTestId("formula-remove-tag").click();

  await expect(
    table(page).locator('tbody [data-column-key="tag"]')
  ).toHaveCount(0);
});

for (const kit of KITS) {
  test(`${kit}: renders the computed columns`, async ({ page }) => {
    await page.goto(`/${kit}/formulas/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();

    // Same values in every kit: the engine is core's, the pixels are the kit's.
    await expect(
      root.locator('tbody [data-column-key="margin"]').first()
    ).toHaveText(ADA_MARGIN);
    await expect(
      root.locator('tbody [data-column-key="tag"]').first()
    ).toHaveText("CORE · Engineer");
  });
}

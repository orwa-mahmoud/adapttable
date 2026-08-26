import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { pickAddField } from "./feature-lab";

/**
 * The /pivot/ page.
 *
 * A pivot is worth a page of its own because it is the one table shape a
 * grid cannot fake, and because the thing most pivot UIs get wrong is the
 * keyboard. So the tests here drive the panel with keys and check the
 * arithmetic that appears — a pivot whose subtotals disagree with its grand
 * total is worse than no pivot.
 *
 * The table is the kit's own `DataTable` fed by `pivotTableModel`, so the
 * columns are found the way every other page finds them: by `data-column-key`,
 * which is `pivot-row` for the row headers and `pivot-N` for the Nth rendered
 * column of the pivot. Those hold across the switcher.
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

const table = (page: Page) => page.getByTestId("pivot-table");

/** Every body cell of one pivot column, top to bottom. */
const cells = (root: Locator, key: string) =>
  root.locator(`tbody [data-column-key="${key}"]`);

/**
 * The grand-total line: the table's own summary row, aligned under the columns.
 *
 * Where a kit puts it is the kit's business — Mantine, MUI, antd and the native
 * shell use a real `<tfoot>`, Radix and Base UI a marked last row — so the
 * cross-kit assertions find it by its caption and only the default kit's tests
 * reach for the footer element itself.
 */
const footer = (root: Locator) => root.locator("tfoot");

const parse = (text: string) => Number(text.replaceAll(/[^0-9.-]/g, "")) || 0;

test("opens already pivoted, with a header row per column value", async ({
  page,
}) => {
  await page.goto(`/${KIT}/pivot/`);
  await expect(table(page)).toBeVisible();

  // The default puts teams down the side and statuses across the top.
  await expect(page.getByRole("group", { name: "Rows" })).toContainText("Team");
  await expect(page.getByRole("group", { name: "Columns" })).toContainText(
    "Status"
  );
  // The column dimension became a spanning header row above the measures —
  // the kit's own header groups, from the engine's column tree.
  await expect(
    table(page).locator("thead tr").first().locator("th")
  ).not.toHaveCount(0);
  await expect(table(page).locator("tbody tr")).not.toHaveCount(0);
  // Rows down the side are captioned by the dimension they answer for.
  await expect(
    table(page).locator('thead [data-column-key="pivot-row"]')
  ).toContainText("Team");
});

test("a registered aggregator name in the URL is the measure", async ({
  page,
}) => {
  await page.goto(`/${KIT}/pivot/?pivot=rows:team;cols:status;range:budget`);
  await expect(table(page).locator("thead")).toContainText(/range/i);
});

test("totals every column, and the grand total agrees with the rows", async ({
  page,
}) => {
  await page.goto(`/${KIT}/pivot/`);

  const total = footer(table(page)).locator('[data-column-key="pivot-0"]');
  await expect(total).toBeVisible();

  // Every currency cell in the first pivot column, summed, must equal the
  // footer's cell for that same column.
  const numbers = await cells(table(page), "pivot-0").allTextContents();
  const summed = numbers.reduce((sum, text) => sum + parse(text), 0);
  expect(numbers.length).toBeGreaterThan(1);
  expect(summed).toBeGreaterThan(0);
  expect(parse((await total.textContent()) ?? "")).toBe(summed);
});

test("the grand total is the table's footer, not one more line of data", async ({
  page,
}) => {
  await page.goto(`/${KIT}/pivot/`);

  await expect(footer(table(page))).toContainText("Grand total");
  // And it is NOT in the body: two places to read one number is how they end
  // up disagreeing.
  await expect(
    table(page).locator("tbody").getByText("Grand total")
  ).toHaveCount(0);
});

test("builds a pivot with the keyboard alone", async ({ page }) => {
  await page.goto(`/${KIT}/pivot/`);

  // Add a second row dimension using only keys.
  // Add a second row dimension using only keys.
  const rows = page.getByRole("group", { name: "Rows" });
  await pickAddField(page, rows, "Role");

  await expect(rows).toContainText("Role");
  // A second dimension brings subtotal lines with it.
  await expect(
    table(page).locator("tbody tr.pivot-line--subtotal").first()
  ).toBeVisible();
});

test("removing a column field leaves the zone empty", async ({ page }) => {
  await page.goto(`/${KIT}/pivot/`);

  const remove = page
    .getByRole("group", { name: "Columns" })
    .getByRole("button", { name: /Remove field/ })
    .first();
  await remove.click();

  await expect(
    page
      .getByRole("group", { name: "Columns" })
      .locator('[data-adapttable-part="pivot-field"]')
  ).toHaveCount(0);
});

test("folding a group hides the rows beneath it", async ({ page }) => {
  await page.goto(`/${KIT}/pivot/`);

  const rows = page.getByRole("group", { name: "Rows" });
  await pickAddField(page, rows, "Role");

  const lines = table(page).locator("tbody tr");
  const fold = table(page).getByTestId("pivot-fold").first();
  await expect(fold).toHaveAttribute("aria-expanded", "true");
  const before = await lines.count();

  await fold.click();

  // The group keeps its own line with its own total; what goes is the detail
  // beneath it.
  await expect(fold).toHaveAttribute("aria-expanded", "false");
  const after = await lines.count();
  expect(after).toBeLessThan(before);
});

test("changing a measure's aggregation changes the numbers", async ({
  page,
}) => {
  await page.goto(`/${KIT}/pivot/`);

  // The grand total, not the first data cell: a single team/status pair can
  // legitimately be empty, and an empty cell proves nothing either way.
  const grandCell = footer(table(page)).locator('[data-column-key="pivot-0"]');
  const before = await grandCell.textContent();

  const agg = page
    .getByRole("group", { name: "Measures" })
    .getByRole("combobox", { name: "Aggregation" });
  await agg.click();
  await page.getByRole("option", { name: "avg", exact: true }).click();

  await expect(grandCell).not.toHaveText(before ?? "");
});

for (const kit of KITS) {
  test(`${kit}: renders the pivot with its own table`, async ({ page }) => {
    // Two row dimensions, so a subtotal line and its fold control are on
    // screen in every kit rather than only where the default puts them.
    await page.goto(`/${kit}/pivot/`);
    const root = page.locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();

    await pickAddField(page, root.getByRole("group", { name: "Rows" }), "Role");
    const pivot = root.getByTestId("pivot-table");

    // The engine's numbers, the kit's pixels: the row headers, a measure
    // column, the fold control on a subtotal, and the grand-total line.
    await expect(
      pivot.locator('tbody [data-column-key="pivot-row"]').first()
    ).not.toBeEmpty();
    await expect(cells(pivot, "pivot-0").first()).toBeVisible();
    await expect(pivot.getByTestId("pivot-fold").first()).toBeVisible();
    await expect(pivot.getByText("Grand total")).toBeVisible();
  });
}

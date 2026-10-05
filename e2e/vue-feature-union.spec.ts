import { expect, type Locator, type Page, test } from "@playwright/test";

const route = "/vue/unstyled/feature-union/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const tableOf = (page: Page) =>
  page.locator('[data-demo-table="feature-union"]');
const rowOf = (table: Locator, id: string) =>
  table.locator(`tbody [data-row-id="${id}"]`);
const cellOf = (table: Locator, row: string, column: string) =>
  rowOf(table, row).locator(`td[data-column-key="${column}"]`);

async function openFarMatch(page: Page): Promise<Locator> {
  const table = tableOf(page);
  await table.locator(part("find-button")).click();
  const input = table.locator(part("find-input"));
  await input.fill("far-cell-120");
  const match = cellOf(table, "leaf-120", "metric-18");
  await expect(match).toBeVisible();
  await expect(match).toHaveAttribute("data-cell-match-current", "");
  await expect(input).toBeFocused();
  return match;
}

test("pending keyboard focus follows newly mounted virtual rows and RTL columns", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto(route);
  const table = tableOf(page);
  await expect(table).toHaveAttribute("dir", "rtl");
  await expect(table.locator('[data-column-key="secret"]')).toHaveCount(0);
  await expect(rowOf(table, "destination")).toHaveCount(0);
  await expect
    .poll(() => table.locator("tbody [data-row-id]").count())
    .toBeLessThan(80);
  await expect
    .poll(() => table.locator("thead [data-column-key]").count())
    .toBeLessThan(26);

  const first = cellOf(table, "source", "name");
  await first.focus();
  await first.press("ControlOrMeta+End");
  const last = cellOf(table, "destination", "tail");
  await expect(last).toHaveAttribute("data-grid-cell", "161:25");
  await expect(last).toBeFocused();
  await expect(page.locator("#union-source-version")).toHaveText("1");
  await expect(page.locator("#union-edit-count")).toHaveText("0");
  await expect(page.locator("#union-move-count")).toHaveText("0");

  // In RTL, ArrowRight moves toward the previous logical column. That column
  // starts outside the DOM window, so focus must be retried after it mounts.
  await expect(cellOf(table, "destination", "metric-23")).toHaveCount(0);
  await last.press("ArrowRight");
  const previous = cellOf(table, "destination", "metric-23");
  await expect(previous).toHaveAttribute("data-grid-cell", "161:24");
  await expect(previous).toBeFocused();
  await expect
    .poll(() =>
      table
        .locator(part("scroll-box"))
        .evaluate((element) => element.scrollLeft)
    )
    .toBeLessThan(-100);
  await expect(table.locator('thead [data-column-key="name"]')).toHaveCSS(
    "position",
    "sticky"
  );
  await expect(table.locator('thead [data-column-key="tail"]')).toHaveCSS(
    "position",
    "sticky"
  );
  await expect(table.locator('[data-column-key="secret"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("find reveals a logical descendant and range export differs from source page export", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto(route);
  const table = tableOf(page);
  await expect(cellOf(table, "leaf-120", "metric-18")).toHaveCount(0);
  const match = await openFarMatch(page);
  await expect(match).toHaveAttribute("data-grid-cell", "121:19");
  await expect(match).toHaveAttribute("data-cell-selected", "");
  await expect(table.locator("tbody td[data-cell-selected]")).toHaveCount(1);
  // The callback reports multi-cell rectangles; range export also accepts the focused cell.
  await expect(page.locator("#union-range")).toHaveText("null");
  await table.locator(part("export-csv-button")).click();
  await expect(page.locator("#union-export")).toHaveText(
    JSON.stringify({
      scope: "range",
      rowIds: ["leaf-120"],
      columnKeys: ["metric-18"],
    })
  );
  await page.getByLabel("Export scope", { exact: true }).selectOption("page");
  await table.locator(part("export-csv-button")).click();
  const expectedColumns = [
    "name",
    ...Array.from({ length: 24 }, (_, index) => `metric-${index}`),
    "tail",
  ];
  await expect(page.locator("#union-export")).toHaveText(
    JSON.stringify({
      scope: "page",
      rowIds: ["source", "destination"],
      columnKeys: expectedColumns,
    })
  );
  await expect(page.locator("#union-export-count")).toHaveText("2");
  await expect
    .poll(() => table.locator("tbody [data-row-id]").count())
    .toBeLessThan(80);
});

test("loaded descendants remain selectable and editing waits for host acceptance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto(route);
  const table = tableOf(page);
  await openFarMatch(page);
  await table.locator(part("find-close")).click();
  const child = rowOf(table, "leaf-120");
  await child
    .locator(`${part("selection-cell")} input[type="checkbox"]`)
    .check();
  await expect(page.locator("#union-selected")).toHaveText('["leaf-120"]');
  const score = cellOf(table, "leaf-120", "tail");
  await score.focus();
  await score.press("F2");
  const input = score.locator(part("edit-cell-editor"));
  await input.fill("777");
  await input.press("Enter");
  await expect(page.locator("#union-edit-count")).toHaveText("1");
  await expect(page.locator("#union-accepted-edits")).toHaveText("0");
  await expect(score).toContainText("120");
  await page.getByLabel("Accept edit requests", { exact: true }).check();
  await score.focus();
  await score.press("F2");
  await input.fill("777");
  await input.press("Enter");
  await expect(page.locator("#union-edit-count")).toHaveText("2");
  await expect(page.locator("#union-accepted-edits")).toHaveText("1");
  await expect(score).toContainText("777");
  await expect(page.locator("#union-selected")).toHaveText('["leaf-120"]');
});

test("pending move approvals cannot write through KeepAlive suspension or source replacement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto(route);
  const table = tableOf(page);
  const menu = () =>
    rowOf(table, "leaf-0").locator(`${part("row-move-menu")} select`);
  await page.getByLabel("Accept move requests", { exact: true }).check();
  await menu().selectOption("destination");
  await expect(page.locator("#union-pending")).toHaveText("leaf-0");
  await page
    .getByRole("button", { name: "Suspend table", exact: true })
    .click();
  await expect(table).toHaveCount(0);
  await page
    .getByRole("button", { name: "Approve pending move", exact: true })
    .click();
  await expect(page.locator("#union-move-count")).toHaveText("0");
  await page.getByRole("button", { name: "Resume table", exact: true }).click();
  await menu().selectOption("destination");
  await expect(page.locator("#union-pending")).toHaveText("leaf-0");
  await page
    .getByRole("button", { name: "Replace source rows", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Approve pending move", exact: true })
    .click();
  await expect(page.locator("#union-source-version")).toHaveText("2");
  await expect(page.locator("#union-move-count")).toHaveText("0");
  await expect(page.locator("#union-destination")).toHaveText("[]");

  await page.getByLabel("Accept move requests", { exact: true }).uncheck();
  await menu().selectOption("destination");
  await page
    .getByRole("button", { name: "Approve pending move", exact: true })
    .click();
  await expect(page.locator("#union-move-count")).toHaveText("1");
  await expect(page.locator("#union-accepted-moves")).toHaveText("0");
  await expect(page.locator("#union-destination")).toHaveText("[]");
  await page.getByLabel("Accept move requests", { exact: true }).check();
  await menu().selectOption("destination");
  await page
    .getByRole("button", { name: "Approve pending move", exact: true })
    .click();
  await expect(page.locator("#union-move-count")).toHaveText("2");
  await expect(page.locator("#union-accepted-moves")).toHaveText("1");
  await expect(page.locator("#union-destination")).toHaveText('["leaf-0"]');
});

test("native move confirmation owns Escape and focus without accepting a host write", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1100, height: 850 });
  await page.goto(route);
  await page
    .getByLabel("Use native move confirmation", { exact: true })
    .check();
  const table = tableOf(page);
  const trigger = rowOf(table, "leaf-0").locator(part("row-move-menu-trigger"));
  await trigger.selectOption("destination");
  const dialog = table.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "true");
  await expect(dialog.locator("button:last-of-type")).toBeFocused();
  await dialog.locator("button:last-of-type").press("Tab");
  await expect(dialog.locator("button:first-of-type")).toBeFocused();
  await dialog.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("#union-move-count")).toHaveText("0");
  await trigger.selectOption("destination");
  await dialog.locator("button:first-of-type").click();
  await expect(dialog).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("#union-move-count")).toHaveText("1");
  await expect(page.locator("#union-accepted-moves")).toHaveText("0");
  await expect(page.locator("#union-destination")).toHaveText("[]");
});

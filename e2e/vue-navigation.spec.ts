import { expect, test } from "@playwright/test";
const ROUTE = "/vue/unstyled/navigation/";
const tableSelector = '[data-demo-table="navigation"]';
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test("keyboard range, column checkbox and one combined status strip", async ({
  page,
}) => {
  await page.goto(ROUTE);
  const table = page.locator(tableSelector);
  const first = table.locator('[data-grid-cell="0:1"]');
  await first.focus();
  await first.press("Shift+ArrowDown");
  await expect(table.locator('[data-grid-cell="1:1"]')).toBeFocused();
  await expect(table.locator(part("selection-stats"))).toContainText("40");
  await expect(table.locator(part("status-bar"))).toHaveCount(1);
  await table.getByRole("checkbox", { name: "Select column: Name" }).check();
  await expect(table.locator('[aria-selected="true"]')).toHaveCount(3);
  await table.getByRole("checkbox", { name: "Select column: Name" }).uncheck();
  await expect(table.locator(part("selection-stats"))).toHaveCount(0);
});
test("find retains typing focus, walks matches, shares URL and restores focus", async ({
  page,
}) => {
  await page.goto(ROUTE);
  const table = page.locator(tableSelector);
  const trigger = table.locator(part("find-button"));
  await trigger.click();
  const input = table.locator(part("find-input"));
  await input.fill("a");
  await expect(input).toBeFocused();
  await expect(table.locator("[data-cell-match]")).toHaveCount(3);
  await input.press("Enter");
  await expect(table.locator(part("find-count"))).toHaveText("2 of 3");
  await expect(page).toHaveURL(/navigation.find=a/);
  await input.press("Escape");
  await expect(table.locator(part("find-bar"))).toHaveCount(0);
  await expect(table.locator('[data-grid-cell="1:0"]')).toBeFocused();
  await page.goto(`${ROUTE}?navigation.find=Ada`);
  await expect(
    page.locator(tableSelector).locator(part("find-input"))
  ).toHaveValue("Ada");
});
test("editing owns editor keys, fill requests remain host controlled and undo is one gesture", async ({
  page,
}) => {
  await page.goto(ROUTE);
  const table = page.locator(tableSelector);
  const cell = table.locator('[data-grid-cell="0:1"]');
  await cell.focus();
  await cell.press("F2");
  const input = table.locator(part("edit-cell-editor"));
  await input.fill("12");
  await input.press("ArrowLeft");
  await expect(input).toBeFocused();
  await input.press("Escape");
  await page.getByRole("checkbox", { name: "Accept edits" }).uncheck();
  await cell.focus();
  await cell.press("Shift+ArrowDown");
  await table.locator('[data-grid-cell="1:1"]').press("ControlOrMeta+d");
  await expect(table.locator('[data-grid-cell="1:1"]')).toContainText("30");
  await expect(page.getByRole("status", { name: "Edit requests" })).toHaveText(
    "1"
  );
  await page.getByRole("checkbox", { name: "Accept edits" }).check();
  await table.locator('[data-grid-cell="1:1"]').press("ControlOrMeta+d");
  await expect(table.locator('[data-grid-cell="1:1"]')).toContainText("10");
  await table.locator('[data-grid-cell="1:1"]').press("ControlOrMeta+z");
  await expect(table.locator('[data-grid-cell="1:1"]')).toContainText("30");
});
test("mobile find and RTL use native controls and current locale labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(ROUTE);
  await page.getByRole("checkbox", { name: "Arabic / right to left" }).check();
  const table = page.locator(tableSelector);
  await expect(table).toHaveAttribute("dir", "rtl");
  await expect(table.locator('[role="grid"]')).toHaveCount(0);
  await table.locator(part("find-button")).click();
  await table.locator(part("find-input")).fill("Ada");
  await expect(table.locator("[data-cell-match]")).toHaveCount(1);
  await expect(table.locator(part("find-input"))).not.toHaveAttribute(
    "aria-label",
    "Find in table"
  );
});
test("live source and feature replacement remove stale navigation", async ({
  page,
}) => {
  await page.goto(ROUTE);
  const table = page.locator(tableSelector);
  await table.locator('[data-grid-cell="0:0"]').focus();
  await table.locator('[data-grid-cell="0:0"]').press("Shift+ArrowDown");
  await page.getByRole("button", { name: "Replace rows" }).click();
  await expect(table.locator('td[data-column-key="name"]')).toHaveText(
    "Replacement"
  );
  await page.getByRole("checkbox", { name: "Navigation enabled" }).uncheck();
  await expect(table.locator('[role="grid"]')).toHaveCount(0);
  await expect(table.locator(part("find-button"))).toHaveCount(0);
  await expect(table.locator(part("status-bar"))).toHaveCount(0);
});

test("clipboard copy, paste and undo use one host-owned gesture", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto(ROUTE);
  const table = page.locator(tableSelector);
  const first = table.locator('[data-grid-cell="0:1"]');
  const second = table.locator('[data-grid-cell="1:1"]');
  await first.focus();
  await first.press("Shift+ArrowDown");
  await second.press("ControlOrMeta+c");
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe("10\n30");
  await page.evaluate(() => navigator.clipboard.writeText("21\n22"));
  await second.press("ControlOrMeta+v");
  await expect(first).toContainText("21");
  await expect(second).toContainText("22");
  await second.press("ControlOrMeta+z");
  await expect(first).toContainText("10");
  await expect(second).toContainText("30");
});

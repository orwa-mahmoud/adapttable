import { expect, test } from "@playwright/test";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const fixture = "/vue/unstyled/actions/";
test("palette is native top layer, keyboard searchable and restores focus", async ({
  page,
}) => {
  await page.goto(fixture);
  const trigger = page.locator(part("command-palette-button"));
  await trigger.focus();
  await page.keyboard.press("Enter");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await expect(palette).toBeVisible();
  expect(await palette.evaluate((element) => element.matches(":modal"))).toBe(
    true
  );
  const input = page.getByRole("combobox", { name: "Search commands" });
  await expect(input).toBeFocused();
  await input.fill("Inspect host");
  await input.press("Enter");
  await expect(palette).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await expect(page.locator("#events")).toContainText("command");
});
test("bulk confirmation receives all matching scope and does not mutate rows", async ({
  page,
}) => {
  await page.goto(fixture);
  await page.locator("thead input[type=checkbox]").check();
  await page.locator(part("select-all-button")).click();
  page.once("dialog", (dialog) => dialog.accept());
  await page.locator(part("bulk-button")).click();
  await expect(page.locator("#scope")).toHaveText(
    '{"allMatching":true,"total":9}'
  );
  await expect(page.locator("tbody tr")).toHaveCount(2);
});
test("export cancellation, retry and KeepAlive abort use current host jobs", async ({
  page,
}) => {
  await page.goto(fixture);
  const trigger = page.locator(part("export-csv-button"));
  await trigger.click();
  await page.locator("#progress").click();
  await expect(page.getByRole("progressbar")).toHaveAttribute("value", "42");
  await page.locator(part("export-progress-cancel")).click();
  await expect(page.locator("#aborted")).toHaveText("true");
  await page.locator(part("export-progress-dismiss")).click();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("#reject-export").click();
  await page.locator(part("export-progress-retry")).click();
  await page.locator("#complete-export").click();
  await expect(page.locator(part("export-progress-download"))).toHaveAttribute(
    "href",
    "/fixture.csv"
  );
  await page.locator(part("export-progress-dismiss")).click();
  await trigger.click();
  await page.locator("#toggle-table").click();
  await expect(page.locator("#aborted")).toHaveText("true");
  await page.locator("#toggle-table").click();
  await expect(trigger).toBeEnabled();
});
test("mobile RTL context menu is native top layer and panel tabs use logical arrows", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixture}?mobile&rtl`);
  const cell = page.locator(part("card-value")).first();
  await cell.click({ button: "right" });
  const menu = page.getByRole("menu", { name: "Table actions" });
  await expect(menu).toBeVisible();
  expect(
    await menu.evaluate((element) => element.matches(":popover-open"))
  ).toBe(true);
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.locator("#events")).toContainText("context:cell");
  await expect(menu).toHaveCount(0);
  const first = page.getByRole("tab", { name: "Help" });
  await first.focus();
  await first.press("ArrowLeft");
  await expect(page.getByRole("tab", { name: "Details" })).toBeFocused();
  await expect(page.locator(part("table-region"))).toHaveCSS(
    "flex-direction",
    "column"
  );
});

import { expect, test } from "@playwright/test";

const route = "/vue/unstyled/table-surfaces/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

test("native filter chips, header actions and disclosure actions remain keyboard operable", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const root = page.locator('[data-demo-table="table-surfaces"]');
  await expect(root.locator(part("chip"))).toHaveCount(3);
  await root.locator(`${part("chip-remove")}[aria-label*="Core"]`).click();
  await expect(root.locator('[data-row-id="a"]')).toHaveCount(0);
  await expect(root.locator('[data-row-id="b"]')).toBeVisible();
  await root.locator(part("chip-remove")).last().click();
  await expect(root.locator(part("chips"))).toHaveCount(0);
  await root.locator(part("sort-button")).nth(0).click();
  await root
    .locator(part("sort-button"))
    .nth(1)
    .click({ modifiers: ["Shift"] });
  await expect(root.locator(part("sort-index"))).toHaveText(["1", "2"]);
  await root.getByRole("button", { name: "Inspect Name", exact: true }).click();
  await expect(page.getByLabel("Header reviews", { exact: true })).toHaveText(
    "1"
  );
  const menu = root.locator(part("row-actions-menu")).first();
  const trigger = menu.locator("summary");
  await trigger.focus();
  await trigger.press("Enter");
  await expect(menu).toHaveAttribute("open", "");
  await expect(
    menu.getByRole("button", { name: "Restricted action" })
  ).toBeDisabled();
  await trigger.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(trigger).toBeFocused();
  await trigger.press("Enter");
  await menu.getByRole("button", { name: "Open record" }).click();
  await expect(page.getByLabel("Last row action", { exact: true })).toHaveText(
    "a"
  );
  await expect(menu).not.toHaveAttribute("open", "");
  expect(errors).toEqual([]);
});

test("expansion rejection, loading geometry, export busy state and mobile RTL transitions", async ({
  page,
}) => {
  await page.goto(route);
  const root = page.locator('[data-demo-table="table-surfaces"]');
  await expect(root.locator(part("expand-header"))).toHaveAttribute(
    "rowspan",
    "2"
  );
  await root.locator(part("expand-button")).first().click();
  await expect(
    page.getByLabel("Expansion requests", { exact: true })
  ).toHaveText('["a"]');
  await expect(root.locator(part("detail-row"))).toHaveCount(0);
  await page.getByLabel("Accept expansion requests", { exact: true }).check();
  await root.locator(part("expand-button")).first().click();
  await expect(root.locator(part("detail-cell"))).toHaveAttribute(
    "colspan",
    "6"
  );
  await expect(root.locator(part("detail-cell"))).toContainText(
    "Details for Ada"
  );
  await page.getByLabel("Right-to-left", { exact: true }).check();
  await expect(root).toHaveAttribute("dir", "rtl");
  await page.getByLabel("Loading", { exact: true }).check();
  await expect(root.locator(part("loading-row"))).toHaveCount(3);
  await expect(root.locator(part("loading-header-cell"))).toHaveCount(6);
  await page.getByLabel("Mobile cards", { exact: true }).check();
  await expect(root.locator(part("loading-card"))).toHaveCount(3);
  await page.getByLabel("Loading", { exact: true }).uncheck();
  await expect(root.locator(part("card-detail"))).toContainText(
    "Details for Ada"
  );
  await expect(root.locator(part("expand-cell"))).toHaveCount(0);
  await root.locator(part("export-csv-button")).click();
  await expect(root.locator(part("export-spinner"))).toBeVisible();
  await expect(root.locator(part("export-csv-button"))).toBeDisabled();
  await page
    .getByRole("button", { name: "Complete export", exact: true })
    .click();
  await expect(root.locator(part("export-spinner"))).toHaveCount(0);
  await page.getByLabel("Actions menu", { exact: true }).uncheck();
  await expect(root.locator(part("row-actions-menu"))).toHaveCount(0);
  await expect(root.locator(part("action-button"))).toHaveCount(6);
  await page.getByLabel("Show table", { exact: true }).uncheck();
  await expect(root).toHaveCount(0);
  await page.getByLabel("Show table", { exact: true }).check();
  await expect(root.locator(part("action-button"))).toHaveCount(6);
});

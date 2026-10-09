import { expect, test } from "@playwright/test";
const route = "/vue/unstyled/row-controls/";
test("Vue native rows preserve controlled pins, keyboard actions and resize", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const table = page.locator('[data-adapttable-part="root"]');
  const bea = table.locator('[data-row-id="bea"]');
  await page.getByLabel("Reject pin requests").check();
  await bea
    .getByRole("button", { name: "Pin to top", exact: true })
    .press("Enter");
  await expect(table.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "ada"
  );
  await page.getByLabel("Reject pin requests").uncheck();
  await bea
    .getByRole("button", { name: "Pin to top", exact: true })
    .press("Enter");
  await expect(table.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "bea"
  );
  await bea
    .getByRole("button", { name: "Inspect", exact: true })
    .press("Space");
  await expect(page.getByRole("status").first()).toContainText("Inspect Bea");
  const handle = table
    .locator('[data-adapttable-part="resize-handle"]')
    .first();
  const header = table.locator('th[data-column-key="name"]');
  const width = await header.evaluate(
    (element) => element.getBoundingClientRect().width
  );
  await handle.press("ArrowRight");
  await expect
    .poll(() =>
      header.evaluate((element) => element.getBoundingClientRect().width)
    )
    .toBeGreaterThan(width);
  await expect(
    table.locator('[data-adapttable-part="pinned-summary-bottom"] input')
  ).toHaveCount(0);
  expect(errors).toEqual([]);
});
test("Vue native row mutations stay host owned in mobile RTL cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await page.getByRole("button", { name: "Toggle RTL" }).click();
  const root = page.locator('[data-adapttable-part="root"]');
  await expect(root).toHaveAttribute("dir", "rtl");
  await expect(root.locator('[data-adapttable-part="cards"]')).toBeVisible();
  const ada = root.locator('[data-row-id="ada"]');
  await ada.getByRole("button", { name: "Duplicate row", exact: true }).click();
  await expect(root.locator('[data-row-id="ada-copy"]')).toBeVisible();
  page.once("dialog", (dialog) => dialog.dismiss());
  await ada.getByRole("button", { name: "Delete row", exact: true }).click();
  await expect(ada).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await ada.getByRole("button", { name: "Delete row", exact: true }).click();
  await expect(ada).toHaveCount(0);
});

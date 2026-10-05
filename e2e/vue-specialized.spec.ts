import { expect, test } from "@playwright/test";
const route = "/vue/unstyled/specialized/";
test("Vue native virtual rows preserve host rejection, variable details and teardown", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const table = page.locator('[data-adapttable-part="root"]').first();
  await expect
    .poll(() => table.locator("tbody [data-row-id]").count())
    .toBeGreaterThan(0);
  await expect
    .poll(() => table.locator("tbody [data-row-id]").count())
    .toBeLessThan(40);
  await page.getByLabel("Accept row moves").uncheck();
  const grip = table.locator(
    '[data-row-id="sale-0"] [data-adapttable-part="row-reorder-handle"]'
  );
  await grip.press("Space");
  await grip.press("ArrowDown");
  await grip.press("Space");
  await expect(
    page.getByRole("status").filter({ hasText: "Move requests:" })
  ).toHaveText("Move requests: 1");
  await expect(table.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "sale-0"
  );
  await table
    .getByRole("button", { name: "Expand row", exact: true })
    .first()
    .click();
  await expect(table.getByText("Order detail for sale-0")).toBeVisible();
  await table
    .locator('[data-adapttable-part="scroll-box"]')
    .evaluate((element) => {
      element.scrollTop = 2000;
    });
  await expect(table.locator('[data-row-id="sale-0"]')).toHaveCount(0);
  await page.getByLabel("Enable features").uncheck();
  await expect(table.locator("tbody [data-row-id]")).toHaveCount(1000);
  expect(errors).toEqual([]);
});
test("Vue native mobile RTL grouping and pivot controls stay native and accessible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(route);
  await page.getByLabel("Mobile cards").check();
  await page.getByLabel("Arabic and RTL").check();
  await page.getByLabel("Group rows").check();
  const table = page.locator('[data-adapttable-part="root"]').first();
  await expect(table).toHaveAttribute("dir", "rtl");
  await expect(
    table.locator('[data-adapttable-part="grouping-panel"] select')
  ).toBeVisible();
  await expect(table.locator('[data-adapttable-part="cards"]')).toBeVisible();
  await expect(table.locator('svg[role="img"]').first()).toHaveAccessibleName(
    /.+/
  );
  const pivot = page.locator('[data-adapttable-part="pivot-panel"]');
  await expect(pivot.locator("select")).toHaveCount(4);
  await expect(pivot.locator("button").first()).toHaveAttribute(
    "type",
    "button"
  );
});
test("Vue column windows expose logical spacers through RTL horizontal scrolling", async ({
  page,
}) => {
  await page.goto(route);
  const root = page.locator('[data-adapttable-part="root"]').first();
  const box = root.locator('[data-adapttable-part="scroll-box"]');
  await expect
    .poll(() => root.locator("thead [data-column-key]").count())
    .toBeLessThan(28);
  await box.evaluate((element) => {
    element.scrollLeft = 2500;
  });
  await expect
    .poll(() =>
      root
        .locator('[data-adapttable-part="column-spacer-start"]')
        .first()
        .evaluate((element) => element.getBoundingClientRect().width)
    )
    .toBeGreaterThan(0);
  await page.getByLabel("Arabic and RTL").check();
  await box.evaluate((element) => {
    element.scrollLeft = -2500;
  });
  await expect(root).toHaveAttribute("dir", "rtl");
  await expect(
    root.locator('[data-adapttable-part="column-spacer-end"]').first()
  ).toHaveAttribute("aria-hidden", "true");
});

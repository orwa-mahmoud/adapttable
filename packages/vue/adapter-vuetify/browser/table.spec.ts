import { expect, test } from "@playwright/test";

test("renders genuine Vuetify table with native semantics and keyboard sorting", async ({
  page,
}, testInfo) => {
  await page.goto("/table");
  const table = page.getByRole("table", { name: "People", exact: true });
  await expect(table).toHaveAttribute("data-adapttable-part", "table");
  await expect(page.locator(".v-table table")).toBeVisible();
  await expect(table.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "beta"
  );
  await table.getByRole("button", { name: "Name", exact: true }).press("Enter");
  await expect(table.locator("tbody [data-row-id]").first()).toHaveAttribute(
    "data-row-id",
    "alpha"
  );
  await expect(table.locator('th[aria-sort="ascending"]')).toContainText(
    "Name"
  );
  await expect(page.locator(".v-table__wrapper")).toHaveCSS(
    "overflow",
    "visible"
  );
  await page.screenshot({
    path: testInfo.outputPath("vuetify-desktop-table.png"),
    fullPage: true,
  });
});

test("row selection remains controlled for rejected and accepted keyboard requests", async ({
  page,
}) => {
  await page.goto("/table");
  const row = page.locator('tbody [data-row-id="beta"]');
  const checkbox = row.getByRole("checkbox");
  await page
    .getByRole("button", { name: "Reject selection", exact: true })
    .click();
  await checkbox.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(
    page.getByLabel("Selection requests", { exact: true })
  ).toHaveText("1");
  await page
    .getByRole("button", { name: "Reject selection", exact: true })
    .click();
  await checkbox.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(
    page.getByLabel("Selection requests", { exact: true })
  ).toHaveText("2");
  await expect(page.getByLabel("Selected row IDs", { exact: true })).toHaveText(
    "beta"
  );
});

test("table search survives an unrelated host render", async ({ page }) => {
  await page.goto("/table");
  const search = page.getByRole("searchbox");
  await search.fill("Alpha");
  await expect(page.locator("tbody [data-row-id]")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Update decoration", exact: true })
    .click();
  await expect(search).toHaveValue("Alpha");
  await expect(page.locator("tbody [data-row-id]")).toHaveAttribute(
    "data-row-id",
    "alpha"
  );
});

test("responds with Vuetify cards and preserves theme and RTL on a narrow viewport", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/table");
  await expect(page.locator("article.v-card[data-row-id]")).toHaveCount(3);
  await expect(page.locator("table")).toHaveCount(0);
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  await expect(page.locator(".v-application")).toHaveClass(/v-theme--dark/);
  await expect(page.locator(".adapttable-vuetify")).toHaveAttribute(
    "dir",
    "rtl"
  );
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("vuetify-mobile-rtl-dark.png"),
    fullPage: true,
  });
});

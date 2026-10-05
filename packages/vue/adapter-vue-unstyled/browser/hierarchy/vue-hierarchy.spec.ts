import { expect, test } from "@playwright/test";
const HIERARCHY_PREVIEW = "/vue/unstyled/hierarchy/";
test("Vue hierarchy uses native keyboard controls and stable row details", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(HIERARCHY_PREVIEW);
  const groups = page.locator('[data-hierarchy-table="groups"]');
  await groups.locator('[data-adapttable-part="group-more"]').press("Enter");
  await expect(groups.locator('[data-row-id="bea"]')).toBeVisible();
  await groups
    .getByRole("button", { name: "Collapse group: Core" })
    .press("Space");
  await expect(groups.locator('[data-row-id="bea"]')).toHaveCount(0);
  const hierarchy = page.locator('[data-hierarchy-table="tree"]');
  const root = hierarchy.locator('[data-row-id="ada"]');
  await root
    .locator('[data-adapttable-part="tree-toggle"]')
    .press("ArrowRight");
  await expect(hierarchy.locator('[data-row-id="bea"]')).toHaveAttribute(
    "aria-level",
    "2"
  );
  await root.locator('[data-adapttable-part="expand-button"]').press("Enter");
  await expect(
    hierarchy.locator('[data-adapttable-part="detail-cell"]')
  ).toHaveText("Details for Ada");
  await page.getByRole("button", { name: "Toggle RTL" }).click();
  await root
    .locator('[data-adapttable-part="tree-toggle"]')
    .press("ArrowRight");
  await expect(hierarchy.locator('[data-row-id="bea"]')).toHaveCount(0);
  await expect(
    hierarchy.locator('[data-adapttable-part="detail-cell"]')
  ).toHaveText("Details for Ada");
  expect(errors).toEqual([]);
});
test("Vue hierarchy exposes the same controls in mobile cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(HIERARCHY_PREVIEW);
  const hierarchy = page.locator('[data-hierarchy-table="tree"]');
  await expect(
    hierarchy.locator('[data-adapttable-part="cards"]')
  ).toBeVisible();
  await hierarchy
    .locator('[data-row-id="ada"] [data-adapttable-part="tree-toggle"]')
    .click();
  await expect(hierarchy.locator('[data-row-id="bea"]')).toBeVisible();
  await hierarchy
    .locator('[data-row-id="bea"] [data-adapttable-part="expand-button"]')
    .click();
  await expect(
    hierarchy.locator('[data-adapttable-part="detail-cell"]')
  ).toHaveText("Details for Bea");
});

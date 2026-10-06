import { expect, test } from "@playwright/test";

test("opens tree children and row details through genuine Vuetify buttons", async ({
  page,
}, testInfo) => {
  await page.goto("/hierarchy");
  await expect(page.locator('[data-row-id="alpha"]')).toHaveCount(0);
  const tree = page
    .locator('button.v-btn[data-adapttable-part="tree-toggle"]')
    .first();
  await tree.press("ArrowRight");
  await expect(page.locator('[data-row-id="alpha"]')).toBeVisible();
  await expect(tree).toHaveAttribute("aria-expanded", "true");
  await page
    .locator('button.v-btn[data-adapttable-part="expand-button"]')
    .first()
    .press("Space");
  await expect(
    page.locator('[data-adapttable-part="detail-row"]')
  ).toContainText("Team: Platform");
  await page.screenshot({
    path: testInfo.outputPath("vuetify-hierarchy.png"),
    fullPage: true,
  });
});

test("uses RTL tree keys and responsive Vuetify detail cards", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/hierarchy");
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  await page
    .locator('button.v-btn[data-adapttable-part="tree-toggle"]')
    .first()
    .press("ArrowLeft");
  await expect(
    page.locator('article.v-card[data-row-id="alpha"]')
  ).toBeVisible();
  await page
    .locator('button.v-btn[data-adapttable-part="expand-button"]')
    .first()
    .click();
  await expect(
    page.locator('[data-adapttable-part="card-detail"]')
  ).toContainText("Team: Platform");
});

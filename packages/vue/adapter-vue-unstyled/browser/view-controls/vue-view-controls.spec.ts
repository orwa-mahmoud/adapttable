import { expect, test } from "@playwright/test";

// Requires the real native ViewControlsDemo.vue showcase route.
const PREVIEW = "/vue/unstyled/view-controls/";

test("Vue native view controls share a namespace and restore keyboard focus", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  const table = page.locator('[data-demo-table="view-controls"]');
  const density = table.locator('[data-adapttable-part="density-select"]');
  await density.selectOption("compact");
  await table
    .locator('[data-adapttable-part="views-button"]')
    .press("ArrowDown");
  const panel = page.locator('[data-adapttable-part="views-panel"]');
  await panel.locator('[data-adapttable-part="views-input"]').fill("Compact");
  await panel.locator('[data-adapttable-part="views-input"]').press("Enter");
  await panel.press("Escape");
  await expect(
    table.locator('[data-adapttable-part="views-button"]')
  ).toBeFocused();
  await density.selectOption("comfortable");
  await table.locator('[data-adapttable-part="views-button"]').click();
  await panel.getByRole("button", { name: "Compact", exact: true }).click();
  await expect(density).toHaveValue("compact");
  await expect(
    page.locator(
      '[data-demo-table="independent"] [data-adapttable-part="density-select"]'
    )
  ).toHaveValue("comfortable");
  await page.getByRole("checkbox", { name: "Reject density requests" }).check();
  await density.selectOption("compact");
  await expect(density).toHaveValue("comfortable");
  await page.getByRole("checkbox", { name: "View controls enabled" }).uncheck();
  await expect(
    table.locator('[data-adapttable-part="views-button"]')
  ).toHaveCount(0);
});

test("Vue native view controls preserve RTL, narrow-screen fit and localized labels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PREVIEW);
  await page.getByRole("checkbox", { name: "Arabic / right to left" }).check();
  const table = page.locator('[data-demo-table="view-controls"]');
  await expect(table).toHaveAttribute("dir", "rtl");
  await table.locator('[data-adapttable-part="views-button"]').click();
  const panel = page.locator('[data-adapttable-part="views-panel"]');
  await expect(panel).toHaveAttribute("dir", "rtl");
  await expect(panel).toBeVisible();
  const bounds = await panel.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(390);
  await expect(
    panel.locator('[data-adapttable-part="views-input"]')
  ).not.toHaveAttribute("aria-label", "View name");
});

test("Vue native controlled acceptance and search opt-out retain feature controls", async ({
  page,
}) => {
  await page.goto(PREVIEW);
  const table = page.locator('[data-demo-table="view-controls"]');
  const density = table.locator('[data-adapttable-part="density-select"]');
  await page.getByRole("checkbox", { name: "Reject density requests" }).check();
  await page
    .getByRole("checkbox", { name: "Accept controlled density" })
    .check();
  await page.getByRole("checkbox", { name: "Search enabled" }).uncheck();
  await expect(table.locator('input[type="search"]')).toHaveCount(0);
  await density.selectOption("compact");
  await expect(density).toHaveValue("compact");
  await expect(table).toHaveAttribute("data-density", "compact");
  await expect(
    page.getByRole("status", { name: "Density requests" })
  ).toHaveText("compact");
  const trigger = table.locator('[data-adapttable-part="views-button"]');
  await trigger.press("ArrowDown");
  const input = table.locator('[data-adapttable-part="views-input"]');
  await expect(input).toBeFocused();
  await input.fill("Compact");
  await input.press("Enter");
  await input.press("Escape");
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.getByRole("heading", { name: "Vue native view controls" }).click();
  await expect(
    table.locator('[data-adapttable-part="views-panel"]')
  ).toHaveCount(0);
  await trigger.click();
  await table.locator('[data-adapttable-part="views-delete"]').click();
  await expect(
    table.locator('[data-adapttable-part="views-item"]')
  ).toHaveCount(0);
});

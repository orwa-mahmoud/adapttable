import { expect, test } from "@playwright/test";

const PREVIEW = "/vue/unstyled/view-controls/";

test("Vue native Saved Views restore an explicitly persisted column layout", async ({
  page,
}) => {
  await page.goto(`${PREVIEW}?independent.colHide=team`);
  const table = page.locator('[data-demo-table="view-controls"]');
  const other = page.locator('[data-demo-table="independent"]');
  await page
    .getByRole("button", { name: "Apply column preset", exact: true })
    .click();
  const toggle = table.locator('[data-adapttable-part="column-group-toggle"]');
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await table.locator('[data-adapttable-part="views-button"]').click();
  const input = table.locator('[data-adapttable-part="views-input"]');
  await input.fill("Column layout");
  await input.press("Enter");
  await input.press("Escape");
  await page
    .getByRole("button", { name: "Reset columns", exact: true })
    .click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await table.locator('[data-adapttable-part="views-button"]').click();
  await table
    .getByRole("button", { name: "Column layout", exact: true })
    .click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(table.locator("tbody tr").first().locator("td")).toHaveCount(1);
  await expect(table.locator("thead")).toContainText("Owner");
  await expect(table.locator('th[data-column-key="name"]')).toHaveAttribute(
    "style",
    /width: ?240px/
  );
  await expect(table.locator('th[data-column-key="name"]')).toHaveCSS(
    "position",
    "sticky"
  );
  await expect(other.locator("tbody tr").first().locator("td")).toHaveCount(3);
  await expect(page).toHaveURL(/independent.colHide=team/);
  await expect(page).toHaveURL(/view-controls.colGroupCollapse=Contact/);
  await page
    .getByRole("checkbox", { name: "Reject column layout requests" })
    .check();
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await page.reload();
  await expect(
    table.locator('[data-adapttable-part="column-group-toggle"]')
  ).toHaveAttribute("aria-expanded", "false");
  await expect(table.locator("thead")).toContainText("Owner");
});

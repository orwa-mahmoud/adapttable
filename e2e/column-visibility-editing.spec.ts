import { expect, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * A column brought back from hidden must still be editable.
 *
 * The two features meet in the render model: visibility rewrites the column
 * list, editing keys its active cell off a column index, and a revealed column
 * that comes back inert looks exactly like editing being broken. Neither
 * feature's own tests can see it — this is the path that crosses them, and it
 * runs on the Feature Lab because that is the only page with both the Columns
 * menu and an editing toggle.
 */

const demo = (page: Page) => page.locator("#demo");

/** The header cell for a column, if it is currently shown. */
const header = (page: Page, column: string) =>
  demo(page).getByRole("columnheader", { name: column });

/**
 * Toggle a column's visibility from the Columns menu. The control is the
 * per-row eye button, whose name carries the action and the column.
 */
async function toggleVisibility(
  page: Page,
  column: string,
  action: "Show column" | "Hide column"
): Promise<void> {
  await demo(page)
    .locator('[data-adapttable-part="column-menu-button"]')
    .first()
    .click();
  const toggle = page.getByRole("button", { name: `${action}: ${column}` });
  await expect(toggle).toBeVisible();
  await toggle.click();
  // Close the menu so the assertions below read the table, not the overlay.
  await page.keyboard.press("Escape");
}

test.describe("a revealed column is still editable", () => {
  test("hide Email, show it again, then edit a cell in it", async ({
    page,
  }) => {
    await page.goto("/all-options/");
    await configureFeatureLab(page, "editing mode", "Cell");

    // Email starts hidden on the lab. Bring it on, take it away, put it back:
    // that round trip is what has to survive.
    await expect(header(page, "Email")).toHaveCount(0);
    await toggleVisibility(page, "Email", "Show column");
    await expect(header(page, "Email").first()).toBeVisible();
    await toggleVisibility(page, "Email", "Hide column");
    await expect(header(page, "Email")).toHaveCount(0);
    await toggleVisibility(page, "Email", "Show column");
    await expect(header(page, "Email").first()).toBeVisible();

    // The column is back — so is its editor. A revealed column that opens
    // nothing is the regression this spec exists for.
    const index = await header(page, "Email")
      .first()
      .evaluate((el) => {
        const row = el.closest("tr");
        return row ? [...row.children].indexOf(el) : -1;
      });
    expect(index).toBeGreaterThan(-1);
    const cell = demo(page)
      .locator("tbody tr")
      .first()
      .locator("td")
      .nth(index);
    await cell.dblclick();
    await expect(
      cell.locator('[data-adapttable-part="edit-cell-editor"]').first()
    ).toBeVisible();
  });

  test("hiding it again removes it from the table", async ({ page }) => {
    await page.goto("/all-options/");
    await toggleVisibility(page, "Email", "Show column");
    await expect(header(page, "Email").first()).toBeVisible();
    await toggleVisibility(page, "Email", "Hide column");
    await expect(header(page, "Email")).toHaveCount(0);
  });
});

import { expect, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * Changed-cell flash in Feature Lab — a real patch event, not a fake mark.
 *
 * The Lab's "Flash changed cells" toggle is the cell-level pulse; the
 * neighbouring "Highlight changed rows" toggle is the steady row mark.
 */

const demo = (page: Page) => page.locator("#demo");

test("Feature Lab names highlight and cell-flash apart, and gates both", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await page.getByRole("button", { name: "Configure options" }).click();
  const dialog = page.getByRole("dialog", { name: "Configure Feature Lab" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByRole("group", { name: "highlight changed rows" })
  ).toBeVisible();
  await expect(
    dialog.getByRole("group", { name: "flash changed cells" })
  ).toBeVisible();
  const highlightOn = dialog
    .getByRole("group", { name: "highlight changed rows" })
    .getByRole("button", { name: "On", exact: true });
  const flashOn = dialog
    .getByRole("group", { name: "flash changed cells" })
    .getByRole("button", { name: "On", exact: true });
  await expect(highlightOn).toBeDisabled();
  await expect(flashOn).toBeDisabled();
  await expect(highlightOn).toHaveAttribute("title", /highlight marks the row/);
  await expect(flashOn).toHaveAttribute("title", /flash marks the cells/);

  await dialog
    .getByRole("group", { name: "editing mode" })
    .getByRole("button", { name: "Cell", exact: true })
    .click();
  await expect(highlightOn).toBeEnabled();
  await expect(flashOn).toBeEnabled();
});

test("an edit marks the changed cell, and reduced motion marks nothing", async ({
  page,
}) => {
  await page.goto("/all-options/");
  await configureFeatureLab(page, "editing mode", "Cell");
  await configureFeatureLab(page, "flash changed cells", "On");

  const activate = demo(page)
    .locator('[data-adapttable-part="edit-cell-activate"]')
    .first();
  await expect(activate).toBeVisible();
  await activate.dblclick();
  const editor = demo(page)
    .locator('[data-adapttable-part="edit-cell-editor"]')
    .first();
  await expect(editor).toBeVisible();
  await editor.fill("Flagged");
  await editor.press("Enter");

  await expect(demo(page).locator("[data-flash]").first()).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Configure options" }).click();
  const dialog = page.getByRole("dialog", { name: "Configure Feature Lab" });
  const flashOn = dialog
    .getByRole("group", { name: "flash changed cells" })
    .getByRole("button", { name: "On", exact: true });
  await expect(flashOn).toBeDisabled();
  await expect(flashOn).toHaveAttribute("title", /Reduced motion/);
  await dialog.getByRole("button", { name: "Close options" }).click();

  await expect(demo(page).locator("[data-flash]")).toHaveCount(0);
});

test("adding a row marks its cells", async ({ page }) => {
  await page.goto("/all-options/");
  await configureFeatureLab(page, "add / delete", "On");
  await configureFeatureLab(page, "flash changed cells", "On");

  await demo(page).locator('[data-adapttable-part="add-row"]').click();

  await expect(demo(page).locator("[data-flash]").first()).toBeVisible();
});

import { expect, type Locator, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * The boolean and multi-select editors, in every kit.
 *
 * These two were byte-identical raw HTML in five adapters until recently, and
 * nothing in the demo used either — so "every kit renders its own control" was
 * asserted only in jsdom. They live behind a Feature Lab toggle because the
 * live demo is frozen and no focused page is about editors as such.
 */

const KITS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
] as const;

const demo = (page: Page) => page.locator("#demo");

async function openLab(page: Page, kit: string) {
  await page.goto("/all-options/");
  await configureFeatureLab(page, "editing mode", "Cell");
  await configureFeatureLab(page, "Boolean & multi-select editors", "On");
  if (kit !== "mantine") {
    const tab = page.getByTestId(`adapter-${kit}`);
    await tab.scrollIntoViewIfNeeded();
    await tab.click();
  }
  const root = demo(page).locator(`[data-adapter="${kit}"]`);
  await expect(root.first()).toBeVisible();
  return root;
}

/** Open the editor in the first real row of the named column. */
async function openEditor(page: Page, kit: string, column: string) {
  const root = await openLab(page, kit);
  const header = root.getByRole("columnheader", { name: column }).first();
  await expect(header).toBeVisible();
  const index = await header.evaluate((el) => {
    const row = el.closest("tr");
    return row ? [...row.children].indexOf(el) : -1;
  });
  expect(index, `no "${column}" header in ${kit}`).toBeGreaterThan(-1);
  // antd's zero-height measure row carries the header text, so pick by box.
  const cell = root
    .locator("tbody tr:visible")
    .first()
    .locator("td")
    .nth(index);
  const editor = cell.locator('[data-adapttable-part="edit-cell-editor"]');
  // A double-click that lands while the row is still settling is swallowed —
  // the cell is there, the handler is not yet. Retry until the editor opens
  // rather than asserting against the first attempt.
  await expect(async () => {
    await cell.dblclick();
    await expect(editor.first()).toBeAttached({ timeout: 1000 });
  }).toPass({ timeout: 10_000 });
  return cell;
}

for (const kit of KITS) {
  test(`${kit}: opens a boolean editor`, async ({ page }) => {
    const cell = await openEditor(page, kit, "Remote");
    // The part goes on the real input, which several kits hide behind their
    // own styled box — so the part is asserted present and the control the
    // reader actually sees and clicks is asserted visible.
    await expect(
      cell.locator('[data-adapttable-part="edit-cell-editor"]').first()
    ).toBeAttached();
    await expect(cell.getByRole("checkbox").first()).toBeVisible();
  });

  test(`${kit}: opens a multi-select editor`, async ({ page }) => {
    const cell = await openEditor(page, kit, "Skills");
    await expect(
      cell.locator('[data-adapttable-part="edit-cell-editor"]').first()
    ).toBeVisible();
  });
}

/**
 * The single-select editor's COMMIT path, in every kit.
 *
 * The editor was only ever asserted to open. Chakra's and antd's Selects cannot
 * be driven under jsdom at all, so for those two nothing anywhere asserted that
 * choosing a value stores it — this is the test that does.
 */
const TARGET = "Blocked";

/** Pick a value in whichever control the kit renders for a single select. */
async function pickOption(page: Page, editor: Locator, value: string) {
  const tag = await editor.evaluate((el) => el.tagName.toLowerCase());
  if (tag === "select") {
    await editor.selectOption({ label: value });
    return;
  }
  await editor.click();
  // antd v6 leaves its visible option items unroled and puts `role="option"` on
  // an offscreen zero-size mirror for assistive tech, so match either shape and
  // take the one a user could actually click.
  await page
    .locator('[role="option"], .ant-select-item-option')
    .filter({ hasText: new RegExp(`^\\s*${value}\\s*$`) })
    .locator("visible=true")
    .first()
    .click();
}

for (const kit of KITS) {
  test(`${kit}: commits a single-select cell editor`, async ({ page }) => {
    const cell = await openEditor(page, kit, "Status");
    const editor = cell
      .locator('[data-adapttable-part="edit-cell-editor"]')
      .first();

    // The row starts on a different value, so the assertion below cannot pass
    // by accident.
    await expect(cell).not.toHaveText(TARGET);

    await pickOption(page, editor, TARGET);
    await page.keyboard.press("Enter");

    // Closed, and the cell renders what was chosen: that render is the stored
    // value, not the draft.
    await expect(editor).toHaveCount(0);
    await expect(cell).toHaveText(TARGET);
  });
}

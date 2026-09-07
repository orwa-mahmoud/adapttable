import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

const KITS = builtAdapters().map((adapter) => adapter.key);
const KIT = KITS[0]!;
const demo = (page: Page) => page.locator("#demo");

async function selectKit(page: Page, kit: string): Promise<void> {
  const target = demo(page)
    .locator(`[data-adapter="${kit}"] [data-stagger]`)
    .first();
  if (await target.isVisible()) return;
  const tab = page.getByTestId(`adapter-${kit}`);
  await expect(tab).toBeVisible();
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(target).toBeVisible();
}

async function openDemo(page: Page, kit: string): Promise<void> {
  await page.goto("/");
  await selectKit(page, kit);
}

async function openRenameEditor(
  page: Page,
  renameLabel: string
): Promise<{ input: Locator; rename: Locator }> {
  const columns = page.locator('[data-adapttable-part="column-menu-button"]');
  await columns.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator('[data-adapttable-part="column-menu-search"]')
  ).toBeVisible();

  // Reserved reorder/actions rows have no per-column submenu. The first row
  // with a More control is the renameable Person column in the showcase.
  const row = page
    .locator('[data-adapttable-part="column-menu-item"]')
    .filter({
      has: page.locator('[data-adapttable-part="column-menu-more"]'),
    })
    .first();
  const more = row.locator('[data-adapttable-part="column-menu-more"]');
  await more.focus();
  await page.keyboard.press("Enter");

  const rename = row.getByRole("button", {
    name: renameLabel,
    exact: true,
  });
  await rename.focus();
  await page.keyboard.press("Enter");

  const input = row.locator('[data-adapttable-part="column-rename-input"]');
  await expect(input).toBeFocused();
  return { input, rename };
}

for (const kit of KITS) {
  test(`${kit} renames a column by keyboard in RTL`, async ({ page }) => {
    await openDemo(page, kit);
    await page
      .getByRole("group", { name: "locale" })
      .getByRole("button", { name: "العربية", exact: true })
      .click();
    await expect(page.locator('[dir="rtl"]').first()).toBeVisible();

    const { input } = await openRenameEditor(page, "إعادة تسمية العمود");
    await input.press("ControlOrMeta+A");
    await page.keyboard.type("صاحب الحساب");
    await page.keyboard.press("Enter");

    await expect(
      page
        .locator('[data-adapttable-part="column-menu-item"]')
        .filter({ hasText: "صاحب الحساب" })
        .first()
    ).toBeVisible();
    await expect(
      page
        .locator('[data-adapttable-part="column-rename-announcer"]')
        .filter({ hasText: "صاحب الحساب" })
        .first()
    ).toContainText("صاحب الحساب");
    await expect(page).toHaveURL(/colName=/);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Escape");

    const header = page
      .getByRole("columnheader", { name: "صاحب الحساب" })
      .first();
    await expect(header).toBeVisible();
    await expect(header).toHaveAttribute("data-column-key", "person");

    const headerRename = page
      .locator('[data-adapttable-part="header-rename-button"]')
      .first();
    await expect(headerRename).toHaveAccessibleName(
      "إعادة تسمية العمود: صاحب الحساب"
    );
    await headerRename.focus();
    await page.keyboard.press("Enter");
    const headerInput = page
      .locator('[data-adapttable-part="header-rename-input"]')
      .first();
    await expect(headerInput).toBeFocused();
    await headerInput.press("ControlOrMeta+A");
    await page.keyboard.type("جهة الاتصال الأساسية");
    await page.keyboard.press("Enter");
    await expect(
      page.getByRole("columnheader", { name: "جهة الاتصال الأساسية" }).first()
    ).toHaveAttribute("data-column-key", "person");
    await expect(page).toHaveURL(/%25D8%25AC%25D9%2587%25D8%25A9/);

    await page.reload();
    await selectKit(page, kit);
    await expect(
      page.getByRole("columnheader", { name: "جهة الاتصال الأساسية" }).first()
    ).toHaveAttribute("data-column-key", "person");
  });
}

test("blank validation, Escape focus restore, and mobile label round-trip", async ({
  page,
}) => {
  await openDemo(page, KIT);

  let editor = await openRenameEditor(page, "Rename column");
  await editor.input.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.press("Enter");
  await expect(
    page.locator('[data-adapttable-part="column-rename-error"]')
  ).toBeVisible();
  await expect(
    page.getByRole("columnheader", { name: "Person" }).first()
  ).toBeVisible();

  await page.keyboard.type("Temporary");
  await page.keyboard.press("Escape");
  await expect(editor.rename).toBeFocused();
  await expect(
    page.getByRole("columnheader", { name: "Person" }).first()
  ).toBeVisible();

  // The submenu stays open and its Rename action stays mounted, so reopening
  // remains keyboard-only after focus restoration.
  await page.keyboard.press("Enter");
  editor = {
    input: page.locator('[data-adapttable-part="column-rename-input"]'),
    rename: editor.rename,
  };
  await expect(editor.input).toBeFocused();
  await editor.input.press("ControlOrMeta+A");
  await page.keyboard.type("Account owner");
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("columnheader", { name: "Account owner" }).first()
  ).toBeVisible();

  await page.setViewportSize({ width: 412, height: 915 });
  await expect(
    page
      .locator('[data-adapttable-part="cards"]')
      .getByText("Account owner", { exact: true })
      .first()
  ).toBeVisible();
});

test("semantic header control renames without entering the Columns menu", async ({
  page,
}) => {
  await openDemo(page, KIT);
  const trigger = page
    .locator('[data-adapttable-part="header-rename-button"]')
    .first();
  await expect(trigger).toHaveAccessibleName("Rename column: Person");
  await trigger.focus();
  await page.keyboard.press("Enter");

  const input = page.locator('[data-adapttable-part="header-rename-input"]');
  await expect(input).toBeFocused();
  await input.press("ControlOrMeta+A");
  await page.keyboard.type("Primary contact");
  await page.keyboard.press("Enter");

  await expect(
    page.getByRole("columnheader", { name: "Primary contact" }).first()
  ).toHaveAttribute("data-column-key", "person");
  await expect(trigger).toBeFocused();
});

/**
 * One Escape, one layer.
 *
 * The rename editor sits inside a submenu inside the Columns menu. A kit
 * whose overlay answers Escape as well took all three down at once: the edit
 * was cancelled, the menu vanished, and the control that had focus went with
 * it — so the next key went nowhere and the reader was back at the table.
 */
for (const kit of KITS) {
  test(`${kit} closes only the rename editor on Escape`, async ({ page }) => {
    await openDemo(page, kit);
    const { rename } = await openRenameEditor(page, "Rename column");
    const menu = page.locator('[data-adapttable-part="column-menu-search"]');
    const editor = page.locator('[data-adapttable-part="column-rename-input"]');
    await expect(menu).toBeVisible();

    await page.keyboard.press("Escape");

    await expect(editor).toHaveCount(0);
    // The menu it was opened from is still there, and so is the control that
    // opened it — which is what makes reopening keyboard-only.
    await expect(menu).toBeVisible();
    await expect(rename).toBeFocused();

    // Focus survived, so the editor reopens from the keyboard alone — the
    // thing that was impossible when the menu went down with it.
    await page.keyboard.press("Enter");
    await expect(editor).toBeFocused();
  });
}

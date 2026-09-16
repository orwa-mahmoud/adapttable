import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Change one Feature Lab option through its modal configuration drawer.
 *
 * The drawer intentionally leaves the table at full width and makes the page
 * behind it inert, so browser tests must close it before driving the preview.
 */
export async function configureFeatureLab(
  page: Page,
  group: string,
  option: string
): Promise<void> {
  await page.getByRole("button", { name: "Configure options" }).click();
  const dialog = page.getByRole("dialog", { name: "Configure Feature Lab" });
  await expect(dialog).toBeVisible();
  const choice = dialog
    .getByRole("group", { name: group })
    .getByRole("button", { name: option, exact: true });
  await choice.click();
  // Wait for the option to report itself chosen before leaving the drawer.
  // Several of these rebuild the table — a locale switch swaps every label
  // and the writing direction with it — so a caller that closes and asserts
  // immediately can be reading the table that is about to be replaced.
  await expect(choice).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Close options" }).click();
  await expect(dialog).toBeHidden();
}

/**
 * Kits that use a native `<select>` expose every zone's options to the page.
 * Scope the pick to this zone, and `selectOption` when the control is native.
 */
export async function pickAddField(
  page: Page,
  zone: Locator,
  name: string
): Promise<void> {
  const add = zone.getByRole("combobox", { name: "Add field" });
  const tag = await add.evaluate((el) => el.tagName);
  if (tag === "SELECT") {
    await add.selectOption({ label: name });
    return;
  }
  await add.click();
  const option = page
    .getByRole("option", { name, exact: true })
    .filter({ visible: true });
  try {
    await option.first().click({ timeout: 2500 });
  } catch {
    await page.keyboard.type(name);
    await page.keyboard.press("Enter");
  }
}

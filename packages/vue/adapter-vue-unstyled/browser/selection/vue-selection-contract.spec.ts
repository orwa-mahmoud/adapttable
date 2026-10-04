import { expect, test } from "@playwright/test";
const route = "/vue/unstyled/selection-contract/";
for (const mobile of [false, true])
  for (const host of ["", "accept", "reject"]) {
    test(`Vue semantic selection Space exactly once: ${mobile ? "cards" : "table"}, ${host || "uncontrolled"}`, async ({
      page,
    }) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto(`${route}?mobile=${mobile}&host=${host}`);
      const model = page.locator('[data-selection-table="model"]');
      const row = model
        .locator(mobile ? "article input" : "tbody input")
        .first();
      await expect(row).toBeChecked();
      await row.focus();
      await page.keyboard.press("Space");
      await expect(page.locator("#requests")).toHaveText('[["off-page"]]');
      await expect(row).toBeChecked({ checked: host === "reject" });
      await page.keyboard.press("Space");
      await expect(page.locator("#requests")).toHaveText(
        host === "reject"
          ? '[["off-page"],["off-page"]]'
          : '[["off-page"],["off-page","a"]]'
      );
      await expect(row).toBeChecked();
      await expect(row).toHaveAttribute("data-adapttable-part", "checkbox");
      await expect(row).toHaveAccessibleName("Select row");
      await expect(row).toHaveAccessibleDescription(
        "Each action requests one selection toggle."
      );
      await page
        .getByRole("button", { name: "Focus last model checkbox" })
        .click();
      await expect(
        model.locator(mobile ? "article input" : "tbody input").last()
      ).toBeFocused();
      const native = page.locator('[data-selection-table="native"]');
      const nativeRow = native
        .locator(mobile ? "article input" : "tbody input")
        .first();
      await nativeRow.focus();
      await page.keyboard.press("Space");
      await page.keyboard.press("Space");
      await expect(nativeRow).toBeChecked();
      await expect(page.locator("#native-requests")).toHaveText(
        '[["off-page"],["off-page"]]'
      );
      expect(errors).toEqual([]);
    });
  }
test("Vue semantic mixed header and disabled controls", async ({ page }) => {
  await page.goto(route);
  const header = page.locator('[data-selection-table="model"] thead input');
  await expect(header).toBeChecked({ indeterminate: true });
  await expect(header).toHaveAccessibleName("Select all");
  await header.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#requests")).toHaveText('[["a","off-page","b"]]');
  await expect(header).toBeChecked();
  await page.keyboard.press("Space");
  await expect(page.locator("#requests")).toHaveText(
    '[["a","off-page","b"],["off-page"]]'
  );
  await expect(header).not.toBeChecked();
  await page.goto(`${route}?disabled=true`);
  const disabled = page
    .locator('[data-selection-table="model"] tbody input')
    .first();
  await expect(disabled).toBeDisabled();
  await disabled.evaluate((element) => {
    if (element instanceof HTMLInputElement) element.click();
  });
  await page.keyboard.press("Space");
  await expect(page.locator("#requests")).toHaveText("[]");
  await expect(disabled).toBeChecked();
});

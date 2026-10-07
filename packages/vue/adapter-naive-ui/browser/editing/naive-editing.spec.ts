import { expect, test } from "@playwright/test";
const target = process.env.ADAPTTABLE_NAIVE_EDITING_URL;
test.beforeEach(async ({ page }) => {
  if (!target)
    throw new Error(
      "ADAPTTABLE_NAIVE_EDITING_URL must serve NaiveEditingContract.vue with the built candidate package."
    );
  await page.goto(target);
});
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test("cell validation, number and select keyboard ownership", async ({
  page,
}) => {
  const activation = page.locator(part("edit-cell-activate"));
  await activation.first().focus();
  await page.keyboard.press("F2");
  const editor = page.locator(part("edit-cell-editor"));
  await expect(editor).toBeFocused();
  await editor.fill("bad");
  await editor.press("Enter");
  await expect(editor).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator(part("edit-cell-error"))).toHaveText(
    "Choose another name"
  );
  await editor.fill("Grace");
  await editor.press("Enter");
  await expect(page.locator("[data-host-changes]")).toHaveText("1");
  await activation.nth(1).focus();
  await page.keyboard.press("F2");
  await page.getByRole("spinbutton").fill("12.5");
  await page.getByRole("spinbutton").press("Enter");
  await activation.nth(3).focus();
  await page.keyboard.press("F2");
  const choice = page.locator(`input${part("edit-cell-editor")}`);
  await choice.click();
  await expect(choice).toHaveAttribute("aria-expanded", "true");
  await choice.press("Escape");
  await expect(choice).toHaveAttribute("aria-expanded", "false");
  await expect(choice).toBeFocused();
  await choice.press("Escape");
  await expect(page.locator(part("edit-cell-editor"))).toHaveCount(0);
  await expect(activation.nth(3)).toBeFocused();
});
test("row and batch changes require their explicit genuine Naive Save buttons in cards", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Toggle cards", exact: true }).click();
  await page.getByRole("button", { name: "row", exact: true }).click();
  await page.locator(part("row-edit-begin")).click();
  await page
    .locator(`input${part("edit-cell-editor")}`)
    .first()
    .fill("Row draft");
  await page.locator(part("row-edit-cancel")).click();
  await expect(page.locator("[data-host-changes]")).toHaveText("0");
  await page.getByRole("button", { name: "batch", exact: true }).click();
  await page
    .locator(`input${part("edit-cell-editor")}`)
    .first()
    .fill("Batch saved");
  await expect(page.locator("[data-host-changes]")).toHaveText("0");
  await page.locator(part("batch-edit-save")).click();
  await expect(page.locator("[data-host-changes]")).toHaveText("1");
  await expect(page.locator(part("batch-edit-bar"))).toHaveCount(0);
});

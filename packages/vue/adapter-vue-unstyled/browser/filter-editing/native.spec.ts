import { expect, test } from "@playwright/test";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
const fixture = "/vue/unstyled/filter-editing/";

test("RTL popover is top-layer, anchored, keyboard reachable and escape restores trigger", async ({
  page,
}) => {
  await page.goto(`${fixture}?rtl`);
  const trigger = page.locator(part("filters-button"));
  await trigger.focus();
  await page.keyboard.press("Enter");
  const surface = page.locator(part("filters-popover"));
  await expect(surface).toBeVisible();
  await expect(surface).toHaveAttribute("dir", "rtl");
  expect(
    await surface.evaluate((element) => element.matches(":popover-open"))
  ).toBe(true);
  await expect(surface.locator("select").first()).toBeFocused();
  const box = await surface.boundingBox();
  const viewport = page.viewportSize();
  expect(
    box && viewport && box.x >= 0 && box.x + box.width <= viewport.width
  ).toBe(true);
  await page.keyboard.press("Escape");
  await expect(surface).toHaveCount(0);
  await expect(trigger).toBeFocused();
  await trigger.click();
  await page.locator("#outside").click();
  await expect(surface).toHaveCount(0);
});

test("mobile drawer traps focus, validates editor and prevents double async commits", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${fixture}?mobile&mode=drawer`);
  await page.locator(part("filters-button")).click();
  const drawer = page.locator(part("filters-panel"));
  await expect(drawer).toBeVisible();
  await expect(
    page.locator("dialog[data-adapttable-filter-dialog]")
  ).toHaveAttribute("aria-modal", "true");
  await page.keyboard.press("Escape");
  await expect(drawer).toHaveCount(0);
  const activate = page.locator(part("edit-cell-activate")).first();
  await activate.focus();
  await page.keyboard.press("F2");
  const input = page.locator(part("edit-cell-editor")).first();
  await expect(input).toBeFocused();
  await input.fill("bad");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#writes")).toHaveText("0");
  await input.fill("Updated");
  await input.press("Enter");
  await page.locator("#outside").click();
  await expect(page.locator("#writes")).toHaveText("1");
  await page.locator("#accept").click();
  await expect(page.locator(part("edit-cell-activate")).first()).toHaveText(
    "Updated"
  );
});

for (const unit of ["row", "batch"]) {
  test(`${unit} explicit save is exactly once and rejected drafts remain editable`, async ({
    page,
  }) => {
    await page.goto(`${fixture}?unit=${unit}`);
    if (unit === "row")
      await page.locator(part("row-edit-begin")).first().click();
    const input = page.locator(part("edit-cell-editor")).first();
    await input.fill("Draft");
    const save = page
      .locator(part(unit === "row" ? "row-edit-save" : "batch-edit-save"))
      .first();
    await save.click();
    await expect(save).toBeDisabled();
    await expect(page.locator("#writes")).toHaveText("1");
    await page.locator("#reject").click();
    await expect(input).toHaveValue("Draft");
    await expect(
      page.locator(part(unit === "row" ? "row-edit-error" : "batch-edit-error"))
    ).toHaveText("Offline");
    await page
      .locator(part(unit === "row" ? "row-edit-cancel" : "batch-edit-cancel"))
      .first()
      .click();
    if (unit === "row")
      await expect(page.locator(part("edit-cell-editor"))).toHaveCount(0);
    else await expect(input).toHaveValue("Ada");
  });
}

test("filter operator and checkbox group classes follow native parts in panel and header surfaces", async ({
  page,
}) => {
  await page.goto(fixture);
  await page.locator(part("filters-button")).click();
  const panel = page.locator(part("filters-popover"));
  const operator = panel.locator(`select${part("filter-operator")}`).first();
  await expect(operator).toHaveClass("native-operator");
  await expect(panel.locator(`select${part("filter-select")}`)).toHaveClass(
    "native-select"
  );
  await operator.selectOption("startsWith");
  await panel.locator(part("filter-input")).first().fill("Ad");
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(1);
  await page.keyboard.press("Escape");
  await page.goto(`${fixture}?choices`);
  await page.locator(part("filter-header-trigger")).first().click();
  const header = page.locator(part("filter-header-popover"));
  const group = header.locator(`div${part("filter-checkbox-group")}`);
  await expect(group).toHaveClass("native-checkbox-group");
  await expect(group).toHaveAttribute("role", "group");
  const checkbox = group.locator(`label${part("filter-checkbox")}`).first();
  await expect(checkbox).toHaveClass("native-checkbox");
  await group.getByRole("checkbox", { name: "Ada", exact: true }).check();
  await expect(page.locator('[data-adapttable-part="row"]')).toHaveCount(1);
  await expect(page.locator('[data-adapttable-part="row"]')).toContainText(
    "Ada"
  );
});

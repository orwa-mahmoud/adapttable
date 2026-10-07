import { expect, test } from "@playwright/test";
const target = process.env.ADAPTTABLE_NAIVE_REMAINING_URL;
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test.beforeEach(async ({ page }) => {
  if (!target)
    throw new Error(
      "ADAPTTABLE_NAIVE_REMAINING_URL must serve NaiveRemainingContract.vue using the built candidate package."
    );
  await page.goto(target);
});
test("shared context navigation focuses real buttons and incremental prefixes stay on the current match", async ({
  page,
}) => {
  await page.locator(part("cell")).first().click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("menuitem").first()).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    menu.getByRole("menuitem", { name: "Briar", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.type("br");
  await expect(
    menu.getByRole("menuitem", { name: "Bravo", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Home");
  await page.keyboard.type("bb");
  await expect(
    menu.getByRole("menuitem", { name: "Briar", exact: true })
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-commands]")).toHaveText("1");
  await expect(menu).toHaveCount(0);
  await expect(page.locator(part("cell")).first()).toBeFocused();
});
for (const backwards of [false, true])
  test(`context dismissal preserves native ${backwards ? "Shift+Tab" : "Tab"} traversal`, async ({
    page,
  }) => {
    const cell = page.locator(part("cell")).first();
    await cell.focus();
    const key = backwards ? "Shift+Tab" : "Tab";
    await page.keyboard.press(key);
    const expected = await page.evaluate(() => {
      const element = document.activeElement;
      return {
        tag: element?.tagName,
        part: element?.getAttribute("data-adapttable-part"),
        text: element?.textContent,
        label: element?.getAttribute("aria-label"),
      };
    });
    await cell.focus();
    await page.keyboard.press("Shift+F10");
    await expect(page.getByRole("menu")).toBeVisible();
    await page.keyboard.press(key);
    await expect(page.getByRole("menu")).toHaveCount(0);
    const actual = await page.evaluate(() => {
      const element = document.activeElement;
      return {
        tag: element?.tagName,
        part: element?.getAttribute("data-adapttable-part"),
        text: element?.textContent,
        label: element?.getAttribute("aria-label"),
      };
    });
    expect(actual).toEqual(expected);
    await expect(page.locator("[data-commands]")).toHaveText("0");
  });
test("native palette and saved views focus and dismiss inside fullscreen", async ({
  page,
}) => {
  await page.locator(part("fullscreen-toggle")).click();
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.fullscreenElement?.getAttribute("data-adapttable-part")
      )
    )
    .toBe("root");
  const root = page.locator(part("root"));
  const palette = root.locator(part("command-palette-button"));
  await palette.click();
  const input = root.locator(part("command-input"));
  await expect(input).toBeFocused();
  await input.fill("Record action");
  await input.press("Enter");
  await expect(page.locator("[data-commands]")).toHaveText("1");
  await expect(palette).toBeFocused();
  const trigger = root.locator(part("views-button"));
  await trigger.focus();
  await trigger.press("ArrowDown");
  const name = root.locator(part("views-input"));
  await expect(name).toBeFocused();
  await name.fill("Saved native view");
  await name.press("Enter");
  await expect(root.locator(part("views-item"))).toHaveText(
    "Saved native view"
  );
  await name.press("Escape");
  await expect(trigger).toBeFocused();
});
test("native grouping and cross-group Cancel/Move retain focus and host authority", async ({
  page,
}) => {
  const operation = page
    .locator(part("grouping-aggregation-operation"))
    .getByRole("combobox");
  await operation.click();
  await operation.fill("Average");
  await page.getByRole("option", { name: "Average", exact: true }).click();
  await expect(
    page.locator(part("grouping-aggregation-operation"))
  ).toContainText("Average");
  const destination = page
    .locator('[data-row-id="a"]')
    .locator(part("row-move-menu"))
    .getByRole("combobox");
  await destination.click();
  await page
    .locator('[role="option"]:not([aria-disabled="true"])')
    .filter({ hasText: "Design" })
    .first()
    .click();
  const dialog = page.getByRole("alertdialog");
  await expect(
    dialog.getByRole("button", { name: "Cancel", exact: true })
  ).toBeFocused();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(destination).toBeFocused();
  await expect(page.locator("[data-moves]")).toHaveText("0");
  await destination.click();
  await page
    .locator('[role="option"]:not([aria-disabled="true"])')
    .filter({ hasText: "Design" })
    .first()
    .click();
  await dialog.getByRole("button", { name: "Move", exact: true }).click();
  await expect(destination).toBeFocused();
  await expect(page.locator("[data-moves]")).toHaveText("1");
});
test("native tabs preserve rejection and open popups retire through KeepAlive", async ({
  page,
}) => {
  await page
    .getByRole("button", { name: "Toggle rejection", exact: true })
    .click();
  await page.getByRole("tab", { name: "Second panel", exact: true }).click();
  await expect(page.locator("[data-panel-requests]")).toHaveText("1");
  await expect(
    page.getByRole("tab", { name: "First panel", exact: true })
  ).toHaveAttribute("aria-selected", "true");
  await page.locator(part("views-button")).click();
  await expect(page.locator(part("views-panel"))).toBeVisible();
  await page.getByRole("button", { name: "Toggle table", exact: true }).click();
  await expect(page.locator(part("views-panel"))).toHaveCount(0);
  await page.getByRole("button", { name: "Toggle table", exact: true }).click();
  await expect(page.locator(part("views-panel"))).toHaveCount(0);
  await page.locator(part("cell")).first().click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByRole("button", { name: "Toggle table", exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);
});

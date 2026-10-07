import { expect, test } from "@playwright/test";

const part = (name: string) => `[data-adapttable-part="${name}"]`;

for (const mode of ["", "?rtl", "?mobile"]) {
  test(`saved views use a native menu with Escape and outside focus ${mode}`, async ({
    page,
  }) => {
    await page.goto(`/saved-views.html${mode}`);
    const trigger = page.locator(part("views-button"));
    await trigger.focus();
    await trigger.press("ArrowDown");
    const dialog = page.locator(part("views-panel"));
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveClass(/v-card/);
    const input = dialog.getByRole("textbox", { name: "View name" });
    await input.fill("Browser view");
    await input.press("Enter");
    await expect(
      dialog.getByRole("button", { name: "Browser view", exact: true })
    ).toBeVisible();
    await expect(page.locator("#writes")).toContainText("save:Browser view");
    await input.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    await trigger.click();
    await expect(dialog).toBeVisible();
    await page.locator("#outside").click();
    await expect(dialog).toHaveCount(0);
    await expect(page.locator("#outside")).toBeFocused();
    await trigger.click();
    await page.locator("#toggle-table").click();
    await expect(dialog).toHaveCount(0);
    await page.locator("#toggle-table").click();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
}

test("the management panel renames, cancels, orders, defaults and removes through the binding", async ({
  page,
}) => {
  await page.goto("/saved-views.html?rtl");
  const panel = page.locator(part("saved-views-panel"));
  const row = (name: string) =>
    panel
      .locator(part("saved-view-row"))
      .filter({ has: page.getByRole("button", { name, exact: true }) });
  await row("Second")
    .getByRole("button", { name: "Rename view", exact: true })
    .click();
  let input = panel.getByRole("textbox", { name: "View name" });
  await expect(input).toBeFocused();
  await input.fill("Cancelled");
  await input.press("Escape");
  await expect(row("Second")).toBeVisible();
  await row("Second")
    .getByRole("button", { name: "Rename view", exact: true })
    .click();
  input = panel.getByRole("textbox", { name: "View name" });
  await input.fill("  Personal  ");
  await input.press("Enter");
  await expect(row("Personal")).toBeVisible();
  await row("Personal")
    .getByRole("button", { name: "Move view up", exact: true })
    .click();
  await expect(panel.locator(part("saved-view-row")).first()).toContainText(
    "Personal"
  );
  await row("Personal")
    .getByRole("button", { name: "Set as default", exact: true })
    .click();
  await expect(
    row("Personal").locator(part("saved-view-default"))
  ).toBeVisible();
  const locked = row("Team").locator(`${part("saved-view-controls")} button`);
  await expect(locked).toHaveCount(5);
  for (let index = 0; index < 5; index += 1)
    await expect(locked.nth(index)).toBeDisabled();
  await row("Personal")
    .getByRole("button", { name: "Delete view", exact: true })
    .click();
  await expect(row("Personal")).toHaveCount(0);
  await expect(page.locator("#writes")).toContainText("remove:Personal");
});

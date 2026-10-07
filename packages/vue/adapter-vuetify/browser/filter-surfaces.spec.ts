import { expect, test } from "@playwright/test";

for (const mode of ["popover", "drawer"] as const) {
  test(`suspends and resumes the retained ${mode} without orphan portals or stale dismissal`, async ({
    page,
  }) => {
    await page.goto(
      mode === "drawer" ? "/filter-surface-drawer" : "/filter-surface"
    );
    await page
      .getByRole("button", { name: "Open filters", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "People filters" });
    await expect(dialog).toHaveCount(1);
    await dialog
      .getByRole("textbox", { name: "Filter people" })
      .fill("Retained");
    await dialog
      .getByRole("button", { name: "Hide surface", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    const outside = page.getByRole("button", {
      name: "Outside control",
      exact: true,
    });
    await outside.focus();
    await page.keyboard.press("Escape");
    await expect(outside).toBeFocused();
    await expect(
      page.getByLabel("Dismissal requests", { exact: true })
    ).toHaveText("0");
    await page
      .getByRole("button", { name: "Show surface", exact: true })
      .click();
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByRole("textbox", { name: "Filter people" })
    ).toHaveValue("Retained");
    await dialog
      .getByRole("button", { name: "Dispose surface", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.locator('[data-adapttable-part="filters-backdrop"]')
    ).toHaveCount(0);
  });

  test(`retains focused content after rejected ${mode} dismissal and restores it only after acceptance`, async ({
    page,
  }) => {
    await page.goto(
      mode === "drawer"
        ? "/filter-surface-drawer?reject"
        : "/filter-surface?reject"
    );
    const trigger = page.getByRole("button", {
      name: "Open filters",
      exact: true,
    });
    await trigger.click();
    const panel = page.getByRole("dialog", { name: "People filters" });
    const input = panel.getByRole("textbox", { name: "Filter people" });
    await input.fill("Ada");
    await input.press("Escape");
    await expect(panel).toBeVisible();
    await expect(input).toBeFocused();
    await expect(
      page.getByLabel("Dismissal requests", { exact: true })
    ).toHaveText("1");
    await panel
      .getByRole("button", { name: "Accept dismissals", exact: true })
      .click();
    await input.focus();
    await input.press("Escape");
    await expect(panel).not.toBeVisible();
    await expect(trigger).toBeFocused();
    await expect(
      page.getByLabel("Dismissal requests", { exact: true })
    ).toHaveText("2");
  });

  test(`keeps nested select ownership inside the ${mode}`, async ({ page }) => {
    await page.goto(
      mode === "drawer" ? "/filter-surface-drawer" : "/filter-surface"
    );
    await page
      .getByRole("button", { name: "Open filters", exact: true })
      .click();
    const panel = page.getByRole("dialog", { name: "People filters" });
    const select = panel.getByRole("combobox", { name: "Team" });
    await select.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.getByRole("option", { name: "Beta", exact: true }).click();
    await expect(panel).toBeVisible();
    await select.press("Enter");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).not.toBeVisible();
    await expect(panel).toBeVisible();
    await expect(
      page.getByLabel("Dismissal requests", { exact: true })
    ).toHaveText("0");
    await select.press("Escape");
    await expect(panel).not.toBeVisible();
  });
}

test("keeps backdrop dismissal with the nested menu until it has closed", async ({
  page,
}) => {
  await page.goto("/filter-surface-drawer");
  await page.getByRole("button", { name: "Open filters", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "People filters" });
  await panel.getByRole("combobox", { name: "Team" }).press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  const backdrop = page.locator('[data-adapttable-part="filters-backdrop"]');
  await backdrop.click({ position: { x: 10, y: 10 } });
  await expect(page.getByRole("listbox")).not.toBeVisible();
  await expect(panel).toBeVisible();
  await expect(
    page.getByLabel("Dismissal requests", { exact: true })
  ).toHaveText("0");
  await backdrop.click({ position: { x: 10, y: 10 } });
  await expect(panel).not.toBeVisible();
  await expect(
    page.getByLabel("Dismissal requests", { exact: true })
  ).toHaveText("1");
});

import { expect, test } from "@playwright/test";

test("edits through a real Vuetify text field and records one host write", async ({
  page,
}) => {
  await page.goto("/editing");
  const cell = page.locator('[data-row-id="beta"] [data-column-key="name"]');
  await cell.locator('[data-adapttable-part="edit-cell-activate"]').press("F2");
  const input = cell.locator(".v-text-field input");
  await expect(input).toBeFocused();
  await input.fill("Beth");
  await input.press("Enter");
  await expect(cell).toContainText("Beth");
  await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
    "1"
  );
});

test("shows validation on the actual input and preserves correction focus", async ({
  page,
}, testInfo) => {
  await page.goto("/editing");
  const cell = page.locator('[data-row-id="beta"] [data-column-key="name"]');
  await cell.locator('[data-adapttable-part="edit-cell-activate"]').press("F2");
  const input = cell.locator("input");
  await input.fill("");
  await input.press("Enter");
  await expect(input).toHaveAttribute("aria-invalid", "true");
  await expect(cell.getByRole("alert")).toHaveText("A name is required");
  await expect(input).toBeFocused();
  await page.screenshot({
    path: testInfo.outputPath("vuetify-edit-validation.png"),
    fullPage: true,
  });
  await input.fill("Beth");
  await input.press("Enter");
  await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
    "1"
  );
});

test("lets the real select menu consume its first Escape before canceling the editor", async ({
  page,
}) => {
  await page.goto("/editing");
  const cell = page.locator('[data-row-id="beta"] [data-column-key="team"]');
  await cell.locator('[data-adapttable-part="edit-cell-activate"]').press("F2");
  const input = cell.getByRole("combobox");
  await input.press("Enter");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(input).toBeVisible();
  await expect(input).toBeFocused();
  await input.press("Escape");
  await expect(
    cell.locator('[data-adapttable-part="edit-cell-editor"]')
  ).toHaveCount(0);
  await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
    "0"
  );
});

test("keeps option focus inside the select widget and commits after leaving it", async ({
  page,
}) => {
  await page.goto("/editing");
  const cell = page.locator('[data-row-id="beta"] [data-column-key="team"]');
  await cell.locator('[data-adapttable-part="edit-cell-activate"]').press("F2");
  await cell.getByRole("combobox").press("ArrowDown");
  await page.getByRole("option", { name: "Design", exact: true }).click();
  await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
    "0"
  );
  await page
    .getByRole("button", { name: "Update decoration", exact: true })
    .click();
  await expect(cell).toContainText("Design");
  await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
    "1"
  );
});

for (const mode of ["row", "batch"] as const) {
  test(`${mode} editing saves only through its explicit Vuetify action`, async ({
    page,
  }) => {
    await page.goto(`/${mode}-editing`);
    const row = page.locator('[data-row-id="beta"]');
    if (mode === "row")
      await row.locator('[data-adapttable-part="row-edit-begin"]').click();
    await row.locator('[data-column-key="name"] input').fill("Beth");
    await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
      "0"
    );
    await page
      .locator(`[data-adapttable-part="${mode}-edit-save"]`)
      .first()
      .click();
    await expect(page.getByLabel("Edit requests", { exact: true })).toHaveText(
      "1"
    );
    if (mode === "row") await expect(row).toContainText("Beth");
    else
      await expect(row.locator('[data-column-key="name"] input')).toHaveValue(
        "Beth"
      );
  });
}

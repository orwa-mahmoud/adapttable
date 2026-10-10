import { expect, test } from "@playwright/test";

test("labels and documented refs focus actual native controls", async ({
  page,
}) => {
  await page.goto("/");
  await page.locator('label[for="fixture-search"]').click();
  await expect(
    page.getByRole("searchbox", { name: "Search people" })
  ).toBeFocused();
  await page.locator('label[for="fixture-team"]').click();
  await expect(
    page.getByRole("combobox", { name: "Team", exact: true })
  ).toBeFocused();
  await page.getByRole("button", { name: "Focus team", exact: true }).click();
  await expect(
    page.getByRole("combobox", { name: "Team", exact: true })
  ).toBeFocused();
});

test("accepts and rejects native Vuetify select keyboard requests without losing menu focus", async ({
  page,
}) => {
  await page.goto("/");
  const team = page.getByRole("combobox", { name: "Team", exact: true });
  await team.press("ArrowDown");
  await expect(
    page.getByRole("option", { name: "Design", exact: true })
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Selected team", { exact: true })).toHaveText(
    "design"
  );
  await team.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("option", { name: "Design", exact: true })
  ).not.toBeVisible();
  await expect(team).toBeFocused();
  await page
    .getByRole("button", { name: "Reject changes", exact: true })
    .click();
  await team.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Selected team", { exact: true })).toHaveText(
    "design"
  );
  await expect(
    page.locator('[data-adapttable-part="filter-select"]')
  ).toContainText("Design");
});

test("checkbox keyboard activation requests exactly once for accepted and rejected host state", async ({
  page,
}) => {
  await page.goto("/");
  const checkbox = page.getByRole("checkbox", {
    name: "Select row",
    exact: true,
  });
  await page
    .getByRole("button", { name: "Reject changes", exact: true })
    .click();
  await checkbox.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(
    page.getByLabel("Selection requests", { exact: true })
  ).toHaveText("1");
  await page
    .getByRole("button", { name: "Reject changes", exact: true })
    .click();
  await checkbox.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(
    page.getByLabel("Selection requests", { exact: true })
  ).toHaveText("2");
});

test("controlled search requests once and survives rejection and unrelated rendering", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox", { name: "Search people" });
  await page
    .getByRole("button", { name: "Reject changes", exact: true })
    .click();
  await search.fill("Grace");
  await expect(search).toHaveValue("Ada");
  await expect(page.getByLabel("Search requests", { exact: true })).toHaveText(
    "1"
  );
  await page
    .getByRole("button", { name: "Reject changes", exact: true })
    .click();
  await search.fill("Grace");
  await expect(search).toHaveValue("Grace");
  await expect(page.getByLabel("Search requests", { exact: true })).toHaveText(
    "2"
  );
  await page
    .getByRole("button", { name: "Update decoration", exact: true })
    .click();
  await expect(search).toHaveValue("Grace");
  await expect(page.getByLabel("Search value", { exact: true })).toHaveText(
    "Grace"
  );
  await expect(page.getByLabel("Search requests", { exact: true })).toHaveText(
    "2"
  );
});

test("Vuetify controls fit a narrow viewport without horizontal overflow", async ({
  page,
}, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".v-card")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth)
  ).toBeLessThanOrEqual(390);
  await page.screenshot({
    path: testInfo.outputPath("vuetify-mobile-controls.png"),
    fullPage: true,
  });
});

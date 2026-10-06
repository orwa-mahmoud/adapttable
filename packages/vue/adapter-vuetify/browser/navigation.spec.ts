import { expect, test } from "@playwright/test";

test("opens find by native button activation, retains typing focus, and returns to the matching grid cell", async ({
  page,
}) => {
  await page.goto("/navigation");
  await page
    .getByRole("button", { name: "Find in table", exact: true })
    .click();
  const search = page.getByRole("searchbox", {
    name: "Find in table",
    exact: true,
  });
  await expect(search).toBeFocused();
  await search.pressSequentially("Alpha");
  await expect(search).toBeFocused();
  await expect(page.locator("[data-cell-match]")).toHaveCount(1);
  await search.press("Escape");
  await expect(page.locator('[data-adapttable-part="find-bar"]')).toHaveCount(
    0
  );
  await expect(
    page.locator('[data-row-id="alpha"] [data-column-key="name"]')
  ).toBeFocused();
});

test("opens find with Ctrl+F and keeps column selection keyboard controlled", async ({
  page,
}) => {
  await page.goto("/navigation");
  const first = page.locator('[data-grid-cell="0:0"]');
  await first.focus();
  await first.press("Control+f");
  const search = page.getByRole("searchbox", {
    name: "Find in table",
    exact: true,
  });
  await expect(search).toBeFocused();
  await search.press("Escape");
  const checkbox = page.getByRole("checkbox", {
    name: "Select column: Name",
    exact: true,
  });
  await checkbox.press("Space");
  await expect(checkbox).toBeChecked();
  await expect(page.locator('td[aria-selected="true"]')).toHaveCount(3);
});

test("keeps genuine Vuetify status controls visible in RTL", async ({
  page,
}, testInfo) => {
  await page.goto("/navigation");
  await page
    .getByRole("button", { name: "Right to left", exact: true })
    .click();
  await expect(
    page.locator('[data-adapttable-part="status-bar"].v-sheet')
  ).toBeVisible();
  await expect(
    page.locator('[data-adapttable-part="status-item"].v-chip')
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("vuetify-navigation-rtl.png"),
    fullPage: true,
  });
});

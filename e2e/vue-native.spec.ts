import { expect, test } from "@playwright/test";

// The browser runner serves the raw showcase build. Site composition relocates
// this input to the canonical /vue/demo/unstyled/ URL without changing its kit.
const VUE_PREVIEW = "/vue/unstyled/";

test("Vue native table has real keyboard, controlled selection, search and paging", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(VUE_PREVIEW);
  const table = page.locator('[data-demo-table="people"]');
  await expect(table.getByRole("table", { name: "People" })).toBeVisible();
  await expect(table.getByRole("table", { name: "People" })).toHaveAttribute(
    "data-adapttable-part",
    "table"
  );
  await expect(
    table.getByRole("searchbox", { name: "Search", exact: true })
  ).toHaveAttribute("data-adapttable-part", "search");
  await expect(
    table.getByRole("checkbox", { name: "Select row" }).first()
  ).toHaveAttribute("data-adapttable-part", "checkbox");
  await table.getByRole("button", { name: "Sort by Score" }).press("Enter");
  await expect(table.locator("tbody tr").first()).toContainText("Grace Hopper");
  await table
    .getByRole("checkbox", { name: "Select row" })
    .first()
    .press("Space");
  await expect(page.locator("[data-demo-selection]")).toHaveText(
    "Selected: grace"
  );
  await table.getByRole("button", { name: "Next page" }).click();
  await expect(table.locator("tbody")).toContainText("Katherine Johnson");
  await table
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("Ada");
  await expect(table.locator("tbody tr")).toHaveCount(1);
  await expect(table.locator("tbody")).toContainText("Ada Lovelace");
  await expect(page.locator('[data-demo-table="independent"]')).toContainText(
    "Independent row"
  );
  await page.getByRole("button", { name: "Focus table", exact: true }).click();
  await expect(
    table.locator('[data-adapttable-part="scroll-box"]')
  ).toBeFocused();
  await expect(table.locator('th[data-column-key="score"]')).toHaveAttribute(
    "scope",
    "col"
  );
  await expect(table.locator('th[data-column-key="score"]')).toHaveAttribute(
    "aria-sort",
    "ascending"
  );
  await table.getByRole("searchbox", { name: "Search", exact: true }).fill("");
  await expect(table.locator("tbody tr")).toHaveCount(2);
  await expect(
    table.getByRole("checkbox", { name: "Select row", exact: true }).first()
  ).toBeChecked();
  await testInfo.attach("vue-native-desktop", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  expect(errors).toEqual([]);
});

test("Vue native table switches to cards on a phone and preserves Arabic RTL controls", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(VUE_PREVIEW);
  const table = page.locator('[data-demo-table="people"]');
  await expect(table.locator('[data-adapttable-part="cards"]')).toBeVisible();
  await expect(table.locator("table")).toHaveCount(0);
  await table
    .getByRole("combobox", { name: "Sort by", exact: true })
    .selectOption("score");
  await expect(table.locator("article").first()).toContainText("Grace Hopper");
  await expect(
    table
      .locator("article")
      .first()
      .locator('[data-adapttable-part="card-row"]')
  ).toHaveCount(2);
  await page
    .getByRole("checkbox", { name: "Arabic / right to left", exact: true })
    .check();
  await expect(table).toHaveAttribute("dir", "rtl");
  await expect(table.locator('[data-adapttable-part="cards"]')).toHaveAttribute(
    "dir",
    "rtl"
  );
  await expect(table).toHaveAttribute("lang", "ar");
  await expect(
    table.getByRole("combobox", { name: "ترتيب حسب", exact: true })
  ).toBeVisible();
  await table
    .getByRole("button", { name: "الصفحة التالية", exact: true })
    .press("Enter");
  await expect(table.locator("article")).toHaveCount(1);
  await expect(table.locator("article").first()).toContainText(
    "Katherine Johnson"
  );
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await testInfo.attach("vue-native-mobile-rtl", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  await page
    .getByRole("checkbox", { name: "Arabic / right to left", exact: true })
    .uncheck();
  await expect(table).toHaveAttribute("dir", "ltr");
  await expect(
    table.getByRole("button", { name: "Previous page", exact: true })
  ).toBeVisible();
  expect(errors).toEqual([]);
});

import { expect, test } from "@playwright/test";

// The browser runner serves the raw showcase build. Site composition relocates
// this input to the canonical /vue/demo/unstyled/preview/ URL without changing
// its kit.
const VUE_PREVIEW = "/vue/unstyled/preview/";

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
  await table
    .getByRole("button", { name: "Sort by: Score", exact: true })
    .press("Enter");
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

test("Vue native cards load more by keyboard and preserve Arabic RTL controls", async ({
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Exercise the native keyboard fallback without a focus-induced scroll
  // letting the observer load the next page first. Auto-loading is tested below.
  await page.addInitScript(() => {
    Object.defineProperty(window, "IntersectionObserver", {
      configurable: true,
      value: undefined,
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(VUE_PREVIEW);
  const table = page.locator('[data-demo-table="people"]');
  await expect(table.locator('[data-adapttable-part="cards"]')).toBeVisible();
  await expect(table.locator("table")).toHaveCount(0);
  await expect(table.locator("article")).toHaveCount(2);
  await table
    .getByRole("combobox", { name: "Sort by", exact: true })
    .selectOption("score");
  await expect(table.locator("article")).toContainText([
    "Grace Hopper",
    "Ada Lovelace",
  ]);
  await expect(
    table
      .locator("article")
      .first()
      .locator('[data-adapttable-part="card-row"]')
  ).toHaveCount(2);
  await table
    .getByRole("checkbox", { name: "Select row", exact: true })
    .first()
    .press("Space");
  await expect(page.locator("[data-demo-selection]")).toHaveText(
    "Selected: grace"
  );
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
  const loadMoreArabic = table.getByRole("button", {
    name: "تحميل المزيد",
    exact: true,
  });
  await expect(loadMoreArabic).toHaveAttribute(
    "data-adapttable-part",
    "load-more-button"
  );
  await loadMoreArabic.press("Enter");
  await expect(table.locator("article")).toHaveCount(3);
  await expect(table.locator("article")).toContainText([
    "Grace Hopper",
    "Ada Lovelace",
    "Katherine Johnson",
  ]);
  await expect(loadMoreArabic).toHaveCount(0);
  await expect(
    table.getByRole("checkbox", { name: "تحديد الصف", exact: true }).first()
  ).toBeChecked();
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
  await expect(table).toHaveAttribute("lang", "en");
  await expect(table.locator('[data-adapttable-part="cards"]')).toHaveAttribute(
    "dir",
    "ltr"
  );
  await expect(
    table.getByRole("combobox", { name: "Sort by", exact: true })
  ).toHaveValue("score");
  await expect(table.locator("article")).toHaveCount(3);
  await table
    .getByRole("searchbox", { name: "Search", exact: true })
    .fill("Ada");
  await expect(table.locator("article")).toHaveCount(1);
  await expect(table.locator("article")).toContainText("Ada Lovelace");
  await table.getByRole("searchbox", { name: "Search", exact: true }).fill("");
  await expect(table.locator("article")).toHaveCount(2);
  const loadMoreEnglish = table.getByRole("button", {
    name: "Load more",
    exact: true,
  });
  await loadMoreEnglish.press("Enter");
  await expect(table.locator("article")).toHaveCount(3);
  await expect(table.locator("article")).toContainText([
    "Grace Hopper",
    "Ada Lovelace",
    "Katherine Johnson",
  ]);
  await expect(loadMoreEnglish).toHaveCount(0);
  await expect(
    table.getByRole("checkbox", { name: "Select row", exact: true }).first()
  ).toBeChecked();
  await expect(page.locator("[data-demo-selection]")).toHaveText(
    "Selected: grace"
  );
  expect(errors).toEqual([]);
});

test("Vue native cards automatically append rows when the loading sentinel scrolls into view", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  // Keep the initial sentinel outside the observer's 200px preload margin.
  await page.setViewportSize({ width: 390, height: 480 });
  await page.goto(VUE_PREVIEW);
  const table = page.locator('[data-demo-table="people"]');
  await expect(table.locator('[data-adapttable-part="cards"]')).toBeVisible();
  await expect(table.locator("article")).toHaveCount(2);
  await expect(table.locator("article")).toContainText([
    "Ada Lovelace",
    "Grace Hopper",
  ]);
  const loadMore = table.getByRole("button", {
    name: "Load more",
    exact: true,
  });
  const initialSentinel = await loadMore.evaluate((element) => ({
    top: element.getBoundingClientRect().top,
    viewportHeight: window.innerHeight,
  }));
  expect(initialSentinel.top).toBeGreaterThan(
    initialSentinel.viewportHeight + 200
  );
  await loadMore.scrollIntoViewIfNeeded();
  await expect(table.locator("article")).toHaveCount(3);
  await expect(table.locator("article")).toContainText([
    "Ada Lovelace",
    "Grace Hopper",
    "Katherine Johnson",
  ]);
  await expect(loadMore).toHaveCount(0);
  await expect(table.locator('[data-adapttable-part="pager"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

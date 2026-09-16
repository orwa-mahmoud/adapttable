import { expect, type Page, test } from "@playwright/test";

import { configureFeatureLab } from "./feature-lab";

/**
 * Visual AND/OR filter builder — add a condition, hide rows.
 */

const ADAPTERS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
] as const;

const demo = (page: Page) => page.locator("#demo");
/** Kit popovers portal the form to `document.body`, so do not scope to `#demo`. */
const tree = (page: Page) =>
  page.locator('[data-adapttable-part="filter-tree"]').last();
const filtersTrigger = (page: Page, name = "Filters") =>
  demo(page)
    .getByRole("button", {
      name: new RegExp(
        `^${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?: \\d+)?$`
      ),
    })
    .first();

async function openDemo(page: Page, adapter: string): Promise<void> {
  await page.goto("/all-options/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  if (adapter === "mantine") return;
  const tab = page.getByTestId(`adapter-${adapter}`);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(
    demo(page).locator(`[data-adapter="${adapter}"] [data-stagger]`).first()
  ).toBeVisible();
}

async function openFilters(page: Page, name = "Filters"): Promise<void> {
  const trigger = filtersTrigger(page, name);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
}

async function enableFilterRecipe(page: Page): Promise<void> {
  const recipe = page
    .locator(".lab-recipes")
    .getByRole("button", { name: /^Filters/ });
  await recipe.click();
  // Switching recipe rebuilds the table with a different feature set. Without
  // waiting for the button to report itself pressed, the next interaction can
  // reach the toolbar that is about to be replaced.
  await expect(recipe).toHaveAttribute("aria-pressed", "true");
}

/** The AND/OR builder sits behind Advanced so the compact form stays the page. */
async function openAdvanced(page: Page): Promise<void> {
  await tree(page)
    .locator('[data-adapttable-part="filter-tree-summary"]')
    .click();
}

test("live demo has no Advanced builder and no Values control", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "value picker" })).toHaveCount(
    0
  );
  await page
    .getByRole("group", { name: "filters container" })
    .getByRole("button", { name: "Popover", exact: true })
    .click();
  const trigger = filtersTrigger(page);
  await trigger.click();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    page.locator('[data-adapttable-part="filter-tree"]')
  ).toHaveCount(0);
});

for (const adapter of ADAPTERS) {
  test.describe(adapter, () => {
    test("Add condition keeps Ada", async ({ page }) => {
      await openDemo(page, adapter);
      await enableFilterRecipe(page);
      await openFilters(page);
      await openAdvanced(page);
      await tree(page).getByRole("button", { name: "Add condition" }).click();
      await tree(page).getByLabel("Value").fill("Ada");
      const table = demo(page).locator(`[data-adapter="${adapter}"]`);
      await expect(table.getByText("Ada Lovelace").first()).toBeVisible();
      await expect(table.getByText("Alan Turing")).toHaveCount(0);
    });

    test("keeps the builder under RTL", async ({ page }) => {
      await openDemo(page, adapter);
      await enableFilterRecipe(page);
      await configureFeatureLab(page, "locale", "العربية");
      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
      await openFilters(page, "عوامل التصفية");
      await openAdvanced(page);
      await tree(page).getByRole("button", { name: "إضافة شرط" }).click();
      await expect(
        tree(page).getByRole("combobox", { name: "الحقل" }).first()
      ).toBeVisible();
    });
  });
}

for (const adapter of ["mantine", "mui", "antd"] as const) {
  test(`${adapter} keeps a nested field menu inside a phone viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 600 });
    await openDemo(page, adapter);
    await enableFilterRecipe(page);
    await openFilters(page);
    await openAdvanced(page);
    await tree(page).getByRole("button", { name: "Add condition" }).click();
    await tree(page).getByRole("combobox", { name: "Field" }).first().click();

    const option = (
      adapter === "antd"
        ? page.getByTitle("Team", { exact: true })
        : page.getByRole("option", { name: "Team", exact: true })
    )
      .filter({ visible: true })
      .last();
    await expect(option).toBeVisible();
    const box = await option.boundingBox();
    expect(box).not.toBeNull();
    expect(box?.y ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.y ?? 601) + (box?.height ?? 0)).toBeLessThanOrEqual(600);
    await option.click();
    await expect(filtersTrigger(page)).toHaveAttribute("aria-expanded", "true");
  });
}

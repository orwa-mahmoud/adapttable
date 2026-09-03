import { expect, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";

/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

/** What the matrix says this page must serve, for the kit it is served for. */
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("filtering")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);

import { gotoFromFeatureGrid } from "./nav";

/**
 * The /filtering/ page: one subject, every kit.
 *
 * "React table filter" is the phrase people arrive searching for, so this page
 * has to answer it without JavaScript too — the served HTML carries the title,
 * the description and real copy, not an empty root.
 */

/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive.
 */
const KITS = builtAdapters().map((adapter) => adapter.key);

/** The box below the seam — everything inside it is the kit's. */
const demo = (page: Page) => page.locator(".mx-demo");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Filtering");
  await expect(page).toHaveURL(/\/filtering\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/filtering/`, { waitUntil: "domcontentloaded" });

  // The served bytes are the matrix's words. Asserting the strings rather
  // than a phrase inside them is what catches a page whose HTML was never
  // regenerated after the copy changed.
  await expect(page).toHaveTitle(copy(FEATURE.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy(FEATURE.description)
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy(FEATURE.h1)
  );
  // Real copy a crawler can read, not a placeholder — and the kit's own code.
  await expect(page.locator("main")).toContainText(
    copy(FEATURE.intro[0]!).slice(0, 60)
  );
  await expect(page.locator("main")).toContainText(ADAPTER.pkg);
  await context.close();
});

test("keeps other pages' subjects off it", async ({ page }) => {
  await page.goto(`/${KIT}/filtering/`);
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saved views", exact: true })
  ).toHaveCount(0);
  await expect(
    demo(page).getByRole("columnheader", { name: "Actions" })
  ).toHaveCount(0);
});

test("switches the filter layout between popover, drawer and header", async ({
  page,
}) => {
  await page.goto(`/${KIT}/filtering/`);
  const layout = demo(page).getByRole("group", { name: "Filter layout" });
  await expect(
    demo(page).getByRole("button", { name: "Filters", exact: true })
  ).toBeVisible();

  await layout.getByRole("button", { name: "Drawer" }).click();
  await demo(page)
    .getByRole("button", { name: "Filters", exact: true })
    .click();
  await expect(
    page.locator('[data-adapttable-part="filters-form"]').first()
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await layout.getByRole("button", { name: "Header" }).click();
  await expect(
    demo(page).locator('[data-adapttable-part="filter-header-trigger"]').first()
  ).toBeVisible();
  await expect(
    demo(page).locator('[data-adapttable-part="filter-header-row"]')
  ).toHaveCount(0);
  // Header icons own the simple fields; Filters stays for the AND/OR tree.
  await expect(
    demo(page).getByRole("button", { name: "Filters", exact: true })
  ).toBeVisible();
});

test("puts Advanced at the top of the Filters panel", async ({ page }) => {
  await page.goto(`/${KIT}/filtering/`);
  await demo(page)
    .getByRole("button", { name: "Filters", exact: true })
    .click();
  const form = page.locator('[data-adapttable-part="filters-form"]').first();
  await expect(form).toBeVisible();
  await expect(
    form.locator(":scope > [data-adapttable-part='filter-tree']")
  ).toBeVisible();
});

test("Advanced alone still uses the same Filters chrome", async ({ page }) => {
  await page.goto(`/${KIT}/filtering/`);
  await demo(page)
    .getByRole("group", { name: "Filter form" })
    .getByRole("button", { name: "Advanced" })
    .click();
  await demo(page)
    .getByRole("button", { name: "Filters", exact: true })
    .click();
  const form = page.locator('[data-adapttable-part="filters-form"]').first();
  await expect(
    form.locator("[data-adapttable-part='filter-tree']")
  ).toBeVisible();
  await expect(form.getByText("Person", { exact: true })).toHaveCount(0);
  await expect(
    form.getByRole("button", { name: "Add condition" })
  ).toBeVisible();
});

test("find writes flt.find in the URL and is not the filter tree", async ({
  page,
}) => {
  await page.goto(`/${KIT}/filtering/?flt.find=Priya`);
  const input = demo(page).locator('[data-adapttable-part="find-input"]');
  await expect(input).toBeVisible({ timeout: 15_000 });
  await expect(input).toHaveValue("Priya");
  await expect(
    demo(page).getByRole("button", { name: "Filters", exact: true })
  ).toBeVisible();
  await expect(
    demo(page).locator('[data-adapttable-part="filter-tree"]')
  ).toHaveCount(0);

  await input.fill("Jonah");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("flt.find"), {
      timeout: 5_000,
    })
    .toBe("Jonah");
});

for (const kit of KITS) {
  test(`${kit}: opens its own filters popover`, async ({ page }) => {
    await page.goto(`/${kit}/filtering/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await root.getByRole("button", { name: "Filters", exact: true }).click();
    await expect(
      page.locator('[data-adapttable-part="filters-form"]').first()
    ).toBeVisible();
  });
}

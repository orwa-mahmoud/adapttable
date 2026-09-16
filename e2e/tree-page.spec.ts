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
const FEATURE = featureBySlug("tree")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);

import { gotoFromFeatureGrid } from "./nav";

/**
 * The /tree/ page: hierarchy in a table, in every kit.
 *
 * "React tree table" is its own search, and its own shape — rows nesting rather
 * than being collected under synthetic headers. The chevron and the indent are
 * kit-native, so a kit that renders neither still shows a table full of rows
 * and looks fine until someone tries to collapse one.
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
  await gotoFromFeatureGrid(page, "mantine", "Tree data");
  await expect(page).toHaveURL(/\/tree\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/tree/`, { waitUntil: "domcontentloaded" });

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
  await page.goto(`/${KIT}/tree/`);
  await expect(page.getByRole("table").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Saved views", exact: true })
  ).toHaveCount(0);
});

for (const kit of KITS) {
  test(`${kit}: collapses a branch and hides its children`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/tree/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();

    const toggle = root.locator('[data-adapttable-part="tree-toggle"]').first();
    await expect(toggle).toBeVisible();
    const rows = () => root.locator("tbody tr:visible").count();
    const before = await rows();

    // Whether the branch starts open or shut, toggling it has to change what
    // is on screen — and toggling back has to restore it exactly.
    await toggle.click();
    await expect.poll(rows).not.toBe(before);
    await toggle.click();
    await expect.poll(rows).toBe(before);
  });
}

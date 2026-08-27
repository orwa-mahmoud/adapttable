import { devices, expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * The /mobile/ page at an actual phone size.
 *
 * Every other spec runs at 1280px, where the card layout only appears because
 * the page forces it. That proves the prop works, not that the breakpoint
 * does — and the breakpoint is the part a real visitor meets. This file is the
 * one place the viewport is genuinely small.
 */

/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive.
 */
/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

const KITS = builtAdapters().map((adapter) => adapter.key);

/** The box below the seam — everything inside it is the kit's. */
const demo = (page: Page) => page.locator(".mx-demo");

test.use({ ...devices["Pixel 7"] });

test("swaps rows for cards on a phone, with no sideways scroll", async ({
  page,
}) => {
  await page.goto(`/${KIT}/mobile-cards/`);
  const cards = demo(page).locator('[data-adapttable-part="cards"]');
  await expect(cards.first()).toBeVisible();

  // A table that overflows the phone horizontally is the failure the card
  // layout exists to avoid.
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("the nav is reachable on a phone", async ({ page }) => {
  await page.goto(`/${KIT}/mobile-cards/`);
  // The demo nav collapses to a select below the breakpoint; either shape is
  // fine, but one of them has to be there or the page is a dead end.
  const nav = page
    .getByRole("combobox")
    .or(page.getByRole("link", { name: "Live demo" }));
  await expect(nav.first()).toBeVisible();
});

for (const kit of KITS) {
  test(`${kit}: renders cards, not a table, on a phone`, async ({ page }) => {
    await page.goto(`/${kit}/mobile-cards/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="cards"]').first()
    ).toBeVisible();
    // Each card is a list item, so a screen reader counts them.
    await expect(root.getByRole("listitem").first()).toBeVisible();
  });
}

for (const kit of KITS) {
  test(`${kit}: a custom card body keeps the list semantics`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/mobile-cards/`);
    await page.getByRole("button", { name: "Custom card" }).click();

    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.locator(".demo-person-card").first()).toBeVisible();
    // The shell is the table's, not the custom body's: a screen reader still
    // counts cards, and the page still does not scroll sideways.
    await expect(root.getByRole("listitem").first()).toBeVisible();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
}

/**
 * The card list is a real <ul>, so a windowed one has to state its size per
 * item. jsdom can show the attributes exist; only a real phone-sized browser
 * shows them holding while a live virtualizer moves the window.
 */
test("states the real dataset size on a windowed card list", async ({
  page,
}) => {
  await page.goto(`/${KIT}/scale/`);
  const cards = page.locator('[data-adapttable-part="card"]');
  await expect(cards.first()).toBeVisible();
  // A window, not the dataset: the phone holds a handful of the 50,000 rows.
  expect(await cards.count()).toBeLessThan(120);
  await expect(cards.first()).toHaveAttribute("aria-setsize", "50000");
  await expect(cards.first()).toHaveAttribute("aria-posinset", "1");

  // The window advances; the positions count the dataset, not the DOM.
  await page.mouse.wheel(0, 6000);
  await expect
    .poll(
      async () => Number(await cards.first().getAttribute("aria-posinset")),
      { timeout: 5000 }
    )
    .toBeGreaterThan(1);
  await expect(cards.first()).toHaveAttribute("aria-setsize", "50000");
});

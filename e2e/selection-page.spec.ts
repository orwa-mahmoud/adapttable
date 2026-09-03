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
const FEATURE = featureBySlug("selection")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);

import { gotoFromFeatureGrid } from "./nav";

/**
 * The /selection/ page: choosing rows and acting on them, in every kit.
 *
 * Two things are worth a browser here. The selection column has to carry its
 * part names — five kits emitted them only on the stats bar until recently, so
 * an app targeting `selection-cell` got a different answer per kit. And the
 * claim that makes the feature useful is the easy one to get wrong: the
 * selection is a set of ids, not a slice of the rendered page.
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
  await gotoFromFeatureGrid(page, "mantine", "Selection");
  await expect(page).toHaveURL(/\/selection\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/selection/`, { waitUntil: "domcontentloaded" });

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

test("the selection outlives the page it was made on", async ({ page }) => {
  await page.goto(`/${KIT}/selection/`);
  const root = demo(page).locator('[data-adapter="mantine"]');
  await expect(root.first()).toBeVisible();
  const box = root
    .locator('[data-adapttable-part="selection-cell"]')
    .first()
    .getByRole("checkbox");
  await box.click();
  await expect(box).toBeChecked();

  // Away and back. A selection tied to the rendered page would not survive.
  await root.getByRole("button", { name: /next/i }).first().click();
  await expect
    .poll(async () =>
      root.locator('[data-adapttable-part="selection-cell"]').count()
    )
    .toBeGreaterThan(0);
  await root
    .getByRole("button", { name: /previous/i })
    .first()
    .click();
  await expect(
    root
      .locator('[data-adapttable-part="selection-cell"]')
      .first()
      .getByRole("checkbox")
  ).toBeChecked();
});

for (const kit of KITS) {
  test(`${kit}: names its selection cells and acts on a tick`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/selection/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();

    // The parts an app styles or tests against, on the table itself.
    await expect(
      root.locator('[data-adapttable-part="selection-header"]').first()
    ).toBeVisible();
    const cell = root
      .locator('[data-adapttable-part="selection-cell"]')
      .first();
    await expect(cell).toBeVisible();

    // Several kits hide the real input behind their own styled box, so click
    // the cell's control rather than requiring the input itself to be visible.
    await cell.getByRole("checkbox").first().click({ force: true });
    // Ticking a row has to offer something that acts on it.
    await expect(
      page.locator('[data-adapttable-part="bulk-bar"]').first()
    ).toBeVisible();
  });
}

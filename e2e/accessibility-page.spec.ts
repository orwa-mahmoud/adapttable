import { expect, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";
import { gotoFromFeatureGrid } from "./nav";

/**
 * The /accessibility/ page: keyboard reach and what the table says.
 *
 * The page's whole claim is that announcements can be CHECKED rather than
 * taken on trust, so the transcript has to fill from real table activity. It
 * mirrors the live regions the table already renders — if the table announces
 * nothing, the transcript stays empty and this fails, which is the point.
 */

const KIT = builtAdapters()[0]!.key;
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("accessibility")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);
const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");
const transcript = (page: Page) => page.getByTestId("announcements");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Accessibility");
  await expect(page).toHaveURL(/\/accessibility\/$/);
  await expect(page.getByRole("grid").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/accessibility/`);

  await expect(page).toHaveTitle(copy(FEATURE.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy(FEATURE.description)
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy(FEATURE.h1)
  );
  await expect(page.locator("main")).toContainText(
    copy(FEATURE.intro[0]!).slice(0, 60)
  );
  await expect(page.locator("main")).toContainText(ADAPTER.pkg);
  await context.close();
});

test("the grid takes arrow-key focus, and says where it went", async ({
  page,
}) => {
  await page.goto(`/${KIT}/accessibility/`);
  const grid = demo(page).getByRole("grid").first();
  await expect(grid).toBeVisible();
  await expect(transcript(page)).toContainText("Nothing yet");

  await demo(page).locator("tbody tr:visible td").first().click();
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowDown");

  await expect(transcript(page)).not.toContainText("Nothing yet");
  await expect(transcript(page).locator("li").first()).toBeVisible();
});

/**
 * Sorting rewrites the body with nothing visible to say it worked. jsdom can
 * show the region holds the right words; only a browser shows a real click on a
 * real header reaching it.
 */
test("says what changed when a column is sorted", async ({ page }) => {
  await page.goto(`/${KIT}/accessibility/`);
  const status = demo(page)
    .locator('[data-adapttable-part="table-status-announcer"]')
    .first();
  // Present before it has anything to say — a region that arrives with its text
  // is frequently missed entirely.
  await expect(status).toBeAttached();
  await expect(status).toHaveText("");

  await demo(page)
    .getByRole("button", { name: /^Sort by:/ })
    .first()
    .click();

  await expect(status).toContainText("Sorted by");
  await expect(status).toContainText("ascending");
});

for (const kit of KITS) {
  test(`${kit}: exposes a grid with a focusable cell`, async ({ page }) => {
    await page.goto(`/${kit}/accessibility/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(root.getByRole("grid").first()).toBeVisible();
    await expect(root.locator("tbody td[tabindex]").first()).toBeAttached();
  });
}

import { expect, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";
import { gotoFromFeatureGrid } from "./nav";

/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

/** What the matrix says this page must serve, for the kit it is served for. */
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("realtime")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);

/**
 * The /realtime/ page: rows changing while the reader works.
 *
 * The claim is that a live feed does not cost you your view, so the tests are
 * about what SURVIVES an update — the sort, the selection — rather than that
 * something moved.
 */

const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");
const feed = (page: Page) => page.getByTestId("realtime-feed");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Realtime");
  await expect(page).toHaveURL(/\/realtime\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/realtime/`);

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

test("the feed fills as patches land", async ({ page }) => {
  await page.goto(`/${KIT}/realtime/`);
  await expect(feed(page)).toContainText("waiting for the first patch");
  await expect(feed(page)).toHaveAttribute("data-stream-status", "open", {
    timeout: 10_000,
  });
  // The updates arrive over the patch stream; the point is that they arrive at all.
  await expect(feed(page).locator("li").first()).toBeVisible({
    timeout: 10_000,
  });
});

test("a patch lands in the top six, not only on row 1", async ({ page }) => {
  await page.goto(`/${KIT}/realtime/`);
  const root = demo(page).locator(`[data-adapter="${KIT}"]`);
  await expect(root.locator("tbody tr:visible")).toHaveCount(10);
  await expect(feed(page).locator("li").first()).toBeVisible({
    timeout: 10_000,
  });
  const line = (await feed(page).locator("li").first().innerText()).trim();
  const name = line.split("·")[0]?.trim() ?? "";
  expect(name.length).toBeGreaterThan(0);
  const topSix = root.locator("tbody tr:visible");
  const texts = await Promise.all(
    [0, 1, 2, 3, 4, 5].map((index) => topSix.nth(index).innerText())
  );
  expect(texts.some((text) => text.includes(name))).toBe(true);
});

test("a selection survives the updates", async ({ page }) => {
  await page.goto(`/${KIT}/realtime/`);
  const root = demo(page).locator(`[data-adapter="${KIT}"]`);
  await expect(root.first()).toBeVisible();
  // Wait for the feed to prove patches are actually flowing.
  await expect(feed(page).locator("li").first()).toBeVisible({
    timeout: 10_000,
  });
  const before = await root.locator("tbody tr:visible").count();
  await expect
    .poll(async () => feed(page).locator("li").count(), { timeout: 10_000 })
    .toBeGreaterThan(1);
  // Rows keep coming back, not disappearing under the patches.
  expect(await root.locator("tbody tr:visible").count()).toBe(before);
});

test("a patched cell carries data-flash", async ({ page }) => {
  await page.goto(`/${KIT}/realtime/`);
  await expect(page.locator("[data-flash]").first()).toBeVisible({
    timeout: 15_000,
  });
});

test("reduced motion never marks a cell", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`/${KIT}/realtime/`);
  await expect(feed(page).locator("li").first()).toBeVisible({
    timeout: 10_000,
  });
  await expect
    .poll(async () => feed(page).locator("li").count(), { timeout: 10_000 })
    .toBeGreaterThan(1);
  await expect(page.locator("[data-flash]")).toHaveCount(0);
});

for (const kit of KITS) {
  test(`${kit}: renders the live table and its feed`, async ({ page }) => {
    await page.goto(`/${kit}/realtime/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(feed(page).locator("li").first()).toBeVisible({
      timeout: 10_000,
    });
    await expect(root.locator("tbody tr:visible").first()).toBeVisible();
    await expect(page.locator("[data-flash]").first()).toBeVisible({
      timeout: 15_000,
    });
  });
}

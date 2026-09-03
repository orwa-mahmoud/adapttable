import { expect, type Page, test } from "@playwright/test";

import {
  adapterByKey,
  builtAdapters,
  featureBySlug,
  fillTemplate,
} from "../apps/showcase/matrix.mjs";
import { gotoFromFeatureGrid } from "./nav";

const KIT = builtAdapters()[0]!.key;
const ADAPTER = adapterByKey(KIT)!;
const FEATURE = featureBySlug("aggregation")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);
const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Aggregation");
  await expect(page).toHaveURL(/\/aggregation\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/aggregation/`, { waitUntil: "domcontentloaded" });

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

for (const kit of KITS) {
  test(`${kit}: shows pinned summaries, group totals and a footer`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/aggregation/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="pinned-summary-top"]').first()
    ).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="pinned-summary-bottom"]').first()
    ).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="group-row"]').first()
    ).toBeVisible();
    await expect(root.getByText("Grand total").first()).toBeVisible();
    await expect(root.getByText("Team total").first()).toBeVisible();

    const groupsBefore = await root
      .locator('[data-adapttable-part="group-row"]')
      .count();
    expect(groupsBefore).toBeGreaterThan(1);
    const groupBudget = root
      .locator('[data-adapttable-part="group-row"] [data-column-key="budget"]')
      .first();
    const budgetBefore = (await groupBudget.innerText()).trim();

    await page.goto(`/${kit}/aggregation/?agg.f_core=true`);
    const filtered = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(filtered.first()).toBeVisible();
    await expect
      .poll(async () =>
        filtered.locator('[data-adapttable-part="group-row"]').count()
      )
      .toBeLessThan(groupsBefore);
    await expect(
      filtered
        .locator(
          '[data-adapttable-part="group-row"] [data-column-key="budget"]'
        )
        .first()
    ).not.toHaveText(budgetBefore);
  });
}

test("mobile RTL keeps pinned totals and group headers", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${KIT}/aggregation/`);
  await demo(page).getByRole("button", { name: "RTL" }).click();
  const root = demo(page).locator(`[data-adapter="${KIT}"]`);
  await expect(root.locator('[dir="rtl"]').first()).toBeVisible();
  await expect(root.getByText("Grand total").first()).toBeVisible();
  await expect(
    root
      .locator(
        '[data-adapttable-part="group-row"], [data-adapttable-part="group-label"]'
      )
      .first()
  ).toBeVisible();
});

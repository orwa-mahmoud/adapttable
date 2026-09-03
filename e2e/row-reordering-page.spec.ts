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
const FEATURE = featureBySlug("row-reordering")!;
const copy = (text: string) => fillTemplate(text, ADAPTER);
const KITS = builtAdapters().map((adapter) => adapter.key);

const demo = (page: Page) => page.locator(".mx-demo");

test("is reachable from the kit's feature grid", async ({ page }) => {
  await gotoFromFeatureGrid(page, "mantine", "Row reordering");
  await expect(page).toHaveURL(/\/row-reordering\/$/);
  await expect(page.getByRole("table").first()).toBeVisible();
});

test("answers the search phrase without JavaScript", async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`/${KIT}/row-reordering/`, { waitUntil: "domcontentloaded" });

  await expect(page).toHaveTitle(copy(FEATURE.title));
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    copy(FEATURE.description)
  );
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    copy(FEATURE.h1)
  );
  await expect(page.locator("main")).toContainText(
    copy(FEATURE.intro[0]!).replaceAll("`", "").slice(0, 60)
  );
  await expect(page.locator("main")).toContainText(ADAPTER.pkg);
  await context.close();
});

for (const kit of KITS) {
  test(`${kit}: exposes a grip and switches into grouped and tree shapes`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/row-reordering/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    await expect(root.first()).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="reorder-cell"]').first()
    ).toBeVisible();

    await demo(page).getByRole("button", { name: "Grouped" }).click();
    await expect(
      root.locator('[data-adapttable-part="group-row"]').first()
    ).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="reorder-cell"]').first()
    ).toBeVisible();

    await demo(page).getByRole("button", { name: "Tree" }).click();
    await expect(
      root.locator('[data-adapttable-part="tree-toggle"]').first()
    ).toBeVisible();
    await expect(
      root.locator('[data-adapttable-part="reorder-cell"]').first()
    ).toBeVisible();
  });

  test(`${kit}: Space-lifts a row and the host writes the new order`, async ({
    page,
  }) => {
    await page.goto(`/${kit}/row-reordering/`);
    const root = demo(page).locator(`[data-adapter="${kit}"]`);
    const rows = root.locator("[data-stagger]");
    await expect(rows.first()).toBeVisible();
    const firstName = "Ada Lovelace";
    const secondName = "Alan Turing";
    await expect(rows.nth(0)).toContainText(firstName);
    await expect(rows.nth(1)).toContainText(secondName);

    const grip = root
      .locator('[data-adapttable-part="row-reorder-handle"]')
      .first();
    await expect(grip).toBeVisible();
    await grip.focus();
    await grip.press(" ");
    await expect(grip).toHaveAttribute("aria-pressed", "true");
    await grip.press("ArrowDown");
    await grip.press(" ");
    await expect(grip).toHaveAttribute("aria-pressed", "false");

    const confirmation = page.locator(
      '[data-adapttable-part="row-move-confirmation"]:visible'
    );
    if ((await confirmation.count()) > 0) {
      await confirmation.getByRole("button", { name: "Move" }).click();
    }
    await expect(rows.nth(0)).toContainText(secondName);
    await expect(rows.nth(0)).not.toContainText(firstName);
  });
}

test("mobile RTL keeps the grip and the tree shape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`/${KIT}/row-reordering/`);
  await demo(page).getByRole("button", { name: "RTL" }).click();
  await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
  await expect(
    demo(page).locator('[data-adapttable-part="row-reorder-buttons"]').first()
  ).toBeVisible();
  await demo(page).getByRole("button", { name: "Tree" }).click();
  await expect(
    demo(page).locator('[data-adapttable-part="tree-toggle"]').first()
  ).toBeVisible();
});

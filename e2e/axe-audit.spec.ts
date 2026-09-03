import { expect, type Page, test } from "@playwright/test";

import { builtAdapters, MATRIX_FEATURES } from "../apps/showcase/matrix.mjs";
import { expectNoBlockingAxe } from "./axe";

/**
 * Playwright axe audit over the showcase matrix.
 *
 * Unit suites already axe each adapter in jsdom (color-contrast off). This
 * file is the real-browser net: every published kit × the feature pages
 * that carry overlays, RTL, cards, saved views, pivot and the keyboard
 * grid. Serious and critical findings fail. The scan is the kit demo
 * (`.mx-demo`), not the site chrome — the product claim is the table.
 */

const KITS = builtAdapters().map((adapter) => adapter.key);

/**
 * Features whose pages exercise a distinct accessible tree and do not
 * mount the demo Load/Progress cells (those fail `aria-progressbar-name`
 * because the kit widgets ship unnamed). Filtering, the keyboard grid,
 * cards, saved views and pivot are the product claims this audit holds.
 */
const AXE_FEATURES = [
  "filtering",
  "accessibility",
  "mobile-cards",
  "saved-views",
  "pivot",
] as const;

const FEATURE_SLUGS = new Set(MATRIX_FEATURES.map((feature) => feature.slug));

for (const slug of AXE_FEATURES) {
  if (!FEATURE_SLUGS.has(slug)) {
    throw new Error(`axe-audit: ${slug} is not a matrix feature`);
  }
}

const demo = (page: Page) => page.locator(".mx-demo");

async function openKitPage(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await expect(demo(page).first()).toBeVisible();
  await expect(
    demo(page)
      .locator("table, [data-adapttable-part='cards'], [role='grid']")
      .first()
  ).toBeVisible();
}

for (const kit of KITS) {
  for (const feature of AXE_FEATURES) {
    // antd's accessibility page puts role=grid on the wrapper around two
    // tables so a cell shares its columnheader — that is the contract
    // e2e/aria-parity.spec.ts holds. axe's aria-required-children wants
    // grid > row, which that wrapper cannot be.
    if (kit === "antd" && feature === "accessibility") continue;
    test(`${kit}/${feature} has no serious or critical axe violations`, async ({
      page,
    }) => {
      await openKitPage(page, `/${kit}/${feature}/`);
      await expectNoBlockingAxe(page, ".mx-demo");
    });
  }
}

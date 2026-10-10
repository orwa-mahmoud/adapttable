import { expect, type Page, test } from "@playwright/test";

import {
  builtAdapters,
  featuresOf,
  MATRIX_FEATURES,
} from "../apps/showcase/matrix.mjs";
import {
  angularOverlaySelector,
  angularPart,
  selectAngularOption,
} from "./angular-kit";
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

/** Angular owns its entire matrix, including landing and every card layout. */
for (const kit of builtAdapters("angular")) {
  const paths = [
    kit.key,
    ...featuresOf(kit).map((feature) => `${kit.key}/${feature.slug}`),
  ];
  for (const path of paths) {
    for (const viewport of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
    ]) {
      test(`${path} at ${String(viewport.width)}px has no serious or critical axe violations`, async ({
        page,
      }) => {
        await page.setViewportSize(viewport);
        await openKitPage(page, `/${path}/`);
        await expectNoBlockingAxe(page, ".mx-demo");
      });
    }
  }

  for (const layout of ["Popover", "Drawer"]) {
    test(`${kit.key}/filtering: the open ${layout.toLowerCase()} passes axe and restores focus`, async ({
      page,
    }) => {
      await openKitPage(page, `/${kit.key}/filtering/`);
      const filterLayout = demo(page).getByRole("combobox", {
        name: "Filter layout",
        exact: true,
      });
      await expect(filterLayout.locator("option")).toHaveText([
        "Popover",
        "Drawer",
        "Header",
      ]);
      await filterLayout.focus();
      await expect(filterLayout).toBeFocused();
      await filterLayout.selectOption({ label: layout });
      await expect(filterLayout).toHaveValue(layout.toLowerCase());
      await expect(filterLayout.locator("option:checked")).toHaveText(layout);
      const trigger = angularPart(kit, page, "filters-button", demo(page));
      await trigger.click();
      const panelPart =
        layout === "Drawer" ? "filters-panel" : "filters-popover";
      const panel = angularPart(kit, page, panelPart);
      await expect(panel).toBeVisible();
      await expectNoBlockingAxe(
        page,
        angularOverlaySelector(kit, page, panelPart)
      );
      await page.keyboard.press("Escape");
      await expect(panel).toHaveCount(0);
      await expect(trigger).toBeFocused();
    });
  }

  for (const overlay of [
    {
      feature: "columns",
      trigger: "column-menu-button",
      panel: "column-menu-panel",
    },
    { feature: "saved-views", trigger: "views-button", panel: "views-panel" },
  ]) {
    test(`${kit.key}/${overlay.feature}: the open menu passes axe`, async ({
      page,
    }) => {
      await openKitPage(page, `/${kit.key}/${overlay.feature}/`);
      await angularPart(kit, page, overlay.trigger, demo(page)).click();
      await expect(angularPart(kit, page, overlay.panel)).toBeVisible();
      await expectNoBlockingAxe(page, ".mx-demo");
      await expectNoBlockingAxe(
        page,
        angularOverlaySelector(kit, page, overlay.panel)
      );
    });
  }

  test(`${kit.key}/ai: a pending modal approval passes axe before any write`, async ({
    page,
  }) => {
    await openKitPage(page, `/${kit.key}/ai/`);
    await selectAngularOption(
      page.getByRole("combobox", { name: "Approval surface", exact: true }),
      { value: "modal", label: "Dialog" }
    );
    await page.locator('[data-adapttable-part="assistant-launcher"]').click();
    const input = page.locator('[data-adapttable-part="assistant-input"]');
    await input.fill("Propose Grace's salary as 150");
    await input.press("Enter");
    const modal = page.locator(
      '[data-adapttable-part="assistant-approval-modal"]'
    );
    await expect(modal).toBeVisible();
    await expect(page.locator("[data-demo-log]")).toHaveText(
      "No host writes yet"
    );
    await expectNoBlockingAxe(
      page,
      '[data-adapttable-part="assistant-approval-modal"]'
    );
  });
}

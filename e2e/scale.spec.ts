import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * The adapter the page-level checks run against — the first whose own pages
 * are built. The per-kit block at the foot of this file loops every one of
 * them, and widens to the whole grid as the rest arrive.
 */
const KIT = builtAdapters()[0]!.key;

/**
 * The scale demo windows tens of thousands of rows through the real Mantine
 * adapter. jsdom has no layout, so only a real browser can prove the window
 * stays bounded — the DOM must hold a few dozen rows, never the whole dataset,
 * even as you scroll.
 */
test.describe("scale — virtualization", () => {
  test("keeps the DOM row count bounded while windowing the full dataset", async ({
    page,
  }) => {
    await page.goto(`/${KIT}/scale/`);
    const rows = page.getByRole("row");
    await expect(rows.first()).toBeVisible();

    // ~24 rows are windowed against the viewport — never the tens of thousands
    // in the source list.
    const initial = await rows.count();
    expect(initial).toBeGreaterThan(0);
    expect(initial).toBeLessThan(120);

    // Scrolling advances the window but the DOM stays just as small.
    await page.mouse.wheel(0, 6000);
    await expect
      .poll(async () => rows.count(), { timeout: 5000 })
      .toBeLessThan(120);
    expect(await rows.count()).toBeGreaterThan(0);
  });

  // Radix is listed explicitly: its Table.Root ScrollArea used to trap the
  // sticky header inside the table, so this only failing on the first kit
  // (usually Mantine) would miss the regression.
  for (const kit of [...new Set([KIT, "radix"])]) {
    test(`${kit}: does not leave a blank gap between the header and the first rows`, async ({
      page,
    }) => {
      await page.goto(`/${kit}/scale/`);
      const firstRow = page.locator('[data-adapttable-part="row"]').first();
      await expect(firstRow).toBeVisible();
      // Window mode used to treat the page chrome as already-scrolled rows,
      // so the first painted row was ~id 7 with a hundreds-of-pixels spacer
      // under the header. The list must start at the top of the dataset.
      await expect(firstRow).toHaveAttribute("data-index", "0");

      const header = page
        .locator('[data-adapttable-part="header-cell"]')
        .first();
      await expect(header).toBeVisible();
      const headerBox = await header.boundingBox();
      const rowBox = await firstRow.boundingBox();
      expect(headerBox && rowBox).toBeTruthy();
      expect(rowBox!.y - (headerBox!.y + headerBox!.height)).toBeLessThan(8);

      await page.mouse.wheel(0, 800);
      await expect(header).toBeVisible();
      await expect
        .poll(async () => {
          const stuck = await header.boundingBox();
          const visible = page.locator('[data-adapttable-part="row"]');
          const count = await visible.count();
          let minGap = Number.POSITIVE_INFINITY;
          for (let i = 0; i < count; i++) {
            const box = await visible.nth(i).boundingBox();
            if (!stuck || !box) continue;
            const gap = box.y - (stuck.y + stuck.height);
            if (gap >= -2 && gap < minGap) minGap = gap;
          }
          return minGap;
        })
        .toBeLessThan(16);
    });
  }
});

/**
 * The adapters whose own pages are built. Each feature page fixes its
 * kit, so the loop is over URLs rather than over clicks on a switcher
 * the page no longer needs — and it widens to the whole grid as the
 * remaining adapters' pages arrive. Virtualization is a per-kit claim:
 * the window is the shell's, but each kit renders the rows and cards.
 */
const KITS = builtAdapters().map((adapter) => adapter.key);

for (const kit of KITS) {
  test(`${kit}: windows 50k rows down to a viewport`, async ({ page }) => {
    await page.goto(`/${kit}/scale/`);
    // Counted by the row part rather than by `tbody tr`: antd virtualizes
    // through its own Table, which draws the body and its rows as divs, so a
    // tag-shaped count reads zero there while 50,000 rows are on screen. Every
    // kit names its rows, whatever element it renders them as.
    const rows = page.locator('[data-adapttable-part="row"]');
    await expect(rows.first()).toBeVisible();
    // The whole point: the DOM holds a window, not the dataset.
    await expect.poll(async () => rows.count()).toBeLessThan(120);
  });

  test(`${kit}: windows mobile cards down to a phone viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`/${kit}/scale/`);
    const cards = page.locator('[data-adapttable-part="card"]');
    await expect(cards.first()).toBeVisible();
    await expect.poll(async () => cards.count()).toBeLessThan(120);
    await page.mouse.wheel(0, 6000);
    await expect
      .poll(async () => cards.count(), { timeout: 5000 })
      .toBeLessThan(120);
  });
}

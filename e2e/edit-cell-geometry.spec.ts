import { expect, type Locator, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * Opening a cell editor keeps the table's geometry: every column keeps its
 * width, the row keeps its height, and the editor stays inside its cell. Every
 * kit of every framework, through each editable cell of the first editable
 * row, on the main demo in both densities — and for React on the AI page,
 * whose rows hold a single line of text.
 */

const PAGES = {
  react: (kit: string) => [
    `/?kit=${kit}`,
    `/?kit=${kit}&density=compact`,
    `/${kit}/ai/`,
  ],
  angular: (kit: string) => [
    `/angular-main/?kit=${kit}`,
    `/angular-main/?kit=${kit}&density=compact`,
  ],
  vue: (kit: string) => [
    `/vue-main/?kit=${kit}`,
    `/vue-main/?kit=${kit}&density=compact`,
  ],
} as const;

const ACTIVATE = '[data-adapttable-part="edit-cell-activate"]';

interface Geometry {
  readonly widths: number[];
  readonly height: number;
}

async function measure(page: Page, row: Locator): Promise<Geometry> {
  return {
    widths: await page.evaluate(() =>
      [...document.querySelectorAll("th")]
        .map((head) => head.getBoundingClientRect().width)
        .filter((width) => width > 0)
    ),
    height: await row.evaluate(
      (element) => element.getBoundingClientRect().height
    ),
  };
}

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const path of PAGES[framework](kit.key)) {
      test(`${framework}/${kit.key} ${path}: opening an editor keeps column widths and row height`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        const row = page
          .locator("tr")
          .filter({ has: page.locator(ACTIVATE) })
          .first();
        // Each editor opens on a freshly loaded, idle table.
        const load = async () => {
          await page.goto(path);
          await expect(row).toBeVisible();
        };
        await load();
        const columns = await row
          .locator("td")
          .evaluateAll(
            (cells, selector) =>
              cells.flatMap((cell, at) =>
                cell.querySelector(selector) ? [at] : []
              ),
            ACTIVATE
          );
        expect(columns.length).toBeGreaterThan(0);
        for (const [step, at] of columns.entries()) {
          if (step > 0) await load();
          const cell = row.locator("td").nth(at);
          const activate = cell.locator(ACTIVATE);
          const label =
            (await cell.getAttribute("data-column-key")) ?? String(at);
          const before = await measure(page, row);
          await activate.focus();
          await activate.press("F2");
          const editor = cell
            .locator('[data-adapttable-part="edit-cell-editor"]')
            .first();
          await expect(editor).toBeVisible();
          const after = await measure(page, row);
          expect(after.widths, `${label}: header count`).toHaveLength(
            before.widths.length
          );
          for (const [index, width] of after.widths.entries()) {
            expect(
              Math.abs(width - before.widths[index]!),
              `${label}: column ${String(index)} width`
            ).toBeLessThanOrEqual(0.5);
          }
          expect(
            Math.abs(after.height - before.height),
            `${label}: row height`
          ).toBeLessThanOrEqual(0.5);
          // Both boxes in one frame: a page may still be scrolling the
          // focused cell into view.
          const inside = await editor.evaluate((element) => {
            const box = element.getBoundingClientRect();
            const frame = element.closest("td")!.getBoundingClientRect();
            return {
              start: box.left - frame.left,
              end: frame.right - box.right,
              top: box.top - frame.top,
              bottom: frame.bottom - box.bottom,
            };
          });
          for (const [edge, gap] of Object.entries(inside)) {
            expect(
              gap,
              `${label}: editor ${edge} inside its cell`
            ).toBeGreaterThanOrEqual(-0.5);
          }
        }
      });
    }
  }
}

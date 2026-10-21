import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * Opening a cell editor keeps the table's geometry: every column keeps its
 * width, the row never shrinks, and the editor stays inside its cell. Every
 * kit of every framework, on its main demo, through each editable cell of the
 * first editable row.
 */

const DEMOS = [
  { framework: "react", path: "/" },
  { framework: "angular", path: "/angular-main/" },
  { framework: "vue", path: "/vue-main/" },
] as const;

const ACTIVATE = '[data-adapttable-part="edit-cell-activate"]';

interface Geometry {
  readonly widths: number[];
  readonly height: number;
}

function measure(page: Page): Promise<Geometry> {
  return page.evaluate(() => ({
    widths: [...document.querySelectorAll("th")]
      .map((head) => head.getBoundingClientRect().width)
      .filter((width) => width > 0),
    height: document
      .querySelector("[data-geometry-row]")!
      .getBoundingClientRect().height,
  }));
}

for (const demo of DEMOS) {
  for (const kit of builtAdapters(demo.framework)) {
    test(`${demo.framework}/${kit.key}: opening an editor keeps column widths and row height`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1440, height: 900 });
      const row = page
        .locator("tr")
        .filter({ has: page.locator(ACTIVATE) })
        .first();
      // Each editor opens on a freshly loaded, idle table.
      const load = async () => {
        await page.goto(`${demo.path}?kit=${kit.key}`);
        await expect(row).toBeVisible();
        await row.evaluate((element) =>
          element.setAttribute("data-geometry-row", "")
        );
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
        const before = await measure(page);
        await activate.focus();
        await activate.press("F2");
        const editor = cell
          .locator('[data-adapttable-part="edit-cell-editor"]')
          .first();
        await expect(editor).toBeVisible();
        const after = await measure(page);
        expect(after.widths, `${label}: header count`).toHaveLength(
          before.widths.length
        );
        for (const [index, width] of after.widths.entries()) {
          expect(
            Math.abs(width - before.widths[index]!),
            `${label}: column ${String(index)} width`
          ).toBeLessThanOrEqual(0.5);
        }
        expect(after.height, `${label}: row height`).toBeGreaterThanOrEqual(
          before.height - 0.5
        );
        const [box, frame] = await Promise.all([
          editor.boundingBox(),
          cell.boundingBox(),
        ]);
        expect(box!.x, `${label}: editor start`).toBeGreaterThanOrEqual(
          frame!.x - 0.5
        );
        expect(box!.x + box!.width, `${label}: editor end`).toBeLessThanOrEqual(
          frame!.x + frame!.width + 0.5
        );
      }
    });
  }
}

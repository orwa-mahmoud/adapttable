import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

const KITS = builtAdapters().map((adapter) => adapter.key);

/**
 * The same table, described the same way by every kit.
 *
 * Each adapter renders through its own kit's components, so an attribute core
 * computes can reach seven of them and quietly miss the eighth — and the miss is
 * invisible, because the table still looks right and every per-adapter suite
 * still passes. Two such differences had shipped: `role="cell"` survived on
 * cells inside a `role="grid"` table in three kits, where a bare `<td>` maps to
 * `gridcell`, and `scope="col"` was on four header cells out of eight.
 *
 * Roles are compared as the browser COMPUTES them, not as attributes. A `<th>`
 * is a `columnheader` whether or not a kit says so, and holding every adapter to
 * the same spelling of something the platform already guarantees would be churn
 * with nothing behind it. What the attribute comparison covers is the state that
 * has no implicit source — the dataset counts, the absolute indices, and the
 * HTML header association.
 *
 * It says nothing about WHICH shape is correct; that is what the per-adapter
 * suites are for. It says only that no kit may disagree with the rest alone.
 */
const ATTRIBUTES = {
  table: ["aria-rowcount", "aria-colcount", "aria-label"],
  row: ["aria-rowindex"],
  cell: ["aria-colindex"],
  header: ["scope", "aria-sort"],
} as const;

/** Pages chosen for their table state: one plain, one a keyboard grid. */
const PAGES = ["all-options", "accessibility"] as const;

for (const page of PAGES) {
  test(`${page}: every kit describes the table the same way`, async ({
    page: browser,
  }) => {
    const shapes = new Map<string, unknown>();
    for (const kit of KITS) {
      await browser.goto(`/${kit}/${page}/`);
      await browser.locator("table").first().waitFor({ state: "visible" });
      shapes.set(
        kit,
        await browser.evaluate((attributes) => {
          const read = (el: Element | null, names: readonly string[]) =>
            Object.fromEntries(
              names.map((name) => [name, el?.getAttribute(name) ?? null])
            );
          // The table holding the ROWS: antd splits header and body into two
          // <table> elements, and the first in the document is its header.
          const row = document.querySelector('[data-adapttable-part="row"]');
          const table = row?.closest("table") ?? null;
          const cell = document.querySelector('[data-adapttable-part="cell"]');
          const header = document.querySelector(
            '[data-adapttable-part="header-cell"]'
          );
          return {
            attributes: {
              table: read(table, attributes.table),
              row: read(row, attributes.row),
              cell: read(cell, attributes.cell),
              header: read(header, attributes.header),
            },
            // An explicit role only matters where it OVERRIDES the implicit one,
            // which is exactly how `role="cell"` reached a grid's cells.
            explicitRoles: {
              table: table?.getAttribute("role") ?? null,
              cell: cell?.getAttribute("role") ?? null,
            },
          };
        }, ATTRIBUTES)
      );
    }

    const [reference, ...rest] = [...shapes.keys()];
    for (const kit of rest) {
      expect(
        shapes.get(kit),
        `${kit} describes the table differently from ${reference}`
      ).toEqual(shapes.get(reference!));
    }
  });

  test(`${page}: every kit exposes the same roles to assistive tech`, async ({
    page: browser,
  }) => {
    const roles = new Map<string, unknown>();
    for (const kit of KITS) {
      await browser.goto(`/${kit}/${page}/`);
      await browser.locator("table").first().waitFor({ state: "visible" });
      roles.set(kit, {
        // How many <table> ELEMENTS a kit uses is its own layout choice — antd
        // splits header and body in two so its header can stick — so what is
        // compared is the roles they add up to, not the elements.
        grids: await browser.getByRole("grid").count(),
        columnheaders: await browser.getByRole("columnheader").count(),
        gridcells: await browser.getByRole("gridcell").count(),
        // Zero on a grid page. This is the count that caught `role="cell"`
        // overriding the `gridcell` a `<td>` maps to inside a grid.
        cells: await browser.getByRole("cell").count(),
      });
    }

    const [reference, ...rest] = [...roles.keys()];
    for (const kit of rest) {
      expect(
        roles.get(kit),
        `${kit} exposes different roles from ${reference}`
      ).toEqual(roles.get(reference!));
    }
  });
}

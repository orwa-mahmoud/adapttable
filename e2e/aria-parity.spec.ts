import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { configureFeatureLab } from "./feature-lab";

const KITS = builtAdapters().map((adapter) => adapter.key);

/**
 * The Feature Lab renders every kit on one page and the card picks which one,
 * so a cross-kit walk switches cards instead of URLs.
 */
async function selectKit(page: Page, kit: string): Promise<void> {
  if (kit === KITS[0]) return;
  await page.getByTestId(`adapter-${kit}`).scrollIntoViewIfNeeded();
  await page.getByTestId(`adapter-${kit}`).click();
}

/** It says nothing about which shape is right — only that no kit is alone. */
function assertOneShape(shapes: Map<string, unknown>, surface: string): void {
  const [reference, ...rest] = [...shapes.keys()];
  for (const kit of rest) {
    expect(
      shapes.get(kit),
      `${kit} builds a different ${surface} from ${reference}`
    ).toEqual(shapes.get(reference!));
  }
}

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

/**
 * The column menu, opened.
 *
 * Each kit's popover decides whether the panel comes out a `dialog` or a
 * `group`, and that is the kit's business. What is NOT the kit's business is
 * whether the panel has a name: four kits opened an unnamed dialog, and two
 * put the column list inside a wrapper their kit had already marked
 * `presentation` or `tooltip`, so a screen reader was told the trigger had
 * expanded something it could not identify.
 */
test("every kit opens a named column menu", async ({ page }) => {
  const shapes = new Map<string, unknown>();
  for (const kit of KITS) {
    await page.goto(`/${kit}/columns/`);
    const trigger = page
      .locator('[data-adapttable-part="column-menu-button"]')
      .first();
    await trigger.waitFor();
    await trigger.click();
    await page
      .locator('[data-adapttable-part="column-menu-item"]')
      .first()
      .waitFor();

    const named =
      (await page.getByRole("dialog", { name: "Columns" }).count()) +
      (await page.getByRole("group", { name: "Columns" }).count());
    expect(named, `${kit} opens a column menu with no accessible name`).toBe(1);
    shapes.set(kit, {
      expanded: await trigger.getAttribute("aria-expanded"),
      items: await page
        .locator('[data-adapttable-part="column-menu-item"]')
        .count(),
    });
  }

  const [reference, ...rest] = [...shapes.keys()];
  for (const kit of rest) {
    expect(
      shapes.get(kit),
      `${kit} opens a different column menu from ${reference}`
    ).toEqual(shapes.get(reference!));
  }
});

/**
 * The pivot panel, which every kit builds from core's chrome rather than from
 * its own components. Its three zones are the drop targets a keyboard user has
 * to tell apart, so each one is a `fieldset` named by its `legend` — the same
 * shape the column menu settled on. Nothing here may vary by kit.
 */
test("every kit groups the pivot panel's zones the same way", async ({
  page,
}) => {
  const shapes = new Map<string, unknown>();

  for (const kit of KITS) {
    await page.goto(`/${kit}/pivot/`);
    const panel = page.locator('[data-adapttable-part="pivot-panel"]').first();
    await panel.waitFor();

    shapes.set(
      kit,
      await panel.evaluate((root) => ({
        zones: [
          ...root.querySelectorAll('[data-adapttable-part="pivot-zone"]'),
        ].map((zone) => ({
          tag: zone.tagName.toLowerCase(),
          legend:
            zone.querySelector(":scope > legend")?.textContent?.trim() ?? null,
        })),
      }))
    );

    for (const zone of ["Rows", "Columns", "Measures"]) {
      expect(
        await page.getByRole("group", { name: zone }).count(),
        `${kit} has no named "${zone}" zone in the pivot panel`
      ).toBeGreaterThan(0);
    }
  }

  const [reference, ...rest] = [...shapes.keys()];
  for (const kit of rest) {
    expect(
      shapes.get(kit),
      `${kit} groups the pivot panel differently from ${reference}`
    ).toEqual(shapes.get(reference!));
  }
});

/**
 * The saved-views panel, also core's chrome in every kit. Its controls are the
 * ones a keyboard user reaches to rename, apply and delete a view, so what
 * matters is that each of them is named — an unnamed button here reads as
 * "button" and gives no way to tell apply from delete.
 */
test("every kit names every control in the saved-views panel", async ({
  page,
}) => {
  const shapes = new Map<string, unknown>();

  for (const kit of KITS) {
    await page.goto(`/${kit}/saved-views/`);
    const panel = page
      .locator('[data-adapttable-part="saved-views-panel"]')
      .first();
    await panel.waitFor();

    const shape = await panel.evaluate((root) => {
      const controls = [...root.querySelectorAll("button, input, select")];
      const named = (el: Element) =>
        el.getAttribute("aria-label") ??
        ((el.getAttribute("aria-labelledby") ??
          (el.textContent ?? "").trim()) ||
          (el as HTMLInputElement).placeholder ||
          (el.id
            ? (root.querySelector(`label[for="${el.id}"]`)?.textContent ?? "")
            : "") ||
          (el.closest("label")?.textContent ?? ""));
      return {
        rows: root.querySelectorAll('[data-adapttable-part="saved-view-row"]')
          .length,
        controls: controls.length,
        unnamed: controls
          .filter(
            (el) =>
              el.getAttribute("aria-hidden") !== "true" &&
              el.getAttribute("tabindex") !== "-1" &&
              !String(named(el)).trim()
          )
          .map((el) => el.tagName.toLowerCase()),
      };
    });

    expect(
      shape.unnamed,
      `${kit} has unnamed controls in the saved-views panel`
    ).toEqual([]);
    shapes.set(kit, shape);
  }

  const [reference, ...rest] = [...shapes.keys()];
  for (const kit of rest) {
    expect(
      shapes.get(kit),
      `${kit} builds a different saved-views panel from ${reference}`
    ).toEqual(shapes.get(reference!));
  }
});

/**
 * Two Feature Lab surfaces, which every kit builds from core's chrome behind
 * its own primitives. Both live on `/all-options/`, where the kit is chosen by
 * card rather than by URL, so one test walks all eight on one page.
 *
 * Roles are compared as the browser COMPUTES them. `aria-modal` deliberately is
 * NOT compared: Radix Themes traps focus instead of setting it, ARIA does not
 * require it, and holding eight kits to one spelling of modality would be churn.
 */
test("every kit exposes the same side panel", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/all-options/");
  await configureFeatureLab(page, "side panel", "On");
  const shapes = new Map<string, unknown>();

  for (const kit of KITS) {
    await selectKit(page, kit);
    const root = page.locator(`[data-adapter="${kit}"]`);
    // antd's first `tbody tr` is an aria-hidden measure row, so a visible-row
    // wait has to key off content rather than position.
    await expect(root.getByText("Ada Lovelace").first()).toBeVisible();

    const tabs = root.getByRole("tablist", { name: "Table settings" });
    await expect(
      tabs,
      `${kit} has no side panel tablist named "Table settings"`
    ).toHaveCount(1);

    shapes.set(kit, {
      tabs: await tabs.getByRole("tab").count(),
      selected: await tabs.getByRole("tab", { selected: true }).count(),
      panels: await root.getByRole("tabpanel").count(),
      unnamedTabs: await tabs
        .getByRole("tab")
        .evaluateAll(
          (nodes) =>
            nodes.filter(
              (n) =>
                !(n.getAttribute("aria-label") ?? n.textContent ?? "").trim()
            ).length
        ),
    });
  }

  assertOneShape(shapes, "side panel");
});

test("every kit exposes the same command palette", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/all-options/");
  await configureFeatureLab(page, "command palette (⌘k)", "On");
  const shapes = new Map<string, unknown>();

  for (const kit of KITS) {
    await selectKit(page, kit);
    const root = page.locator(`[data-adapter="${kit}"]`);
    const cell = root.getByText("Ada Lovelace").first();
    await expect(cell).toBeVisible();
    await cell.click();
    await page.keyboard.press("Meta+k");

    // The named DIALOG is the assertion, not the part attribute: MUI spreads
    // unrecognised props onto a `role="presentation"` Modal root, so its name
    // has to reach the paper to exist at all.
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(
      dialog,
      `${kit} opens a command palette with no accessible name`
    ).toHaveCount(1);

    shapes.set(kit, {
      combobox: await dialog.getByRole("combobox").count(),
      listboxes: await dialog.getByRole("listbox").count(),
      options: await dialog.getByRole("option").count(),
      unnamedOptions: await dialog
        .getByRole("option")
        .evaluateAll(
          (nodes) => nodes.filter((n) => !(n.textContent ?? "").trim()).length
        ),
    });

    // The palette portals to the document, so a kit that leaves it open makes
    // the next kit read this one's node.
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
  }

  assertOneShape(shapes, "command palette");
});

/**
 * The find bar, reached the way a user reaches it: Ctrl/Cmd+F on a focused
 * cell. The chord lives in `useGridFocus`, so the gesture needs a focused cell
 * and `findInTable` on — the lab ties the latter to cell editing.
 */
test("every kit exposes the same find bar", async ({ page }) => {
  test.setTimeout(180_000);
  await page.goto("/all-options/");
  await configureFeatureLab(page, "editing mode", "Cell");
  const shapes = new Map<string, unknown>();

  for (const kit of KITS) {
    await selectKit(page, kit);
    const root = page.locator(`[data-adapter="${kit}"]`);
    const cell = root.getByText("Ada Lovelace").first();
    await expect(cell).toBeVisible();
    await cell.click();
    await page.keyboard.press("Meta+f");

    const bar = root.locator('[data-adapttable-part="find-bar"]');
    await expect(
      bar,
      `${kit} does not open a find bar on the chord`
    ).toHaveCount(1);

    shapes.set(kit, {
      // The match count is a live region by element, not by role.
      countTag: await bar
        .locator('[data-adapttable-part="find-count"]')
        .evaluate((node) => node.tagName.toLowerCase()),
      buttons: await bar.getByRole("button").count(),
      namedInputs: await bar.getByRole("textbox").count(),
      unnamedButtons: await bar
        .getByRole("button")
        .evaluateAll(
          (nodes) =>
            nodes.filter(
              (n) =>
                !(n.getAttribute("aria-label") ?? n.textContent ?? "").trim()
            ).length
        ),
    });

    await page.keyboard.press("Escape");
  }

  assertOneShape(shapes, "find bar");
});

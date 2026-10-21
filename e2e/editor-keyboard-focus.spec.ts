import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * Every editor a cell opens takes keyboard focus, and Escape hands it back:
 * F2 — or, on the main demos, which set `editActivation: "click"`, a single
 * click — on the idle cell puts focus inside the editor, and Escape closes it
 * and returns focus to the cell. Every kit of every framework, through each
 * editable cell of the first editable row on its main demo.
 */

const DEMOS = {
  react: "/",
  angular: "/angular-main/",
  vue: "/vue-main/",
} as const;

const ACTIVATE = '[data-adapttable-part="edit-cell-activate"]';

async function eachEditableCell(
  page: Page,
  path: string,
  open: (activate: ReturnType<Page["locator"]>) => Promise<void>
): Promise<void> {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(path);
  const row = page
    .locator("tr")
    .filter({ has: page.locator(ACTIVATE) })
    .first();
  await expect(row).toBeVisible();
  const columns = await row
    .locator("td")
    .evaluateAll(
      (cells, selector) =>
        cells.flatMap((cell, at) => (cell.querySelector(selector) ? [at] : [])),
      ACTIVATE
    );
  expect(columns.length).toBeGreaterThan(0);
  for (const at of columns) {
    const cell = row.locator("td").nth(at);
    const label = (await cell.getAttribute("data-column-key")) ?? String(at);
    const activate = cell.locator(`${ACTIVATE}:visible`);
    await open(activate);
    await expect(
      cell.locator('[data-adapttable-part="edit-cell-editor"]').first(),
      `${label}: editor`
    ).toBeVisible();
    await expect
      .poll(
        () =>
          cell.evaluate(
            (element) =>
              element.contains(document.activeElement) &&
              !document.activeElement!.closest('[aria-hidden="true"]')
          ),
        { message: `${label}: focus inside the editor` }
      )
      .toBe(true);
    // A kit select may take the first Escape to close its list.
    await page.keyboard.press("Escape");
    if (!(await activate.isVisible())) await page.keyboard.press("Escape");
    await expect(activate, `${label}: editor closed`).toBeVisible();
    await expect(activate, `${label}: focus back on the cell`).toBeFocused();
  }
}

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    const path = `${DEMOS[framework]}?kit=${kit.key}`;

    test(`${framework}/${kit.key}: F2 focuses each editor and Escape returns focus to the cell`, async ({
      page,
    }) => {
      await eachEditableCell(page, path, async (activate) => {
        await activate.focus();
        await activate.press("F2");
      });
    });

    test(`${framework}/${kit.key}: one click opens each editor on the demo`, async ({
      page,
    }) => {
      await eachEditableCell(page, path, async (activate) => {
        await activate.click();
      });
    });
  }
}

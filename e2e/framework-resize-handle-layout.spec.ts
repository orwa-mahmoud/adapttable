import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src/catalog";

for (const framework of ["angular", "vue"]) {
  for (const kit of builtAdapters(framework)) {
    for (const locale of ["en", "ar"]) {
      test(`${framework}/${kit.key}: ${locale} live resize handles stay within their own headers`, async ({
        page,
      }) => {
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.goto(`/${framework}-main/?kit=${kit.key}&locale=${locale}`);
        const labels = getLabels(locale);
        const handles = page
          .getByLabel(new RegExp(`^${labels.resizeColumn}:`))
          .and(page.locator(":not(.ant-table-measure-row *)"));
        await expect(handles.first()).toBeVisible();
        await page.evaluate(() => document.fonts.ready);
        const geometry = await handles.evaluateAll((elements) =>
          elements.map((element) => {
            const header = element.closest('th, [role="columnheader"]');
            if (!header) throw new Error("Resize handle has no column header.");
            const handle = element.getBoundingClientRect();
            const cell = header.getBoundingClientRect();
            return {
              label: element.getAttribute("aria-label"),
              handle: {
                x: handle.x,
                y: handle.y,
                right: handle.right,
                bottom: handle.bottom,
                height: handle.height,
              },
              cell: {
                x: cell.x,
                y: cell.y,
                right: cell.right,
                bottom: cell.bottom,
                height: cell.height,
              },
            };
          })
        );
        for (const { label, handle, cell } of geometry) {
          expect(handle.height, label ?? "resize height").toBeLessThanOrEqual(
            cell.height + 2
          );
          expect(handle.y, label ?? "resize top").toBeGreaterThanOrEqual(
            cell.y - 2
          );
          expect(handle.bottom, label ?? "resize bottom").toBeLessThanOrEqual(
            cell.bottom + 2
          );
          expect(handle.x, label ?? "resize left").toBeGreaterThanOrEqual(
            cell.x - 4
          );
          expect(handle.right, label ?? "resize right").toBeLessThanOrEqual(
            cell.right + 4
          );
        }
      });
    }
  }
}

test("Vuetify's embedded app wrapper fits the table without a viewport-height gap", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1200 });
  await page.goto("/vue-main/?kit=vuetify");
  const root = page.locator('[data-adapttable-part="root"]');
  await expect(root).toBeVisible();
  const geometry = await root.evaluate((element) => {
    const wrapper = element.closest(".v-application__wrap");
    if (!wrapper) throw new Error("Vuetify app wrapper is missing.");
    return {
      table: element.getBoundingClientRect().height,
      wrapper: wrapper.getBoundingClientRect().height,
    };
  });
  expect(geometry.wrapper).toBeLessThanOrEqual(geometry.table + 2);
});

/**
 * One spec per framework. `?library=1&locale=ar` sets that kit's own provider
 * and leaves the table's dir and labels unset, so a green run is the provider
 * and not the page query.
 *
 * The server half of direction lives in each kit's `library-environment` SSR
 * test. The showcase mounts the table in the browser, so these specs cover
 * the page after that mount, including a pinned column and the columns menu.
 */
import { expect, type Page } from "@playwright/test";

import { pathOf } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src/index";

type Framework = "react" | "vue" | "angular";

/** What the kit provider can set. A kit with no such setting stays English LTR. */
const EXPECTED: Record<string, { dir: "ltr" | "rtl"; locale: "en" | "ar" }> = {
  antd: { dir: "rtl", locale: "ar" },
  mantine: { dir: "rtl", locale: "en" },
  mui: { dir: "rtl", locale: "en" },
  chakra: { dir: "rtl", locale: "ar" },
  "base-ui": { dir: "rtl", locale: "en" },
  radix: { dir: "ltr", locale: "en" },
  shadcn: { dir: "ltr", locale: "en" },
  tailwind: { dir: "ltr", locale: "en" },
  "vue-unstyled": { dir: "ltr", locale: "en" },
  "element-plus": { dir: "ltr", locale: "ar" },
  vuetify: { dir: "rtl", locale: "ar" },
  "naive-ui": { dir: "rtl", locale: "ar" },
  "reka-ui": { dir: "rtl", locale: "ar" },
  "shadcn-vue": { dir: "rtl", locale: "ar" },
  "nuxt-ui": { dir: "rtl", locale: "ar" },
  quasar: { dir: "rtl", locale: "ar" },
  unstyled: { dir: "ltr", locale: "en" },
  "ng-zorro": { dir: "rtl", locale: "ar" },
  material: { dir: "rtl", locale: "en" },
  "ng-bootstrap": { dir: "ltr", locale: "en" },
  aria: { dir: "rtl", locale: "en" },
  "ngx-bootstrap": { dir: "ltr", locale: "en" },
  "angular-cdk": { dir: "rtl", locale: "en" },
  spartan: { dir: "rtl", locale: "en" },
  "taiga-ui": { dir: "ltr", locale: "ar" },
};

function columnsUrl(framework: Framework, kit: { path?: string; key: string }) {
  const path = pathOf(kit);
  const query = "locale=ar&library=1";
  const base =
    framework === "vue" ? `/vue/${path}/columns/` : `/${path}/columns/`;
  return `${base}?${query}`;
}

/** Opens the columns page with only the kit provider set and checks the result. */
export async function assertLibraryKit(
  page: Page,
  framework: Framework,
  kit: { path?: string; key: string }
): Promise<void> {
  const expected = EXPECTED[kit.key];
  if (!expected) {
    throw new Error(`no library expectation for ${framework} kit ${kit.key}`);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(columnsUrl(framework, kit));
  const root = page.locator('[data-adapttable-part="root"]');
  await expect(root).toBeVisible();
  await expect(root).toHaveCSS("direction", expected.dir);
  const stamped = await root.getAttribute("dir");
  if (expected.dir === "rtl" || stamped !== null) {
    expect(stamped).toBe(expected.dir);
  }

  const labels = getLabels(expected.locale);
  await expect(root).toContainText(labels.rowsPerPage);

  const pinned = root.locator('[data-pinned="start"]');
  await expect(pinned.first()).toBeVisible();
  await expect(pinned.first()).toHaveCSS("direction", expected.dir);

  await root.getByRole("button", { name: labels.columns, exact: true }).click();
  const item = page
    .locator('[data-adapttable-part="column-menu-item"]')
    .first();
  await expect(item).toBeVisible();
  await expect(item).toHaveCSS("direction", expected.dir);
}

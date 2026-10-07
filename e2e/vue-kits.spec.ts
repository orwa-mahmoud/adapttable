import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { VUE_KIT_PAGES } from "../apps/showcase/matrix.mjs";
import { workspaceCopy } from "../apps/showcase/src/vue/workspace/copy";
import { getLabels } from "../packages/shared/i18n/src/index";
import { expectDensityGeometry } from "./vue-kit-density-geometry";

const part = (name: string) => `[data-adapttable-part="${name}"]`;
async function paginationControl(
  surface: ReturnType<Page["locator"]>,
  name: string,
  cards: boolean
) {
  const pageSize = surface.getByRole("combobox", { name, exact: true });
  // Auto pagination uses incremental loading for cards and pages for tables.
  if (cards) {
    await expect(pageSize).toHaveCount(0);
    return { pageSize, originalPageSize: null };
  }
  await expect(pageSize).toBeVisible();
  const originalPageSize = await pageSize.elementHandle();
  if (!originalPageSize)
    throw new Error("Desktop pagination must retain its select");
  return { pageSize, originalPageSize };
}

const selectionVisual: Readonly<Record<string, string>> = {
  "element-plus": ".el-checkbox__inner",
  vuetify: ".v-selection-control__input",
  "shadcn-vue": '[role="checkbox"]',
  quasar: '[role="checkbox"] .q-checkbox__inner',
};
async function expectUtilityGeometry(page: Page, kit: string): Promise<void> {
  const visual = selectionVisual[kit];
  if (!visual) return;
  const surface = page.locator(".vue-kit-preview__table");
  const header = surface.locator(part("selection-header"));
  const cells = surface.locator(part("selection-cell"));
  const headerBox = (await header.boundingBox())!;
  expect(headerBox.width).toBeGreaterThan(24);
  expect(headerBox.width).toBeLessThanOrEqual(96);
  const headerControl = (await header.locator(visual).boundingBox())!;
  expect(headerControl.width).toBeGreaterThan(0);
  for (const cell of await cells.all()) {
    const box = (await cell.boundingBox())!;
    expect(Math.abs(box.width - headerBox.width)).toBeLessThanOrEqual(1);
    const control = (await cell.locator(visual).boundingBox())!;
    expect(control.width).toBeGreaterThan(0);
    expect(
      Math.abs(
        control.x +
          control.width / 2 -
          headerControl.x -
          headerControl.width / 2
      )
    ).toBeLessThanOrEqual(1);
  }
  const pageSizeGroup = surface.locator(`${part("footer")} > div:first-child`);
  // Native table density transitions move the whole footer. Measure its label
  // and select in one frame, then retry the unchanged alignment bound.
  await expect
    .poll(async () => {
      const geometry = await pageSizeGroup.evaluate((group) => {
        const label = group.querySelector(":scope > span");
        const select = group.querySelector(
          '[data-adapttable-part="rows-per-page"]'
        );
        if (!label || !select)
          throw new Error(
            "Desktop pagination must retain its label and select"
          );
        const labelBox = label.getBoundingClientRect();
        const selectBox = select.getBoundingClientRect();
        const range = document.createRange();
        range.selectNodeContents(label);
        return {
          lines: range.getClientRects().length,
          labelWidth: labelBox.width,
          selectWidth: selectBox.width,
          centerDelta: Math.abs(
            labelBox.y +
              labelBox.height / 2 -
              selectBox.y -
              selectBox.height / 2
          ),
        };
      });
      expect(geometry.lines).toBe(1);
      expect(geometry.labelWidth).toBeGreaterThan(0);
      expect(geometry.selectWidth).toBeGreaterThan(0);
      return geometry.centerDelta;
    })
    .toBeLessThanOrEqual(2);
}

async function expectLegalFooter(page: Page): Promise<void> {
  const link = page.getByRole("link", {
    name: "Third-party notices",
    exact: true,
  });
  await expect(link).toHaveAttribute("href", "../../third-party-notices.txt");
  const layout = await link.evaluate((element) => {
    const preview = document.querySelector<HTMLElement>(".vue-kit-preview")!;
    const footer = element.closest("footer")!;
    const box = footer.getBoundingClientRect();
    const shell = preview.getBoundingClientRect();
    const style = getComputedStyle(footer);
    const shellStyle = getComputedStyle(preview);
    const linkBox = element.getBoundingClientRect();
    return {
      start: box.x + parseFloat(style.paddingLeft),
      shellStart: shell.x + parseFloat(shellStyle.paddingLeft),
      right: box.right - parseFloat(style.paddingRight),
      shellRight: shell.right - parseFloat(shellStyle.paddingRight),
      linkLeft: linkBox.left,
      linkRight: linkBox.right,
      gap:
        box.top -
        preview.querySelector("footer")!.getBoundingClientRect().bottom,
      fontSize: parseFloat(getComputedStyle(element).fontSize),
      color: getComputedStyle(element).color,
      footerColor: style.color,
    };
  });
  expect(Math.abs(layout.start - layout.shellStart)).toBeLessThanOrEqual(1);
  expect(Math.abs(layout.right - layout.shellRight)).toBeLessThanOrEqual(1);
  expect(layout.linkLeft).toBeGreaterThanOrEqual(layout.start);
  expect(layout.linkRight).toBeLessThanOrEqual(layout.right);
  expect(layout.gap).toBeGreaterThanOrEqual(16);
  expect(layout.gap).toBeLessThanOrEqual(32);
  expect(layout.fontSize).toBe(12);
  expect(layout.color).toBe(layout.footerColor);
}

const scenarios = [
  {
    name: "desktop-light",
    width: 1440,
    height: 1000,
    theme: "light",
    lang: "en",
    cards: false,
  },
  {
    name: "desktop-dark",
    width: 1440,
    height: 1000,
    theme: "dark",
    lang: "en",
    cards: false,
  },
  {
    name: "mobile-light",
    width: 390,
    height: 844,
    theme: "light",
    lang: "en",
    cards: true,
  },
  {
    name: "mobile-rtl-dark",
    width: 390,
    height: 844,
    theme: "dark",
    lang: "ar",
    cards: true,
  },
  {
    name: "desktop-rtl-dark",
    width: 1440,
    height: 1000,
    theme: "dark",
    lang: "ar",
    cards: false,
  },
] as const;

async function screenshot(
  page: Page,
  info: TestInfo,
  name: string
): Promise<void> {
  const path = info.outputPath(`vue-kit-${name}.png`);
  await page.screenshot({ path, fullPage: true, animations: "disabled" });
  await info.attach(name, { path, contentType: "image/png" });
}

for (const kit of VUE_KIT_PAGES) {
  const route = `/${kit.dir}/`;
  test.describe(kit.key, () => {
    for (const scenario of scenarios) {
      test(`${scenario.name}: genuine table, readable layout and screenshot`, async ({
        page,
      }, info) => {
        const errors: string[] = [];
        page.on("pageerror", (error) => errors.push(error.message));
        await page.setViewportSize({
          width: scenario.width,
          height: scenario.height,
        });
        const response = await page.goto(
          `${route}?theme=${scenario.theme}&lang=${scenario.lang}`
        );
        expect(response?.status()).toBe(200);
        await expect(page.locator(".vue-kit-preview")).toHaveAttribute(
          "data-kit",
          kit.path
        );
        await expect(page.getByTestId("parity-notice")).toBeVisible();
        await expect(page.locator("html")).toHaveAttribute(
          "dir",
          scenario.lang === "ar" ? "rtl" : "ltr"
        );
        await expect(page.locator("body")).toHaveAttribute(
          "data-workspace-theme",
          scenario.theme
        );
        const surface = page.locator(".vue-kit-preview__table");
        await expect(surface.locator(part("scroll-box"))).toHaveCount(1);
        if (scenario.cards) {
          await expect(surface.locator(part("card")).first()).toBeVisible();
          await expect(surface.locator(part("table"))).toHaveCount(0);
        } else {
          await expect(surface.getByRole("table")).toBeVisible();
          await expect(surface.locator("tbody [data-row-id]")).toHaveCount(5);
          if (kit.path === "quasar") {
            await expect(surface.getByRole("table")).toHaveCSS(
              "border-spacing",
              "0px"
            );
            await expect(
              surface.locator("tbody [data-row-id]").first()
            ).toHaveClass(/\bq-tr\b/);
          }
          await expectUtilityGeometry(page, kit.path);
        }
        await expectLegalFooter(page);
        await expect(surface.getByRole("searchbox")).toBeVisible();
        expect(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth
          )
        ).toBeLessThanOrEqual(1);
        await screenshot(page, info, `${kit.path}-${scenario.name}`);
        expect(errors).toEqual([]);
      });
    }

    test("keyboard sorting, controlled selection, searching and pagination", async ({
      page,
    }, info) => {
      await page.goto(`${route}?theme=light`);
      const table = page.getByRole("table", {
        name: "Order desk",
        exact: true,
      });
      const customer = table.getByRole("button", {
        name: `${getLabels("en").sortBy}: ${workspaceCopy.en.customer}`,
        exact: true,
      });
      await customer.focus();
      await page.keyboard.press("Enter");
      await expect(customer).toBeFocused();
      await expect(table.locator('th[aria-sort="ascending"]')).toContainText(
        "Customer"
      );
      const first = table.locator("tbody [data-row-id]").first();
      await expect(first).toHaveAttribute("data-row-id", "ORD-1042");
      const selected = first.getByRole("checkbox");
      await selected.focus();
      await page.keyboard.press("Space");
      await expect(selected).toBeChecked();
      await expect(selected).toBeFocused();
      await first.hover();
      await expectUtilityGeometry(page, kit.path);
      await expect(page.getByTestId("selection-status")).toHaveText(
        "1 selected"
      );
      await page.getByRole("searchbox").fill("Cedar");
      await expect(table.locator("tbody [data-row-id]")).toHaveCount(1);
      await expect(table.locator("tbody [data-row-id]")).toHaveAttribute(
        "data-row-id",
        "ORD-1044"
      );
      await page.getByRole("searchbox").fill("");
      await page
        .getByRole("button", { name: "Next page", exact: true })
        .press("Enter");
      await expect(
        table.locator("tbody [data-row-id]").first()
      ).not.toHaveAttribute("data-row-id", "ORD-1042");
      await page
        .getByRole("button", { name: "Previous page", exact: true })
        .press("Enter");
      await expect(
        table.locator('tbody [data-row-id="ORD-1042"]').getByRole("checkbox")
      ).toBeChecked();
      await screenshot(page, info, `${kit.path}-keyboard-selection`);
    });

    if (kit.path === "shadcn-vue") {
      for (const theme of ["light", "dark"] as const) {
        test(`${theme}: native Button paint and current page contrast`, async ({
          page,
        }, info) => {
          await page.goto(`${route}?theme=${theme}`);
          const surface = page.locator(".vue-kit-preview__table");
          const sort = surface.locator(part("sort-button"));
          await expect(sort.first()).toBeVisible();
          const headers = await sort.evaluateAll((buttons) =>
            buttons.map((button) => {
              const header = button.closest("th");
              if (!header) throw new Error("Sortable button has no header");
              return {
                background: getComputedStyle(button).backgroundColor,
                foreground: getComputedStyle(button).color,
                headerForeground: getComputedStyle(header).color,
              };
            })
          );
          expect(headers.length).toBeGreaterThan(0);
          for (const header of headers) {
            expect(header.background).toBe("rgba(0, 0, 0, 0)");
            expect(header.foreground).toBe(header.headerForeground);
          }
          const current = surface.locator(
            `${part("page-number")}[aria-current="page"]`
          );
          const expected = await current.evaluate((button) => {
            const probe = document.createElement("span");
            probe.style.backgroundColor = "var(--primary)";
            probe.style.color = "var(--primary-foreground)";
            button.append(probe);
            const style = getComputedStyle(probe);
            const paint = {
              background: style.backgroundColor,
              foreground: style.color,
            };
            probe.remove();
            return paint;
          });
          const expectCurrentPaint = async () => {
            await expect(current).toHaveCSS(
              "background-color",
              expected.background
            );
            await expect(current).toHaveCSS("color", expected.foreground);
            expect(expected.background).not.toBe(expected.foreground);
          };
          await expectCurrentPaint();
          await current.hover();
          await expectCurrentPaint();
          await page
            .getByRole("button", { name: "Next page", exact: true })
            .press("Enter");
          await expect(current).toHaveText("2");
          await expectCurrentPaint();
          await sort.first().focus();
          await expect(sort.first()).toBeFocused();
          await expect(sort.first()).not.toHaveCSS("box-shadow", "none");
          await screenshot(page, info, `shadcn-vue-${theme}-button-paint`);
        });
      }
    }

    for (const scenario of [scenarios[0], scenarios[3], scenarios[4]]) {
      test(`${scenario.name}: visible density choices retain focus and update the table`, async ({
        page,
      }, info) => {
        await page.setViewportSize({
          width: scenario.width,
          height: scenario.height,
        });
        await page.goto(
          `${route}?theme=${scenario.theme}&lang=${scenario.lang}`
        );
        const labels = getLabels(scenario.lang);
        const surface = page.locator(".vue-kit-preview__table");
        const root = surface.locator(part("root"));
        const radio = ["element-plus", "nuxt-ui", "shadcn-vue"].includes(
          kit.path
        );
        const density = surface.getByRole(radio ? "radiogroup" : "group", {
          name: labels.density,
          exact: true,
        });
        const comfortable = density.getByRole(radio ? "radio" : "button", {
          name: labels.densityComfortable,
          exact: true,
        });
        const compact = density.getByRole(radio ? "radio" : "button", {
          name: labels.densityCompact,
          exact: true,
        });
        await expect(density).toHaveAttribute(
          "data-adapttable-part",
          "density-toggle"
        );
        await expect(density).toHaveAttribute(
          "dir",
          scenario.lang === "ar" ? "rtl" : "ltr"
        );
        await expect(density.getByRole(radio ? "radio" : "button")).toHaveCount(
          2
        );
        await expect(density.getByRole("combobox")).toHaveCount(0);
        const originalGroup = await density.elementHandle();
        const originalComfortable = await comfortable.elementHandle();
        const originalCompact = await compact.elementHandle();
        if (!originalGroup || !originalComfortable || !originalCompact)
          throw new Error("Density must mount its group and both choices");
        const expectDensity = async (value: "comfortable" | "compact") => {
          await expect(root).toHaveAttribute("data-density", value);
          if (!scenario.cards) await expectUtilityGeometry(page, kit.path);
          await expect(
            density.getByText(labels.densityComfortable, { exact: true })
          ).toBeVisible();
          await expect(
            density.getByText(labels.densityCompact, { exact: true })
          ).toBeVisible();
          await expect(comfortable).toBeEnabled();
          await expect(compact).toBeEnabled();
          await expectDensityGeometry(density, [
            labels.densityComfortable,
            labels.densityCompact,
          ]);
          if (radio) {
            await expect(comfortable).toBeChecked({
              checked: value === "comfortable",
            });
            await expect(compact).toBeChecked({ checked: value === "compact" });
          } else {
            await expect(comfortable).toHaveAttribute(
              "aria-pressed",
              String(value === "comfortable")
            );
            await expect(compact).toHaveAttribute(
              "aria-pressed",
              String(value === "compact")
            );
          }
          expect(
            await density.evaluate(
              (node, original) => node === original,
              originalGroup
            )
          ).toBe(true);
          expect(
            await comfortable.evaluate(
              (node, original) => node === original,
              originalComfortable
            )
          ).toBe(true);
          expect(
            await compact.evaluate(
              (node, original) => node === original,
              originalCompact
            )
          ).toBe(true);
        };
        await expectDensity("comfortable");
        const { pageSize, originalPageSize } = await paginationControl(
          surface,
          labels.rowsPerPage,
          scenario.cards
        );
        await compact.focus();
        await page.keyboard.press("Space");
        await expectDensity("compact");
        await expect(compact).toBeFocused();
        await page.keyboard.press("Space");
        await expectDensity("compact");
        await expect(compact).toBeFocused();
        await comfortable.focus();
        await page.keyboard.press(radio ? "Space" : "Enter");
        await expectDensity("comfortable");
        await expect(comfortable).toBeFocused();
        await compact.focus();
        await page.keyboard.press("Space");
        await expectDensity("compact");
        await expect(compact).toBeFocused();
        if (originalPageSize)
          expect(
            await pageSize.evaluate(
              (node, original) => node === original,
              originalPageSize
            )
          ).toBe(true);
        if (scenario.cards) {
          const loadMore = surface.getByRole("button", {
            name: labels.loadMore,
            exact: true,
          });
          await expect(loadMore).toBeVisible();
          await expect(loadMore).toBeEnabled();
          await expect(surface.locator(part("card"))).toHaveCount(5);
          await expect(surface.locator(part("table"))).toHaveCount(0);
          expect(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth -
                document.documentElement.clientWidth
            )
          ).toBeLessThanOrEqual(1);
        } else {
          const rows = surface.locator("tbody [data-row-id]");
          await expect(rows).toHaveCount(5);
          await pageSize.focus();
          if (kit.path === "shadcn-vue") {
            await pageSize.selectOption("10");
          } else {
            await pageSize.press("Enter");
            const ten = page.getByRole("option", { name: "10", exact: true });
            await expect(ten).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(ten).toBeHidden();
            await expect(pageSize).toBeFocused();
            await pageSize.press("Enter");
            await ten.click();
          }
          await expect(rows).toHaveCount(10);
          await expectDensity("compact");
          expect(
            await pageSize.evaluate(
              (node, original) => node === original,
              originalPageSize
            )
          ).toBe(true);
        }
        await screenshot(
          page,
          info,
          `${kit.path}-${scenario.name}-density-toggle`
        );
      });
    }
  });
}

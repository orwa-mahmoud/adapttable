import { expect, type Page, test, type TestInfo } from "@playwright/test";

import { VUE_KIT_PAGES } from "../apps/showcase/matrix.mjs";
import { workspaceCopy } from "../apps/showcase/src/vue/workspace/copy";
import { getLabels } from "../packages/shared/i18n/src/index";

const part = (name: string) => `[data-adapttable-part="${name}"]`;
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
        }
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

    for (const scenario of [scenarios[0], scenarios[3]]) {
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
          await expect(
            density.getByText(labels.densityComfortable, { exact: true })
          ).toBeVisible();
          await expect(
            density.getByText(labels.densityCompact, { exact: true })
          ).toBeVisible();
          await expect(comfortable).toBeEnabled();
          await expect(compact).toBeEnabled();
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
        const pageSize = surface.getByRole("combobox", {
          name: labels.rowsPerPage,
          exact: true,
        });
        await expect(pageSize).toBeVisible();
        const originalPageSize = await pageSize.elementHandle();
        if (!originalPageSize)
          throw new Error("Pagination must retain its select");
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
        expect(
          await pageSize.evaluate(
            (node, original) => node === original,
            originalPageSize
          )
        ).toBe(true);
        if (scenario.cards) {
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

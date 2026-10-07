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

    test("density selector keeps keyboard focus and updates the actual table", async ({
      page,
    }, info) => {
      await page.goto(`${route}?theme=light`);
      const density = page.getByRole("combobox", {
        name: "Density",
        exact: true,
      });
      await density.focus();
      if (kit.path === "shadcn-vue") {
        await density.selectOption("compact");
        await expect(density).toBeFocused();
      } else {
        await density.press("Enter");
        await expect(
          page.getByRole("option", { name: "Compact", exact: true })
        ).toBeVisible();
        await screenshot(page, info, `${kit.path}-density-popup`);
        await page.keyboard.press("Escape");
        await expect(
          page.getByRole("option", { name: "Compact", exact: true })
        ).toBeHidden();
        await expect(density).toBeFocused();
        await density.press("Enter");
        await page
          .getByRole("option", { name: "Compact", exact: true })
          .click();
      }
      await expect(
        page.locator(".vue-kit-preview__table").locator(part("root"))
      ).toHaveAttribute("data-density", "compact");
      await screenshot(page, info, `${kit.path}-compact`);
    });
  });
}

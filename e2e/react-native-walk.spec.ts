/** Real matrix menus preserve keyboard workflows and viewport access. */
import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

const surfaces =
  '.mantine-Popover-dropdown, .MuiPopover-paper, [data-scope="popover"][data-part="content"], .ant-popover-container, .ant-popover-inner, .rt-PopoverContent, .adapttable-popup, [data-adapttable-part="views-panel"], [data-adapttable-part="column-menu-panel"]';

for (const kit of builtAdapters("react")) {
  for (const locale of ["en", "ar"] as const) {
    const names =
      locale === "ar"
        ? { views: "طرق العرض المحفوظة", input: "اسم العرض", save: "حفظ العرض" }
        : { views: "Saved views", input: "View name", save: "Save view" };
    for (const width of [390, 1280]) {
      test(`${kit.key}: ${locale} saved views restore search by keyboard at ${width}px`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width, height: 844 });
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          locale === "ar" ? "dark" : "light"
        );
        await page.goto(`/${kit.key}/saved-views/?locale=${locale}&live=off`);
        await page.evaluate(() => document.fonts.ready.then(() => undefined));
        const root = page
          .locator('.mx-demo [data-adapttable-part="root"]')
          .first();
        const search = root.getByRole("searchbox");
        const rows = root.locator(
          `[data-adapttable-part="${width === 390 ? "card" : "row"}"]${width === 390 ? "" : "[data-row-id]"}`
        );
        await search.fill("Priya");
        await expect(rows).toHaveCount(1);
        const trigger = root.getByRole("button", {
          name: names.views,
          exact: true,
        });
        await trigger.evaluate((node) =>
          node.scrollIntoView({ behavior: "instant", block: "center" })
        );
        await trigger.focus();
        await trigger.press("Enter");
        const input = page.getByRole("textbox", {
          name: names.input,
          exact: true,
        });
        await expect(input).toBeVisible();
        expect((await input.boundingBox())!.width).toBeGreaterThanOrEqual(120);
        await input.fill("Evaluator view");
        await page
          .getByRole("button", { name: names.save, exact: true })
          .press("Enter");
        const view = page
          .getByRole("button", { name: "Evaluator view", exact: true })
          .filter({ visible: true })
          .last();
        await expect(view).toBeVisible();
        if (kit.key === "chakra") {
          const surface = page.locator(
            '[data-scope="popover"][data-part="content"]'
          );
          await expect(surface).toHaveCSS("opacity", "1");
          const contrast = await view.evaluate((node) => {
            const luminance = (color: string) => {
              const rgb = color
                .match(/[\d.]+/g)!
                .slice(0, 3)
                .map(Number);
              const linear = rgb.map((channel) => {
                const value = channel / 255;
                return value <= 0.04045
                  ? value / 12.92
                  : ((value + 0.055) / 1.055) ** 2.4;
              });
              return (
                linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722
              );
            };
            let parent: Element | null = node;
            while (
              parent &&
              getComputedStyle(parent).backgroundColor === "rgba(0, 0, 0, 0)"
            )
              parent = parent.parentElement;
            const foreground = luminance(getComputedStyle(node).color);
            const background = luminance(
              getComputedStyle(parent!).backgroundColor
            );
            return (
              (Math.max(foreground, background) + 0.05) /
              (Math.min(foreground, background) + 0.05)
            );
          });
          expect(contrast).toBeGreaterThanOrEqual(4.5);
        }
        const bounds = await input.evaluate((node, selector) => {
          const surface = node.closest(selector);
          if (!surface) throw new Error("Saved views native surface missing");
          const rect = surface.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }, surfaces);
        expect(bounds.left).toBeGreaterThanOrEqual(0);
        expect(bounds.right).toBeLessThanOrEqual(width + 1);
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${locale}-${width}-views.png`),
          animations: "disabled",
        });
        await page.keyboard.press("Escape");
        await expect(input).toBeHidden();
        await search.fill("");
        await expect(rows).not.toHaveCount(1);
        await trigger.press("Enter");
        if (kit.key === "chakra")
          await expect(
            page.locator('[data-scope="popover"][data-part="content"]')
          ).toHaveCSS("opacity", "1");
        await view.focus();
        await expect(view).toBeFocused();
        await view.press("Enter");
        await expect(search).toHaveValue("Priya");
        await expect(rows).toHaveCount(1);
      });
    }
    test(`${kit.key}: ${locale} columns keep native actions reachable`, async ({
      page,
    }, info) => {
      await page.setViewportSize({ width: 1280, height: 844 });
      await page.addInitScript(
        (theme) => localStorage.setItem("adapttable-demo-theme", theme),
        locale === "ar" ? "dark" : "light"
      );
      await page.goto(`/${kit.key}/columns/?locale=${locale}&live=off`);
      await page.evaluate(() => document.fonts.ready.then(() => undefined));
      const trigger = page.locator(
        '[data-adapttable-part="column-menu-button"]'
      );
      await trigger.evaluate((node) =>
        node.scrollIntoView({ behavior: "instant", block: "center" })
      );
      await trigger.focus();
      await trigger.press("Enter");
      const panel = page
        .locator(surfaces)
        .filter({
          has: page.locator('[data-adapttable-part="column-menu-search"]'),
        })
        .last();
      await expect(panel).toBeVisible();
      const controls = panel.locator(
        "button:visible, input:visible, select:visible"
      );
      expect(await controls.count()).toBeGreaterThan(7);
      for (const control of await controls.all()) {
        await control.scrollIntoViewIfNeeded();
        const rect = await control.boundingBox();
        expect(rect).not.toBeNull();
        expect(rect!.x).toBeGreaterThanOrEqual(0);
        expect(rect!.x + rect!.width).toBeLessThanOrEqual(1281);
        expect(rect!.y).toBeGreaterThanOrEqual(0);
        expect(rect!.y + rect!.height).toBeLessThanOrEqual(845);
      }
      await page.screenshot({
        path: info.outputPath(`${kit.key}-${locale}-1280-columns.png`),
        animations: "disabled",
      });
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await trigger.press("Enter");
      await expect(panel).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
    });
  }
}

import { expect, type Locator, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { getLabels } from "../packages/shared/i18n/src/catalog";

async function settleOverlay(surface: Locator): Promise<void> {
  await expect
    .poll(() =>
      surface.evaluate((element) => {
        const running: {
          target: string;
          animation: string;
          time: string;
        }[] = [];
        const name = (animation: Animation): string => {
          if (animation instanceof CSSTransition)
            return animation.transitionProperty;
          if (animation instanceof CSSAnimation) return animation.animationName;
          return "animation";
        };
        for (
          let parent: Element | null = element;
          parent;
          parent = parent.parentElement
        ) {
          const finite = parent
            .getAnimations()
            .filter(
              (animation) =>
                animation.playState === "running" &&
                animation.effect?.getComputedTiming().iterations !== Infinity
            );
          running.push(
            ...finite.map((animation) => ({
              target: parent.tagName + "." + parent.className,
              animation: name(animation),
              time: String(animation.currentTime),
            }))
          );
        }
        return running;
      })
    )
    .toEqual([]);
}

for (const framework of ["react", "angular", "vue"]) {
  for (const kit of builtAdapters(framework)) {
    for (const variant of [
      { width: 1280, height: 720, locale: "en", theme: "light" },
      { width: 390, height: 844, locale: "ar", theme: "dark" },
    ]) {
      test(`${kit.key}: ${variant.width}px ${variant.locale} filters remain in the viewport and restore focus`, async ({
        page,
      }, info) => {
        await page.setViewportSize(variant);
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          variant.theme
        );
        await page.goto(
          `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/filtering/?locale=${variant.locale}`
        );
        await page.evaluate(() => document.fonts.ready);
        // Exercise the reserved scrollbar space used by Linux/Windows,
        // including on macOS where native scrollbars normally overlay content.
        await page.addStyleTag({
          content:
            "html { overflow-y: scroll; scrollbar-gutter: stable; } ::-webkit-scrollbar { width: 15px; height: 15px; }",
        });
        const labels = getLabels(variant.locale);
        const trigger = page
          .getByRole("button", { name: labels.filters, exact: true })
          .first();
        await expect(trigger).toBeVisible();
        await trigger.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 320,
            behavior: "instant",
          })
        );
        await trigger.click();
        const surface = page
          .locator(
            '[data-adapttable-part="filters-popover"], [data-adapttable-part="filters-panel"], [data-spartan-part="filters-popover"], .ant-popover, .adapt-material-filters-popover'
          )
          .or(page.getByRole("dialog", { name: labels.filters, exact: true }))
          .filter({ visible: true })
          .first();
        const done = surface.getByRole("button", {
          name: labels.filtersDone,
          exact: true,
        });
        await expect(surface).toBeVisible();
        await settleOverlay(surface);
        // React popovers dismiss through Escape/outside click. Angular and Vue
        // also render a Done action, which stays visible while fields scroll.
        if (framework !== "react") await expect(done).toBeInViewport();
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${variant.width}-filters-open.png`),
        });
        await expect
          .poll(async () => {
            const panel = await surface.boundingBox();
            const button =
              framework === "react" ? panel : await done.boundingBox();
            return (
              !!panel &&
              !!button &&
              panel.x >= -1 &&
              panel.y >= -1 &&
              panel.x + panel.width <= variant.width + 1 &&
              panel.y + panel.height <= variant.height + 1 &&
              button.y >= panel.y - 1 &&
              button.y + button.height <= panel.y + panel.height + 1
            );
          })
          .toBe(true);
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${variant.width}-filters.png`),
        });
        if (
          variant.width < 600 &&
          (kit.key === "ng-zorro" || kit.key === "spartan")
        ) {
          await page.setViewportSize({ width: 360, height: variant.height });
          await expect
            .poll(async () => {
              const box = await surface.boundingBox();
              return !!box && box.x >= -1 && box.x + box.width <= 361;
            })
            .toBe(true);
        }
        if (framework !== "react") {
          await done.click();
          await expect(surface).toBeHidden();
          await trigger.click();
          await expect(surface).toBeVisible();
        }
        await page.keyboard.press("Escape");
        await expect(surface).toBeHidden();
        await expect(trigger).toBeFocused();
      });
      test(`${kit.key}: ${variant.width < 600 ? "short RTL" : "desktop"} column menu stays inside the viewport`, async ({
        page,
      }, info) => {
        const viewport =
          variant.width < 600 ? { width: 1024, height: 480 } : variant;
        await page.setViewportSize(viewport);
        await page.addInitScript(
          (theme) => localStorage.setItem("adapttable-demo-theme", theme),
          variant.theme
        );
        await page.goto(
          `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/columns/?locale=${variant.locale}`
        );
        const labels = getLabels(variant.locale);
        const trigger = page
          .getByRole("button", { name: labels.columns, exact: true })
          .first();
        await expect(trigger).toBeVisible();
        await trigger.evaluate((element) =>
          window.scrollBy({
            top: element.getBoundingClientRect().top - 320,
            behavior: "instant",
          })
        );
        await trigger.click();
        const menu = page
          .getByRole("dialog", { name: labels.columns, exact: true })
          .or(page.getByRole("group", { name: labels.columns, exact: true }))
          .filter({ visible: true })
          .first();
        await expect(menu).toBeVisible();
        await settleOverlay(menu);
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${variant.width}-columns-open.png`),
        });
        await expect
          .poll(async () => {
            // The native dropdown adds padding and a border outside the
            // semantic fieldset. Check its visible surface, not only the group.
            const box = await menu.evaluate((element) =>
              (element.closest(".dropdown-menu") ?? element)
                .getBoundingClientRect()
                .toJSON()
            );
            return (
              !!box &&
              box.x >= -1 &&
              box.y >= -1 &&
              box.x + box.width <= viewport.width + 1 &&
              box.y + box.height <= viewport.height + 1
            );
          })
          .toBe(true);
        await page.screenshot({
          path: info.outputPath(`${kit.key}-${variant.width}-columns.png`),
        });
        await page.keyboard.press("Escape");
        await expect(menu).toBeHidden();
        await expect(trigger).toBeFocused();
      });
    }
  }
}

test("native selection columns stay compact and Vue's portal retains the table theme", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  for (const route of [
    "/angular-all-options/?kit=unstyled",
    "/vue/unstyled/",
  ]) {
    await page.goto(route);
    const selection = page
      .locator('[data-adapttable-part="selection-header"]')
      .first();
    await expect(selection).toBeVisible();
    const box = await selection.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(64);
    const trigger = page
      .locator('[data-adapttable-part="filters-button"]')
      .first();
    await trigger.click();
    if (route.startsWith("/vue")) {
      await expect(
        page.locator(
          '[data-adapttable-part="root"] [data-adapttable-part="filters-popover"]'
        )
      ).toBeVisible();
    }
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
});

for (const locale of ["en", "ar"] as const) {
  test(`base-ui: ${locale} filter panel shifts inside the viewport at a bottom-edge trigger`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(`/base-ui/filtering/?locale=${locale}`);
    const labels = getLabels(locale);
    const trigger = page
      .getByRole("button", { name: labels.filters, exact: true })
      .first();
    await expect(trigger).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    await trigger.evaluate((element) => {
      const box = element.getBoundingClientRect();
      window.scrollBy({
        top: box.top - (innerHeight - box.height - 12),
        behavior: "instant",
      });
    });
    await trigger.click();
    const panel = page.getByTestId("adapttable-filter-popover");
    await expect(panel).toBeVisible();
    await settleOverlay(panel);
    await expect
      .poll(async () => {
        const box = await panel.boundingBox();
        return (
          !!box &&
          box.x >= -1 &&
          box.y >= -1 &&
          box.x + box.width <= 1281 &&
          box.y + box.height <= 721
        );
      })
      .toBe(true);
    await expect(panel.locator("..")).toHaveAttribute("data-side", "bottom");
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(trigger).toBeFocused();
  });
}

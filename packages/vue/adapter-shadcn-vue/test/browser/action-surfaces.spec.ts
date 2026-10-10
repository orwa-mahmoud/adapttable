import { expect, test } from "@playwright/test";

const fixture =
  process.env.SHADCN_ACTION_FIXTURE_URL ?? "/vue/shadcn-vue/action-surfaces/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

for (const direction of ["ltr", "rtl"] as const) {
  for (const width of [1280, 375]) {
    test(`${direction} ${width}px: assistant Sheet owns focus and nested Escape with a controlled close`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(fixture);
      if (direction === "rtl") await page.locator("#direction-toggle").click();
      const launcher = page.locator(part("assistant-launcher"));
      await launcher.click();
      const sheet = page.locator(part("assistant-sheet"));
      await expect(sheet).toHaveAttribute("data-slot", "sheet-content");
      await expect(sheet).toHaveAttribute("dir", direction);
      const input = page.locator(part("assistant-input"));
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute("data-slot", "textarea");
      if (width === 375)
        expect(
          await sheet
            .locator(part("assistant-close"))
            .evaluate((target) => target.getBoundingClientRect().height)
        ).toBeGreaterThanOrEqual(44);
      await input.fill("Find Ada");
      await input.press("Enter");
      await expect(page.locator("#host-result")).toHaveText("Sent Find Ada");
      const examples = page.locator(part("assistant-examples-menu"));
      await examples.click();
      const menu = page.getByRole("menu");
      await expect(menu).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(menu).toHaveCount(0);
      await expect(examples).toBeFocused();
      await expect(sheet).toBeVisible();
      await expect(page.locator("#close-requests")).toHaveText("0");
      const box = await sheet.boundingBox();
      expect(box?.x).toBeGreaterThanOrEqual(-1);
      expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width + 1);
      if (direction === "rtl")
        await expect(sheet).toContainText("مساعد الجدول");
      await page.keyboard.press("Escape");
      await expect(page.locator("#close-requests")).toHaveText("1");
      await expect(sheet).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(sheet).toHaveCount(0);
      await expect(launcher).toBeFocused();
      await expect(page.locator("#close-requests")).toHaveText("2");
    });

    test(`${direction} ${width}px: context, command and controlled side tabs use native keyboard contracts`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(fixture);
      if (direction === "rtl") await page.locator("#direction-toggle").click();
      const cell = page
        .locator(part(width === 375 ? "card-value" : "cell"))
        .first();
      if (width === 375) await cell.click({ button: "right" });
      else {
        await cell.focus();
        await page.keyboard.press("Shift+F10");
      }
      const menu = page.locator(part("context-menu"));
      await expect(menu).toHaveAttribute("data-slot", "context-menu-content");
      await expect(menu).toHaveAttribute("dir", direction);
      await expect(
        menu.getByRole("menuitem", {
          name: direction === "rtl" ? "غير متاح" : "Unavailable",
        })
      ).toBeDisabled();
      await menu.press("End");
      await page.keyboard.press("Enter");
      await expect(page.locator("#host-result")).toHaveText("Inspect Ada");
      await expect(menu).toHaveCount(0);
      if (width !== 375) await expect(cell).toBeFocused();
      const command = page.locator(part("command-palette-button"));
      await command.click();
      const dialog = page.locator(part("command-palette"));
      await expect(dialog).toHaveAttribute("dir", direction);
      const input = page.locator(part("command-input"));
      await expect(input).toBeFocused();
      await expect(input).toHaveAttribute("data-slot", "input");
      if (width === 375)
        expect(
          await input.evaluate(
            (target) => target.getBoundingClientRect().height
          )
        ).toBeGreaterThanOrEqual(44);
      await input.fill(direction === "rtl" ? "إنشاء تقرير" : "Create report");
      await input.press("Enter");
      await expect(page.locator("#host-result")).toHaveText("Report requested");
      await expect(dialog).toHaveCount(0);
      await expect(command).toBeFocused();
      const tabs = page.locator(part("side-panel-tab"));
      await tabs.first().focus();
      await page.keyboard.press(
        direction === "rtl" ? "ArrowLeft" : "ArrowRight"
      );
      await expect(page.locator("#panel-request")).toHaveText("detail");
      await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
      await page.locator("#allow-panel-change").click();
      await tabs.first().focus();
      await page.keyboard.press(
        direction === "rtl" ? "ArrowLeft" : "ArrowRight"
      );
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(page.getByRole("tabpanel")).toHaveText("Details body");
      await page.keyboard.press("Escape");
      await expect(page.locator(part("side-panel"))).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= window.innerWidth
        )
      ).toBe(true);
    });
  }
}

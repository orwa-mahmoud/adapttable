import { expect, test } from "@playwright/test";

for (const mobile of [false, true])
  for (const dir of ["ltr", "rtl"])
    for (const dark of [false, true])
      test(`density buttons mobile=${mobile} dir=${dir} dark=${dark}`, async ({
        page,
      }, info) => {
        await page.setViewportSize({ width: mobile ? 360 : 1280, height: 800 });
        await page.goto(
          `/test/browser/density.html?mobile=${mobile ? 1 : 0}&dir=${dir}&dark=${dark ? 1 : 0}`
        );
        const group = page.getByRole("group", { name: "Density", exact: true });
        const comfortable = group.getByRole("button", { name: "Comfortable" });
        const compact = group.getByRole("button", {
          name: "Compact",
          exact: true,
        });
        await expect(comfortable).toBeVisible();
        await expect(compact).toBeVisible();
        await expect(group.getByRole("combobox")).toHaveCount(0);
        await expect(comfortable).toHaveAttribute("aria-pressed", "true");
        await comfortable.focus();
        await page.keyboard.press("Tab");
        await expect(compact).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page.locator("#density-requests")).toHaveText("compact");
        await expect(comfortable).toHaveAttribute("aria-pressed", "true");
        await expect(compact).toHaveAttribute("aria-pressed", "false");
        await expect(compact).toBeFocused();
        await page
          .getByRole("switch", { name: "Accept density changes" })
          .click();
        await compact.focus();
        await page.keyboard.press("Space");
        await expect(compact).toHaveAttribute("aria-pressed", "true");
        await expect(compact).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(comfortable).toBeFocused();
        await page.keyboard.press("Space");
        await expect(comfortable).toHaveAttribute("aria-pressed", "true");
        await expect(
          page.locator('[data-adapttable-part="root"]')
        ).toHaveAttribute("data-density", "comfortable");
        const first = await comfortable.boundingBox();
        const second = await compact.boundingBox();
        if (!first || !second)
          throw new Error("Missing visible toggle geometry");
        for (const box of [first, second]) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
          expect(box.x).toBeGreaterThanOrEqual(0);
          expect(box.x + box.width).toBeLessThanOrEqual(mobile ? 360 : 1280);
        }
        expect(dir === "rtl" ? first.x > second.x : first.x < second.x).toBe(
          true
        );
        await expect(
          page.locator('[data-adapttable-part="rows-per-page"]')
        ).toHaveAttribute("role", "combobox");
        await expect(page.locator(mobile ? "article" : "table")).toBeVisible();
        await page.screenshot({
          path: info.outputPath("density.png"),
          fullPage: true,
        });
      });

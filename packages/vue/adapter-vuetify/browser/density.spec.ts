import { expect, test } from "@playwright/test";

for (const mobile of [false, true]) {
  for (const rtl of [false, true]) {
    test(`density uses visible native buttons and controlled keyboard requests; mobile=${mobile} rtl=${rtl}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(
        mobile ? { width: 390, height: 844 } : { width: 1280, height: 900 }
      );
      await page.goto("/density");
      if (rtl)
        await page
          .getByRole("button", { name: "Right to left", exact: true })
          .click();
      const toggle = page.getByRole("group", { name: "Density", exact: true });
      const comfortable = toggle.getByRole("button", {
        name: "Comfortable",
        exact: true,
      });
      const compact = toggle.getByRole("button", {
        name: "Compact",
        exact: true,
      });
      await expect(toggle).toHaveClass(/v-btn-toggle/);
      await expect(toggle).toHaveAttribute("dir", rtl ? "rtl" : "ltr");
      await expect(comfortable).toBeVisible();
      await expect(compact).toBeVisible();
      await expect(toggle.getByRole("button")).toHaveCount(2);
      await expect(toggle.getByRole("combobox")).toHaveCount(0);
      await expect(comfortable).toHaveAttribute("aria-pressed", "true");
      await expect(compact).toHaveAttribute("aria-pressed", "false");
      await page
        .getByRole("button", { name: "Reject density", exact: true })
        .click();
      await comfortable.focus();
      await page.keyboard.press("Tab");
      await expect(compact).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        page.getByLabel("Density requests", { exact: true })
      ).toHaveText("1");
      await expect(comfortable).toHaveAttribute("aria-pressed", "true");
      await expect(compact).toHaveAttribute("aria-pressed", "false");
      await expect(page.getByRole("listbox")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Reject density", exact: true })
        .click();
      await compact.focus();
      await page.keyboard.press("Space");
      await expect(
        page.getByLabel("Density requests", { exact: true })
      ).toHaveText("2");
      await expect(compact).toHaveAttribute("aria-pressed", "true");
      await expect(comfortable).toHaveAttribute("aria-pressed", "false");
      if (!mobile)
        await expect(page.locator(".v-table--density-compact")).toBeVisible();
      await page.keyboard.press("Space");
      await expect(
        page.getByLabel("Density requests", { exact: true })
      ).toHaveText("2");
      await page.keyboard.press("Shift+Tab");
      await expect(comfortable).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(
        page.getByLabel("Density requests", { exact: true })
      ).toHaveText("3");
      await expect(comfortable).toHaveAttribute("aria-pressed", "true");
      await expect(compact).toHaveAttribute("aria-pressed", "false");
      await expect(page.locator(".v-table--density-compact")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Dark theme", exact: true })
        .click();
      await expect(toggle).toHaveClass(/v-theme--dark/);
      await expect(comfortable).toBeVisible();
      await expect(compact).toBeVisible();
      if (mobile)
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth)
        ).toBeLessThanOrEqual(390);
      await page.screenshot({
        path: testInfo.outputPath(
          `density-${mobile ? "mobile" : "desktop"}-${rtl ? "rtl" : "ltr"}-dark.png`
        ),
        fullPage: true,
      });
    });
  }
}

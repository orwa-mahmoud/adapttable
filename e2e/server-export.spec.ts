import { expect, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

const ADAPTERS = builtAdapters().map((adapter) => adapter.key);
const REPRESENTATIVE = ADAPTERS[0]!;

async function openServerExport(
  page: import("@playwright/test").Page,
  adapter: string
) {
  await page.goto(`/${adapter}/export/`);
  const serverJob = page.getByRole("button", { name: "Server job" });
  await expect(serverJob).toBeVisible();
  await serverJob.click();
}

test.describe("server-built export progress", () => {
  for (const adapter of ADAPTERS) {
    test(`${adapter} shows progress and cancels`, async ({ page }) => {
      await openServerExport(page, adapter);

      const exportButton = page
        .locator("button")
        .filter({ hasText: "Export CSV" })
        .first();
      await expect(exportButton).toHaveAccessibleName("Export CSV");
      await exportButton.click();

      const surface = page.locator(
        '[data-adapttable-part="export-progress-surface"]'
      );
      await expect(surface).toBeVisible();
      await expect(surface).toContainText("Building the file on the server");
      await expect(
        surface.locator('[data-adapttable-part="export-progress-bar"]')
      ).toBeVisible();
      await expect(exportButton).toHaveAttribute("aria-busy", "true");

      await surface.getByRole("button", { name: "Cancel" }).click();
      await expect(surface).toHaveAccessibleName("Export cancelled");
      await expect(page.getByRole("status")).toContainText("Export cancelled");
      await expect(exportButton).toHaveAttribute("aria-busy", "false");

      const dismiss = surface.getByRole("button", { name: "Dismiss" });
      await dismiss.focus();
      await expect(dismiss).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(surface).toHaveCount(0);
      await expect(exportButton).toBeFocused();
    });
  }

  test("the progress surface stays inside a mobile viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openServerExport(page, REPRESENTATIVE);
    await page.getByRole("button", { name: "Export CSV", exact: true }).click();

    const surface = page.locator(
      '[data-adapttable-part="export-progress-surface"]'
    );
    await expect(surface).toBeVisible();
    const box = await surface.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    await surface.getByRole("button", { name: "Cancel" }).click();
    await surface.getByRole("button", { name: "Dismiss" }).click();
    await expect(surface).toHaveCount(0);
  });

  test("the progress surface inherits RTL and localized controls", async ({
    page,
  }) => {
    await openServerExport(page, REPRESENTATIVE);
    await page.getByRole("button", { name: "العربية" }).click();
    await page.getByRole("button", { name: "تصدير CSV", exact: true }).click();

    const surface = page.locator(
      '[data-adapttable-part="export-progress-surface"]'
    );
    await expect(surface).toBeVisible();
    await expect(surface).toHaveAccessibleName("جارٍ تجهيز التصدير");
    expect(
      await surface.evaluate((element) => getComputedStyle(element).direction)
    ).toBe("rtl");
    await surface.getByRole("button", { name: "إلغاء" }).click();
    await expect(surface).toHaveAccessibleName("تم إلغاء التصدير");
    await surface.getByRole("button", { name: "إغلاق التصدير" }).click();
    await expect(surface).toHaveCount(0);
  });
});

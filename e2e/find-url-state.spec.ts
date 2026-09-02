import { expect, type Page, test } from "@playwright/test";

/**
 * The find query is shareable table state — type it, reload, and the bar
 * comes back with the same highlights. The live demo is the page that
 * writes the address bar (`urlKey=live`); Mantine is the shell path,
 * antd calls `useFindInTable` itself.
 */

const KITS = ["mantine", "antd"] as const;

const demo = (page: Page) => page.locator("#demo");

async function openLiveDemo(page: Page, kit: string): Promise<void> {
  const kitQuery = kit === "mantine" ? "" : `?kit=${kit}`;
  await page.goto(`/${kitQuery}`);
  await expect(
    demo(page).locator(`[data-adapter="${kit}"] [data-stagger]`).first()
  ).toBeVisible({
    timeout: 30_000,
  });
}

async function openFindBar(page: Page, kit: string): Promise<void> {
  const cell = demo(page)
    .locator(`[data-adapter="${kit}"]`)
    .getByText("Ada Lovelace")
    .first();
  await expect(cell).toBeVisible();
  await cell.click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+f" : "Control+f"
  );
  await expect(
    demo(page).locator('[data-adapttable-part="find-input"]')
  ).toBeVisible();
}

for (const kit of KITS) {
  test.describe(`find URL state (${kit})`, () => {
    test("reopens the bar from a shared find param", async ({ page }) => {
      const kitQuery = kit === "mantine" ? "" : `kit=${kit}&`;
      await page.goto(`/?${kitQuery}live.find=Ada`);
      await expect(
        demo(page).locator(`[data-adapter="${kit}"] [data-stagger]`).first()
      ).toBeVisible({
        timeout: 30_000,
      });
      await expect(
        demo(page).locator('[data-adapttable-part="find-input"]')
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        demo(page).locator('[data-adapttable-part="find-input"]')
      ).toHaveValue("Ada");
      await expect(
        demo(page).locator("[data-cell-match-current]").first()
      ).toBeVisible();
    });

    test("writes find into the URL while typing and survives a reload", async ({
      page,
    }) => {
      await openLiveDemo(page, kit);
      const historyBefore = await page.evaluate(() => history.length);
      await openFindBar(page, kit);
      const input = demo(page).locator('[data-adapttable-part="find-input"]');
      await input.fill("Alan");
      await expect
        .poll(() => new URL(page.url()).searchParams.get("live.find"), {
          timeout: 5_000,
        })
        .toBe("Alan");
      expect(await page.evaluate(() => history.length)).toBe(historyBefore);
      await page.reload();
      await expect(
        demo(page).locator('[data-adapttable-part="find-input"]')
      ).toBeVisible({ timeout: 15_000 });
      await expect(
        demo(page).locator('[data-adapttable-part="find-input"]')
      ).toHaveValue("Alan");
    });
  });
}

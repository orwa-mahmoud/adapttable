import { expect, type Page, test } from "@playwright/test";

/**
 * The star prompt opens only once the visitor has used a live table three
 * times in the tab AND twenty seconds have passed since the first demo page;
 * whichever comes last opens it. The prompt never opens in an automated
 * browser, so each test lifts that guard for its own page and drives the
 * delay with a fake clock.
 */
const DELAY_MS = 20_000;
const TABLE_ROOT = '[data-adapttable-part="root"]';

async function openDemo(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "webdriver", { get: () => false });
  });
  await page.clock.install();
  await page.goto("/");
  await page.locator(TABLE_ROOT).first().waitFor();
}

/** One pointer action inside the live table. */
async function useTable(page: Page): Promise<void> {
  await page
    .locator(TABLE_ROOT)
    .first()
    .locator("input")
    .first()
    .dispatchEvent("pointerdown");
}

const prompt = (page: Page) =>
  page.getByRole("dialog", { name: "Enjoying AdaptTable?" });

test("no prompt after the delay while the table is untouched", async ({
  page,
}) => {
  await openDemo(page);
  await page.clock.runFor(DELAY_MS * 2);
  await expect(prompt(page)).toHaveCount(0);
});

test("the prompt opens on the third table action once the delay has passed", async ({
  page,
}) => {
  await openDemo(page);
  await page.clock.runFor(DELAY_MS + 1000);
  await useTable(page);
  await useTable(page);
  await expect(prompt(page)).toHaveCount(0);
  await useTable(page);
  await expect(prompt(page)).toBeVisible();
});

test("the prompt waits for the delay after three early actions", async ({
  page,
}) => {
  await openDemo(page);
  for (let action = 0; action < 3; action += 1) await useTable(page);
  await expect(prompt(page)).toHaveCount(0);
  await page.clock.runFor(DELAY_MS + 1000);
  await expect(prompt(page)).toBeVisible();
});

test("a closed or dismissed prompt stays away", async ({ page }) => {
  await openDemo(page);
  for (let action = 0; action < 3; action += 1) await useTable(page);
  await page.clock.runFor(DELAY_MS + 1000);
  await prompt(page).getByRole("button", { name: "Close" }).click();
  await expect(prompt(page)).toHaveCount(0);
  await useTable(page);
  await page.reload();
  await page.locator(TABLE_ROOT).first().waitFor();
  await page.clock.runFor(DELAY_MS + 1000);
  await useTable(page);
  await expect(prompt(page)).toHaveCount(0);

  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.locator(TABLE_ROOT).first().waitFor();
  for (let action = 0; action < 3; action += 1) await useTable(page);
  await page.clock.runFor(DELAY_MS + 1000);
  await prompt(page).getByRole("button", { name: "Don't show again" }).click();
  await page.evaluate(() => sessionStorage.clear());
  await page.reload();
  await page.locator(TABLE_ROOT).first().waitFor();
  for (let action = 0; action < 3; action += 1) await useTable(page);
  await page.clock.runFor(DELAY_MS + 1000);
  await expect(prompt(page)).toHaveCount(0);
});

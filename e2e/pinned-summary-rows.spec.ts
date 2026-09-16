import { expect, type Page, test } from "@playwright/test";

async function configureFeatureLab(
  page: Page,
  group: string,
  option: string
): Promise<void> {
  await page.getByRole("button", { name: "Configure options" }).click();
  const dialog = page.getByRole("dialog", { name: "Configure Feature Lab" });
  await expect(dialog).toBeVisible();
  const control = dialog
    .getByRole("group", { name: group })
    .getByRole("button", { name: option, exact: true });
  await control.click();
  // The drawer remounts when the live summary updates; Escape survives that
  // remount where the Close button often detaches mid-click.
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

/**
 * Host-owned summary rows across every kit — they stick outside the row
 * model and stay present on grouped tables.
 */

const ADAPTERS = [
  "mantine",
  "mui",
  "chakra",
  "antd",
  "radix",
  "base-ui",
  "shadcn",
  "tailwind",
] as const;

const demo = (page: Page) => page.locator("#demo");
const part = (page: Page, name: string) =>
  demo(page).locator(`[data-adapttable-part="${name}"]`);

async function openDemo(page: Page, adapter: string): Promise<void> {
  await page.goto("/all-options/");
  await expect(
    demo(page).locator('[data-adapter="mantine"] [data-stagger]').first()
  ).toBeVisible();
  if (adapter === "mantine") return;
  const tab = page.getByTestId(`adapter-${adapter}`);
  await tab.scrollIntoViewIfNeeded();
  await tab.click();
  await expect(
    demo(page).locator(`[data-adapter="${adapter}"] [data-stagger]`).first()
  ).toBeVisible();
}

for (const adapter of ADAPTERS) {
  test.describe(adapter, () => {
    test("sticks host totals above and below the body", async ({ page }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "summary rows", "On");
      await expect(part(page, "pinned-summary-top")).toBeVisible({
        timeout: 15_000,
      });
      await expect(part(page, "pinned-summary-top")).toContainText(
        "Team total"
      );
      await expect(part(page, "pinned-summary-bottom")).toBeVisible();
      await expect(part(page, "pinned-summary-bottom")).toContainText(
        "Grand total"
      );
    });

    test("keeps summary rows when the table is grouped", async ({ page }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "summary rows", "On");
      await configureFeatureLab(page, "row structure", "Grouped");
      await expect(part(page, "pinned-summary-top")).toBeVisible({
        timeout: 15_000,
      });
      await expect(part(page, "group-row").first()).toBeVisible();
    });

    test("keeps summary rows under RTL", async ({ page }) => {
      await openDemo(page, adapter);
      await configureFeatureLab(page, "summary rows", "On");
      await configureFeatureLab(page, "locale", "العربية");
      await expect(demo(page).locator('[dir="rtl"]').first()).toBeVisible();
      await expect(part(page, "pinned-summary-top")).toBeVisible({
        timeout: 15_000,
      });
      await expect(part(page, "pinned-summary-top")).toHaveAttribute(
        "aria-label",
        "صف الملخص"
      );
    });

    test("renders summary cards on a phone viewport", async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 844 });
      await openDemo(page, adapter);
      await configureFeatureLab(page, "summary rows", "On");
      await expect(part(page, "pinned-summary-top")).toBeVisible({
        timeout: 15_000,
      });
      await expect(part(page, "pinned-summary-top")).toContainText(
        "Team total"
      );
    });
  });
}

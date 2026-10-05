import { expect, test } from "@playwright/test";

const route = "/vue/unstyled/table-footers/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;

test("page summaries preserve pinned geometry, mobile labels and custom content", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1120, height: 850 });
  await page.goto(route);
  const root = page.locator('[data-demo-table="table-footers"]');
  const total = root.locator(`${part("summary")} [data-column-key="amount"]`);
  await expect(total).toHaveText("$2,060.00");
  await expect(total).toHaveCSS("position", "sticky");
  await root.locator(part("page-next")).click();
  await expect(total).toHaveText("$2,620.00");
  await root.getByRole("searchbox").fill("North");
  await expect(total).toHaveText("$2,190.00");
  await page.getByLabel("Right-to-left", { exact: true }).check();
  await expect(root).toHaveAttribute("dir", "rtl");
  await expect(total).toHaveCSS("inset-inline-end", "0px");
  await page.getByLabel("Hide region", { exact: true }).check();
  await expect(
    root.locator(`${part("summary")} [data-column-key="region"]`)
  ).toHaveCount(0);
  await page.getByLabel("Mobile cards", { exact: true }).check();
  const card = root.locator(part("summary-card"));
  await expect(card).toHaveAttribute("role", "listitem");
  await expect(card).toContainText("Amount in USD");
  await expect(card).toContainText("$2,190.00");
  await expect(card.locator("input,button")).toHaveCount(0);
  await expect(root.locator(part("table-footer"))).toContainText("Review note");
  await page.getByLabel("Show table", { exact: true }).uncheck();
  await expect(root).toHaveCount(0);
  await page.getByLabel("Show table", { exact: true }).check();
  await expect(root.locator(part("summary-card"))).toContainText("$2,060.00");
  expect(errors).toEqual([]);
});

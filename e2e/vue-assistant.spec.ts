import { expect, test } from "@playwright/test";
const url = process.env.VUE_ASSISTANT_URL ?? "/vue/demo/unstyled/assistant/";
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test.beforeEach(async ({ page }) => {
  await page.goto(url);
});
test("accepts a controlled model and records its outcome", async ({ page }) => {
  await page.locator(part("assistant-input")).fill("Select Ada");
  await page.locator(part("assistant-send")).click();
  await expect(page.getByTestId("selected-ids")).toHaveText("ada");
  await page.locator(part("assistant-receipts-toggle-button")).click();
  await expect(page.locator(part("assistant-receipt"))).toHaveAttribute(
    "data-status",
    "executed"
  );
});
test("rejected controlled state never becomes an executed receipt", async ({
  page,
}) => {
  await page.getByTestId("accept-model").uncheck();
  await page.locator(part("assistant-input")).fill("Select Grace");
  await page.locator(part("assistant-send")).click();
  await expect(page.getByTestId("selected-ids")).toHaveText("none");
  await page.locator(part("assistant-receipts-toggle-button")).click();
  await expect(
    page.locator(`${part("assistant-receipt")}[data-status="executed"]`)
  ).toHaveCount(0);
});
test("each approval has one owner and native modal cancellation settles rejection", async ({
  page,
}) => {
  await page.getByTestId("approval-surface").selectOption("modal");
  await page.locator(part("assistant-input")).fill("Approve Ada");
  await page.locator(part("assistant-send")).click();
  const dialog = page.locator(part("assistant-approval-modal"));
  await expect(dialog).toBeVisible();
  await expect(page.locator(part("agent-approval-approve"))).toHaveCount(1);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await expect(page.getByTestId("selected-ids")).toHaveText("none");
  await page.getByTestId("approval-surface").selectOption("table");
  await page.locator(part("assistant-input")).fill("Approve Grace");
  await page.locator(part("assistant-send")).click();
  await expect(page.locator(part("agent-approval"))).toBeVisible();
  await expect(page.locator(part("agent-approval-approve"))).toHaveCount(1);
  await page.locator(part("agent-approval-reject")).click();
});
test("keyboard preserves newlines and answers the active question", async ({
  page,
}) => {
  const input = page.locator(part("assistant-input"));
  await input.fill("ask");
  await input.press("Shift+Enter");
  await expect(page.locator(part("assistant-question"))).toHaveCount(0);
  await input.fill("ask");
  await input.press("Enter");
  await expect(page.locator(part("assistant-question"))).toBeVisible();
  await page.getByRole("button", { name: "Ada", exact: true }).click();
  await expect(page.locator(part("assistant-question"))).toHaveCount(0);
  await expect(page.locator(part("assistant-message-text")).last()).toHaveText(
    "ada"
  );
});

test("undo restores a real sort", async ({ page }) => {
  await page.locator(part("assistant-input")).fill("Sort names");
  await page.locator(part("assistant-send")).click();
  await expect(page.locator("tbody tr").first()).toContainText("Grace");
  await page.locator(part("assistant-undo-button")).click();
  await expect(page.locator("tbody tr").first()).toContainText("Ada");
});

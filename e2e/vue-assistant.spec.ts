import { expect, test } from "@playwright/test";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";

const assistantPage = SHOWCASE_PAGES.find(
  (page) => page.key === "vue-unstyled-assistant"
);
if (!assistantPage) throw new Error("Vue assistant showcase is not registered");
// The runner serves raw build inputs; site composition assigns public URLs.
const preview = assistantPage.html
  .replace(/^\.\//, "/")
  .replace(/index\.html$/, "");
const url = process.env.VUE_ASSISTANT_URL ?? preview;
const part = (name: string) => `[data-adapttable-part="${name}"]`;
test.beforeEach(async ({ page }) => {
  const response = await page.goto(url);
  expect(response?.ok(), `Assistant showcase navigation failed: ${url}`).toBe(
    true
  );
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
  await expect(page.locator(part("assistant-question-options"))).toHaveCount(0);
  await input.fill("ask");
  await input.press("Enter");
  await expect(page.locator(part("assistant-question-options"))).toBeVisible();
  await page.getByRole("button", { name: "Ada", exact: true }).click();
  await expect(page.locator(part("assistant-question-options"))).toHaveCount(0);
  await expect(page.locator(part("assistant-message-text")).last()).toHaveText(
    "ada"
  );
});

test("undo restores a real sort", async ({ page }) => {
  await page.locator(part("assistant-input")).fill("Sort names");
  await page.locator(part("assistant-send")).click();
  await expect(page.locator("tbody tr").first()).toContainText("Grace");
  await page.locator(part("assistant-receipts-toggle-button")).click();
  await expect(
    page.locator(part("assistant-receipts-undo-all-button"))
  ).toHaveCount(0);
  await page.locator(part("assistant-receipt-undo-button")).click();
  await expect(page.locator("tbody tr").first()).toContainText("Ada");
});

test("native examples support keyboard selection and return focus after Escape", async ({
  page,
}) => {
  const trigger = page.locator(part("assistant-examples-menu"));
  await trigger.focus();
  await trigger.press("ArrowDown");
  await expect(
    page.locator(part("assistant-examples-item")).first()
  ).toBeFocused();
  await page.keyboard.press("End");
  await expect(
    page.locator(part("assistant-examples-item")).last()
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.press("Enter");
  await page.getByRole("button", { name: "Select Ada", exact: true }).click();
  await expect(page.getByTestId("selected-ids")).toHaveText("ada");
});

test("full approval hides the transcript, returns focus and applies only approved rows", async ({
  page,
}) => {
  await page.locator(part("assistant-input")).fill("Approve all");
  await page.locator(part("assistant-send")).click();
  await expect(page.locator(part("agent-approval-row"))).toHaveCount(3);
  await page.locator(part("approval-review-expand")).click();
  await expect(page.locator(part("assistant-approval-full"))).toBeVisible();
  await expect(page.locator(part("assistant-conversation"))).toBeHidden();
  await expect(page.locator(part("approval-review-back"))).toBeFocused();
  await expect(page.locator(part("agent-approval-row"))).toHaveCount(4);
  await page.keyboard.press("Escape");
  await expect(page.locator(part("approval-review-expand"))).toBeFocused();
  await page.locator(part("approval-review-expand")).click();
  await page.locator(part("approval-review-row-reject")).first().click();
  await page.locator(part("agent-approval-approve")).click();
  await expect(page.locator(part("assistant-approval-full"))).toHaveCount(0);
  await expect(page.getByTestId("selected-ids")).toHaveText(
    "grace,alan,barbara"
  );
});

test("receipt heading undoes both actions in a real multi-action turn", async ({
  page,
}) => {
  await page.locator(part("assistant-input")).fill("Sort and search for Alan");
  await page.locator(part("assistant-send")).click();
  await expect(page.locator(part("search"))).toHaveValue("Alan");
  await expect(page.locator('th[data-column-key="name"]')).toHaveAttribute(
    "aria-sort",
    "descending"
  );
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody tr").first()).toContainText("Alan");
  await page.locator(part("assistant-receipts-toggle-button")).click();
  await expect(page.locator(`${part("assistant-receipts")} > li`)).toHaveCount(
    2
  );
  const whole = page.locator(
    `${part("assistant-receipts-heading")} ${part("assistant-receipts-undo-all-button")}`
  );
  await expect(whole).toHaveAccessibleName("Undo all");
  await expect(page.locator(part("assistant-receipt-undo-button"))).toHaveCount(
    2
  );
  await whole.click();
  await expect(page.locator(part("search"))).toHaveValue("");
  await expect(page.locator('th[data-column-key="name"]')).toHaveAttribute(
    "aria-sort",
    "none"
  );
  await expect(page.locator("tbody tr")).toHaveCount(4);
  await expect(page.locator("tbody tr").first()).toContainText("Ada");
});

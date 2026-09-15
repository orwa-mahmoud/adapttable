import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

/**
 * Approval chrome is opt-in (`agentApproval()` + `tableAgent`). Editing
 * pages must not render the strip. The lab at `/agent-approval/` composes
 * both features and walks approve → stage → save → undo, plus reject.
 */
const kits = builtAdapters().map((adapter) => adapter.key);

async function openLab(page: Page, kit: string, extra = ""): Promise<void> {
  await page.goto(`/agent-approval/?kit=${kit}${extra}`);
  await expect(
    page.getByRole("button", { name: "Propose fifth salary" })
  ).toBeVisible();
  await expect(page.getByText("Don", { exact: true }).first()).toBeVisible();
}

async function fifthSalary(page: Page): Promise<string> {
  const row = page.getByRole("row", { name: /Don/ });
  const spin = row.getByRole("spinbutton");
  if ((await spin.count()) > 0) return (await spin.inputValue()).trim();
  const cell = row.getByRole("cell").nth(1);
  return (await cell.innerText()).trim();
}

for (const kit of kits) {
  test(`${kit} editing page has no agent-approval strip`, async ({ page }) => {
    await page.goto(`/${kit}/editing/`);
    await expect(page.getByRole("grid").first()).toBeVisible();
    await expect(
      page.locator('[data-adapttable-part="agent-approval"]')
    ).toHaveCount(0);
  });

  test(`${kit} approve stages, save commits, undo restores`, async ({
    page,
  }) => {
    await openLab(page, kit);
    expect(await fifthSalary(page)).toBe("140");
    await page.getByRole("button", { name: "Propose fifth salary" }).click();
    const strip = page.locator('[data-adapttable-part="agent-approval"]');
    await expect(strip).toBeVisible();
    await expect(
      page.locator('[data-adapttable-part="agent-approval-row"]')
    ).toContainText("salary");
    await page
      .locator('[data-adapttable-part="agent-approval-approve"]')
      .click();
    await expect(strip).toHaveCount(0);
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toBeVisible();
    await page.locator('[data-adapttable-part="batch-edit-save"]').click();
    await expect(
      page.locator('[data-adapttable-part="batch-edit-bar"]')
    ).toHaveCount(0);
    expect(await fifthSalary(page)).toBe("20000");
    const undo = page.locator('[data-adapttable-part="undo-button"]').first();
    await expect(undo).toBeEnabled();
    await undo.click();
    expect(await fifthSalary(page)).toBe("140");
  });

  test(`${kit} reject leaves the fifth salary unchanged`, async ({ page }) => {
    await openLab(page, kit);
    await page.getByRole("button", { name: "Propose fifth salary" }).click();
    await expect(
      page.locator('[data-adapttable-part="agent-approval"]')
    ).toBeVisible();
    await page
      .locator('[data-adapttable-part="agent-approval-reject"]')
      .click();
    await expect(
      page.locator('[data-adapttable-part="agent-approval"]')
    ).toHaveCount(0);
    expect(await fifthSalary(page)).toBe("140");
  });
}

test("Escape rejects and Enter does not confirm", async ({ page }) => {
  await openLab(page, "mui");
  await page.getByRole("button", { name: "Propose fifth salary" }).click();
  const strip = page.locator('[data-adapttable-part="agent-approval"]');
  await expect(strip).toBeVisible();
  await strip.press("Enter");
  await expect(strip).toBeVisible();
  await strip.press("Escape");
  await expect(strip).toHaveCount(0);
  expect(await fifthSalary(page)).toBe("140");
});

test("RTL lab still exposes labeled approve and reject", async ({ page }) => {
  await openLab(page, "mui", "&dir=rtl");
  await expect(page.locator(".mx-demo")).toHaveAttribute("dir", "rtl");
  await page.getByRole("button", { name: "Propose fifth salary" }).click();
  await expect(
    page.locator('[data-adapttable-part="agent-approval"]')
  ).toBeVisible();
  // The summary controls say what they will do, and this lab proposes one
  // change: "all" would claim a set where there is a single salary. The plural
  // wording belongs to a write that enumerates more than one, and "remaining"
  // to one where a row has already been decided.
  await expect(
    page.locator('[data-adapttable-part="agent-approval-approve"]')
  ).toHaveAccessibleName("Approve");
  await expect(
    page.locator('[data-adapttable-part="agent-approval-reject"]')
  ).toHaveAccessibleName("Reject");
});

test.describe("mobile lab", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("approve and reject remain reachable", async ({ page }) => {
    await openLab(page, "mui");
    await page.getByRole("button", { name: "Propose fifth salary" }).click();
    const approve = page.locator(
      '[data-adapttable-part="agent-approval-approve"]'
    );
    const reject = page.locator(
      '[data-adapttable-part="agent-approval-reject"]'
    );
    await expect(approve).toBeVisible();
    await expect(reject).toBeVisible();
    await reject.click();
    await expect(
      page.locator('[data-adapttable-part="agent-approval"]')
    ).toHaveCount(0);
  });
});

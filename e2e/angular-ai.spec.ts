import { expect, type Page, test } from "@playwright/test";

import { ANGULAR_KITS, angularPart } from "./angular-kit";

for (const kit of ANGULAR_KITS) {
  test.describe(kit.key, () => {
    /** Real Angular kit, local deterministic transport, no model-provider keys. */
    const PAGE = `/${kit.key}/ai/`;
    const part = (page: Page, name: string) => angularPart(kit, page, name);
    const tableRows = (page: Page) =>
      page.locator('.ai-demo [data-adapttable-part="row"]');
    const salary = (page: Page) =>
      tableRows(page)
        .filter({ hasText: "Grace Hopper" })
        .locator('[data-adapttable-part="cell"]')
        .nth(1);

    async function open(page: Page, query = "") {
      await page.goto(`${PAGE}${query}`);
      await expect(page.locator(".ai-demo")).toBeVisible();
      await expect(part(page, "assistant-input")).toBeEnabled();
    }

    async function ask(page: Page, text: string) {
      await part(page, "assistant-input").fill(text);
      await part(page, "assistant-input").press("Enter");
    }

    test("a typed request changes the Angular row order and exposes its receipt", async ({
      page,
    }) => {
      await open(page);
      await expect(tableRows(page).first()).toContainText("Ada Lovelace");
      await ask(page, "Sort salaries highest first");
      await expect(tableRows(page).first()).toContainText("Grace Hopper");
      await expect(part(page, "assistant-message-text").last()).toContainText(
        "Highest salary first"
      );
      await part(page, "assistant-receipts-toggle-button").last().click();
      await expect(part(page, "assistant-receipt").last()).toHaveAttribute(
        "data-status",
        "executed"
      );
    });

    test("a structured question filters rows, and the conversation survives closing", async ({
      page,
    }) => {
      await open(page);
      await ask(page, "Choose a person");
      await expect(part(page, "assistant-message-text").last()).toContainText(
        "Which person should I show?"
      );
      await part(page, "assistant-question-option")
        .filter({ hasText: "Katherine Johnson" })
        .click();
      await expect(tableRows(page)).toHaveCount(1);
      await expect(tableRows(page)).toContainText("Katherine Johnson");
      await part(page, "assistant-close").click();
      await expect(part(page, "assistant-surface")).toHaveCount(0);
      await part(page, "assistant-launcher").click();
      await expect(part(page, "assistant-message-text").last()).toContainText(
        "Showing Katherine Johnson"
      );
      await page
        .getByRole("button", { name: "Show everyone", exact: true })
        .click();
      await expect(tableRows(page)).toHaveCount(3);
    });

    test("an approval changes the host's data only after the reader approves", async ({
      page,
    }) => {
      await open(page);
      await expect(salary(page)).toHaveText("140");
      await ask(page, "Propose Grace's salary as 150");
      await expect(part(page, "assistant-approval")).toBeVisible();
      await expect(part(page, "agent-approval-row")).toContainText(
        "Grace Hopper"
      );
      await expect(salary(page)).toHaveText("140");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "No host writes yet"
      );
      await part(page, "agent-approval-approve").click();
      await expect(part(page, "assistant-approval")).toHaveCount(0);
      await expect(salary(page)).toHaveText("150");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "Grace Hopper salary saved: 150"
      );
      await expect(part(page, "assistant-message-text").last()).toContainText(
        "Grace's salary is now 150"
      );
    });

    test("rejecting a proposal leaves the real host data unchanged", async ({
      page,
    }) => {
      await open(page);
      await ask(page, "Propose Grace's salary as 150");
      await expect(part(page, "agent-approval-reject")).toBeVisible();
      await part(page, "agent-approval-reject").click();
      await expect(part(page, "assistant-approval")).toHaveCount(0);
      await expect(salary(page)).toHaveText("140");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "No host writes yet"
      );
      await expect(part(page, "assistant-message-text").last()).toContainText(
        "No change applied"
      );
      await part(page, "assistant-receipts-toggle-button").last().click();
      await expect(part(page, "assistant-receipt").last()).toHaveAttribute(
        "data-status",
        "rejected"
      );
    });

    test("table-owned approval has one decision surface and Escape rejects", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByLabel("Approval surface", { exact: true })
        .selectOption("table");
      await ask(page, "Propose Grace's salary as 150");
      const strip = part(page, "agent-approval");
      await expect(strip).toBeVisible();
      await expect(part(page, "assistant-approval")).toHaveCount(0);
      await expect(part(page, "agent-approval-approve")).toHaveCount(1);
      await strip.press("Escape");
      await expect(strip).toHaveCount(0);
      await expect(salary(page)).toHaveText("140");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "No host writes yet"
      );
    });

    test("modal approval can be dismissed without committing", async ({
      page,
    }) => {
      await open(page);
      await page
        .getByLabel("Approval surface", { exact: true })
        .selectOption("modal");
      await ask(page, "Propose Grace's salary as 150");
      await expect(part(page, "assistant-approval-modal")).toBeVisible();
      await expect(part(page, "agent-approval-approve")).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(part(page, "assistant-approval-modal")).toHaveCount(0);
      await expect(salary(page)).toHaveText("140");
      await expect(page.locator("[data-demo-log]")).toHaveText(
        "No host writes yet"
      );
    });

    test("Stop cancels a waiting turn and the next request still works", async ({
      page,
    }) => {
      await open(page);
      await ask(page, "Wait for cancellation");
      await expect(part(page, "assistant-stop")).toBeVisible();
      await part(page, "assistant-stop").click();
      await expect(part(page, "assistant-send")).toBeVisible();
      await expect(tableRows(page).first()).toContainText("Ada Lovelace");
      await ask(page, "Sort salaries highest first");
      await expect(tableRows(page).first()).toContainText("Grace Hopper");
    });

    test("RTL approval retains labeled kit controls", async ({ page }) => {
      await open(page, "?dir=rtl");
      await expect(page.locator(".ai-demo")).toHaveAttribute("dir", "rtl");
      await expect(part(page, "assistant-surface")).toHaveAttribute(
        "dir",
        "rtl"
      );
      await ask(page, "Propose Grace's salary as 150");
      await expect(part(page, "agent-approval-approve")).toHaveAccessibleName(
        "Approve"
      );
      await expect(part(page, "agent-approval-reject")).toHaveAccessibleName(
        "Reject"
      );
      await part(page, "agent-approval-reject").click();
      await expect(salary(page)).toHaveText("140");
    });

    test.describe("Angular assistant on a phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("questions filter mobile cards and approval controls remain reachable", async ({
        page,
      }) => {
        await open(page);
        await expect(part(page, "card")).toHaveCount(3);
        await ask(page, "Choose a person");
        await part(page, "assistant-question-option")
          .filter({ hasText: "Grace Hopper" })
          .click();
        await expect(part(page, "card")).toHaveCount(1);
        await expect(part(page, "card")).toContainText("Grace Hopper");
        await ask(page, "Propose Grace's salary as 150");
        await expect(part(page, "agent-approval-approve")).toBeVisible();
        await part(page, "agent-approval-approve").click();
        await expect(part(page, "card")).toContainText("150");
        await expect(page.locator("[data-demo-log]")).toHaveText(
          "Grace Hopper salary saved: 150"
        );
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth
          )
        ).toBeLessThanOrEqual(1);
      });
    });
  });
}

/**
 * Each Vue and Angular kit's AI page, beyond what every framework's
 * playground run checks: a receipt and its undo, a question answered in the
 * conversation, each place a waiting change can be reviewed — rejected,
 * then approved — the panel read right to left, and the page on a phone.
 * The host's rows are the evidence throughout, never the reply alone.
 */
import { expect, test } from "@playwright/test";

import { getLabels } from "../packages/shared/i18n/src/catalog";
import {
  AI_KITS,
  ask,
  chooseApprovalLocation,
  lastReply,
  openAiDemo,
  openAssistant,
  part,
  staffRow,
  visibleTableText,
} from "./ai-page";

const RAISE = "Raise Priya Nair's salary to 185.";

for (const kit of AI_KITS.filter((entry) => entry.framework !== "react")) {
  test.describe(`${kit.framework}/${kit.key}`, () => {
    test("a receipt names what ran, and its undo puts the rows back", async ({
      page,
    }) => {
      await openAiDemo(page, kit, "?locale=en");
      await ask(page, "Show only the Core team.");
      await expect
        .poll(async () => visibleTableText(page))
        .not.toContain("Jonah");
      await page
        .locator(part("assistant-receipts-toggle-button"))
        .last()
        .click();
      await expect(
        page.locator(part("assistant-receipt")).last()
      ).toHaveAttribute("data-status", "executed");
      await page.locator(part("assistant-receipt-undo-button")).last().click();
      await expect.poll(async () => visibleTableText(page)).toContain("Jonah");
    });

    test("a question is answered in the conversation and survives closing it", async ({
      page,
    }) => {
      await openAiDemo(page, kit, "?locale=en");
      await ask(page, "Show one person.");
      await expect
        .poll(async () => lastReply(page))
        .toBe("Which person should I show?");
      await page
        .locator(part("assistant-question-option"))
        .filter({ hasText: "Chioma Eze" })
        .click();
      await expect
        .poll(async () => visibleTableText(page))
        .not.toContain("Jonah");
      await expect(staffRow(page, "Chioma Eze")).toHaveCount(1);
      await page.locator(part("assistant-close")).click();
      await expect(page.locator(part("assistant-surface"))).toHaveCount(0);
      await openAssistant(page);
      expect(await lastReply(page)).toBe("Showing the person you chose.");
    });

    test("in the assistant, a rejected change leaves the rows and an approved one lands", async ({
      page,
    }) => {
      await openAiDemo(page, kit, "?locale=en");
      const priya = staffRow(page, "Priya Nair");
      await expect(priya).toContainText("$170k");
      await ask(page, RAISE);
      await expect(page.locator(part("assistant-approval"))).toContainText(
        "185"
      );
      await expect(priya).toContainText("$170k");
      await page.locator(part("agent-approval-reject")).click();
      await expect(page.locator(part("assistant-approval"))).toHaveCount(0);
      await expect(priya).toContainText("$170k");
      await page
        .locator(part("assistant-receipts-toggle-button"))
        .last()
        .click();
      await expect(
        page.locator(part("assistant-receipt")).last()
      ).toHaveAttribute("data-status", "rejected");
      await ask(page, RAISE);
      await page.locator(part("agent-approval-approve")).click();
      await expect(page.locator(part("assistant-approval"))).toHaveCount(0);
      await expect(priya).toContainText("$185k");
    });

    test("above the table, one decision surface, and Escape rejects", async ({
      page,
    }) => {
      await page.goto(`${kit.route}?locale=en`);
      await chooseApprovalLocation(page, "table");
      await openAssistant(page);
      const priya = staffRow(page, "Priya Nair");
      await ask(page, RAISE);
      const strip = page.locator(part("agent-approval"));
      await expect(strip).toBeVisible();
      await expect(page.locator(part("assistant-approval"))).toHaveCount(0);
      await expect(page.locator(part("agent-approval-approve"))).toHaveCount(1);
      await strip.press("Escape");
      await expect(strip).toHaveCount(0);
      await expect(priya).toContainText("$170k");
      await ask(page, RAISE);
      await page.locator(part("agent-approval-approve")).click();
      await expect(priya).toContainText("$185k");
    });

    test("in a dialog, dismissing commits nothing", async ({ page }) => {
      await page.goto(`${kit.route}?locale=en`);
      await chooseApprovalLocation(page, "modal");
      await openAssistant(page);
      const priya = staffRow(page, "Priya Nair");
      await ask(page, RAISE);
      await expect(
        page.locator(part("assistant-approval-modal"))
      ).toBeVisible();
      await expect(page.locator(part("agent-approval-approve"))).toHaveCount(1);
      await page.keyboard.press("Escape");
      await expect(page.locator(part("assistant-approval-modal"))).toHaveCount(
        0
      );
      await expect(priya).toContainText("$170k");
      await ask(page, RAISE);
      await page.locator(part("agent-approval-approve")).click();
      await expect(priya).toContainText("$185k");
    });

    test("right to left, the panel mirrors and its decisions keep their names", async ({
      page,
    }) => {
      const labels = getLabels("ar");
      await openAiDemo(page, kit, "?dir=rtl");
      await expect(page.locator(".ai-demo__stage")).toHaveAttribute(
        "dir",
        "rtl"
      );
      await expect(page.locator(".ai-demo")).not.toHaveAttribute("dir", "rtl");
      await expect(page.locator(part("assistant-surface"))).toHaveCSS(
        "direction",
        "rtl"
      );
      await ask(page, RAISE);
      await expect(
        page.locator(part("agent-approval-approve"))
      ).toHaveAccessibleName(labels.approveProposal);
      await expect(
        page.locator(part("agent-approval-reject"))
      ).toHaveAccessibleName(labels.rejectProposal);
      await page.locator(part("agent-approval-reject")).click();
      await expect(staffRow(page, "Priya Nair")).toContainText("$170k");
    });

    test.describe("on a phone", () => {
      test.use({ viewport: { width: 390, height: 844 } });

      test("the sheet fits, approvals stay reachable, and questions filter cards", async ({
        page,
      }) => {
        await openAiDemo(page, kit, "?locale=en");
        await expect
          .poll(
            async () =>
              (await page.locator(part("assistant-surface")).boundingBox())!
                .height
          )
          .toBeGreaterThanOrEqual(590);
        const composer = await page
          .locator(part("assistant-input"))
          .boundingBox();
        expect(composer!.width).toBeGreaterThanOrEqual(120);
        expect(composer!.y).toBeGreaterThanOrEqual(0);
        expect(composer!.y + composer!.height).toBeLessThanOrEqual(844);
        const cards = page.locator(`.ai-demo ${part("card")}`);
        await expect(cards).toHaveCount(5);
        await ask(page, RAISE);
        await expect(
          page.locator(part("agent-approval-approve"))
        ).toBeVisible();
        await page.locator(part("agent-approval-approve")).click();
        await expect(staffRow(page, "Priya Nair")).toContainText("$185k");
        await ask(page, "Show one person.");
        await page
          .locator(part("assistant-question-option"))
          .filter({ hasText: "Chioma Eze" })
          .click();
        await expect(cards).toHaveCount(1);
        await expect(cards).toContainText("Chioma Eze");
        expect(
          await page.evaluate(
            () => document.documentElement.scrollWidth - window.innerWidth
          )
        ).toBeLessThanOrEqual(1);
      });
    });
  });
}

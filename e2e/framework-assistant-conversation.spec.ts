import { expect, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { angularPart } from "./angular-kit";

const selector = (name: string) => `[data-adapttable-part="${name}"]`;
for (const framework of ["angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const width of [1440, 390]) {
      test(`${framework}/${kit.key}: ${width}px repeated conversation, details, question and approval remain readable`, async ({
        page,
      }) => {
        await page.setViewportSize({ width, height: 1000 });
        const route =
          framework === "vue" ? `/vue/${pathOf(kit)}/ai/` : `/${kit.key}/ai/`;
        await page.goto(`${route}?theme=light&locale=en`, {
          waitUntil: "domcontentloaded",
        });
        const part = (name: string) =>
          framework === "angular"
            ? angularPart(kit, page, name)
            : page.locator(selector(name));
        await part("assistant-launcher").click();
        const ask = async (text: string) => {
          await part("assistant-input").fill(text);
          await part("assistant-input").press("Enter");
        };
        const readable = async () => {
          const messages = page.locator(selector("assistant-message-text"));
          for (const message of await messages.all()) {
            const bounds = await message.boundingBox();
            expect(bounds?.width).toBeGreaterThan(90);
          }
          const pane = page.locator(selector("assistant-surface"));
          // Native kit sheets animate on reopening; check their settled edge.
          await expect
            .poll(async () => {
              const bounds = await pane.boundingBox();
              return bounds ? bounds.x + bounds.width : Infinity;
            })
            .toBeLessThanOrEqual(width + 1);
          const rect = await pane.boundingBox();
          expect(rect).not.toBeNull();
          expect(rect!.x).toBeGreaterThanOrEqual(0);
          expect(rect!.x + rect!.width).toBeLessThanOrEqual(width + 1);
          expect(
            await pane.evaluate((e) => e.scrollWidth - e.clientWidth)
          ).toBeLessThanOrEqual(1);
        };
        await ask("Sort by salary, highest first.");
        await expect(part("assistant-message-text").last()).toContainText(
          "Sorted by salary"
        );
        await part("assistant-receipts-toggle-button").last().click();
        await expect(part("assistant-receipt").last()).toHaveAttribute(
          "data-status",
          "executed"
        );
        await readable();
        await part("assistant-receipt-undo-button").last().click();
        await ask("Raise Priya Nair's salary to 185.");
        await part("agent-approval-reject").click();
        await expect(part("assistant-approval")).toHaveCount(0);
        await ask("Raise Priya Nair's salary to 185.");
        await part("agent-approval-approve").click();
        await expect(
          page
            .locator(
              `.ai-demo ${selector("row")}, .ai-demo ${selector("card")}`
            )
            .filter({ hasText: "Priya Nair" })
        ).toContainText("$185k");
        await readable();
        await ask("Show one person.");
        await part("assistant-question-option")
          .filter({ hasText: "Chioma Eze" })
          .click();
        await expect(part("assistant-message-text").last()).toContainText(
          "Showing the person you chose."
        );
        await readable();
        await part("assistant-close").click();
        await part("assistant-launcher").click();
        await readable();
      });
    }
  }
}

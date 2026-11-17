import { expect, type Page, test } from "@playwright/test";

import { builtAdapters, pathOf } from "../apps/showcase/matrix.mjs";
import { angularPart } from "./angular-kit";
import { expectNoBlockingAxe } from "./axe";

async function settledContrast(page: Page): Promise<void> {
  // Let the new status styles reach layout before inspecting transitions.
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
  await expect
    .poll(() =>
      page
        .locator('[data-adapttable-part="assistant-surface"]')
        .evaluate(
          (element) =>
            element
              .getAnimations({ subtree: true })
              .filter(
                (animation) =>
                  animation instanceof CSSTransition &&
                  animation.playState === "running"
              ).length
        )
    )
    .toBe(0);
  await expectNoBlockingAxe(
    page,
    '[data-adapttable-part="assistant-surface"]',
    { colorContrast: true }
  );
}

for (const framework of ["react", "angular", "vue"] as const) {
  for (const kit of builtAdapters(framework)) {
    for (const theme of ["light", "dark"]) {
      test(`${framework}/${kit.key}: ${theme} assistant receipts and controls remain readable`, async ({
        page,
      }) => {
        const route = `${framework === "vue" ? "/vue" : ""}/${pathOf(kit)}/ai/`;
        await page.goto(`${route}?locale=en&theme=${theme}`);
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const part = (name: string) =>
          framework === "angular"
            ? angularPart(kit, page, name)
            : page.locator(`[data-adapttable-part="${name}"]`);
        await part("assistant-launcher").click();
        await part("assistant-input").fill("Sort by salary, highest first.");
        await part("assistant-input").press("Enter");
        await part("assistant-receipts-toggle-button").last().click();
        await expect(part("assistant-receipt").last()).toBeVisible();
        await settledContrast(page);
        await part("assistant-input").fill("Raise Priya Nair's salary to 185.");
        await part("assistant-input").press("Enter");
        await expect(part("agent-approval-approve")).toBeVisible();

        await settledContrast(page);
        await part("agent-approval-reject").click();
        await expect(part("assistant-approval")).toHaveCount(0);
        await part("assistant-receipts-toggle-button").last().click();
        await expect(part("assistant-receipt").last()).toBeVisible();
        await settledContrast(page);
      });
    }
  }
}

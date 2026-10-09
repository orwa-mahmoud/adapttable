import { expect, type Locator, type Page, test } from "@playwright/test";

import { getLabels } from "../packages/shared/i18n/src/index";
import { ANGULAR_KITS, angularPart } from "./angular-kit";

const positionedKits = ANGULAR_KITS.filter((kit) =>
  ["unstyled", "aria", "angular-cdk", "taiga-ui"].includes(kit.key)
);

async function alignTriggerAtEdge(
  page: Page,
  trigger: Locator,
  bottom: number
) {
  await expect(trigger).toBeVisible();
  await page.mouse.move(900, 200);
  // Place the test's anchor from one layout read rather than relying on
  // an asynchronous wheel gesture to land on an exact pixel. The checks
  // below still exercise native pointer opening and wheel scrolling.
  await trigger.evaluate((element, edge) => {
    window.scrollBy({
      top: element.getBoundingClientRect().bottom - edge,
      behavior: "instant",
    });
  }, bottom);
  await expect
    .poll(async () => {
      const box = (await trigger.boundingBox())!;
      return Math.abs(box.y + box.height - bottom);
    })
    .toBeLessThanOrEqual(2);
}

async function pointerOpenAtEdge(page: Page, trigger: Locator, bottom: number) {
  await alignTriggerAtEdge(page, trigger, bottom);
  const box = (await trigger.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

async function expectInsideViewport(page: Page, panel: Locator) {
  await expect(panel).toBeVisible();
  await expect
    .poll(async () => {
      const box = (await panel.boundingBox())!;
      const size = page.viewportSize()!;
      return (
        box.x >= 7 &&
        box.y >= 7 &&
        box.x + box.width <= size.width - 7 &&
        box.y + box.height <= size.height - 7
      );
    })
    .toBe(true);
}

for (const kit of positionedKits) {
  for (const locale of ["en", "ar"] as const) {
    test(`${kit.key}: ${locale} saved views flip above the lower edge and remain reachable`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1000, height: 600 });
      await page.goto(`/${kit.key}/?locale=${locale}`);
      const labels = getLabels(locale);
      const root = page.locator(
        '.mx-demo--overview [data-adapttable-part="root"]'
      );
      const trigger = root.getByRole("button", {
        name: labels.savedViews,
        exact: true,
      });
      await pointerOpenAtEdge(page, trigger, 568);
      const panel = angularPart(kit, page, "views-panel");
      await expectInsideViewport(page, panel);
      expect((await panel.boundingBox())!.y).toBeLessThan(
        (await trigger.boundingBox())!.y
      );
      await angularPart(kit, page, "views-input").fill("Edge view");
      await angularPart(kit, page, "views-save").click();
      await expect(
        page.getByRole("button", { name: "Edge view", exact: true })
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(panel).toBeHidden();
      await expect(trigger).toBeFocused();
      await pointerOpenAtEdge(page, trigger, 568);
      await expectInsideViewport(page, panel);
      // Keep the anchor visible in the new window before resizing. Native
      // anchored overlays can dismiss when their trigger leaves the viewport.
      await alignTriggerAtEdge(page, trigger, 300);
      await expectInsideViewport(page, panel);
      await page.setViewportSize({ width: 800, height: 420 });
      expect((await trigger.boundingBox())!.y).toBeGreaterThanOrEqual(0);
      expect(
        (await trigger.boundingBox())!.y + (await trigger.boundingBox())!.height
      ).toBeLessThanOrEqual(420);
      await expectInsideViewport(page, panel);
      await page.mouse.move(700, 200);
      await page.mouse.wheel(0, 180);
      await expectInsideViewport(page, panel);
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
    });
  }

  test(`${kit.key}: a tall column menu fits a short viewport and both horizontal edges`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 800, height: 320 });
    await page.goto(`/${kit.key}/`);
    const trigger = angularPart(kit, page, "column-menu-button");
    await alignTriggerAtEdge(page, trigger, 280);
    const box = (await trigger.boundingBox())!;
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const panel = angularPart(kit, page, "column-menu-panel");
    await expectInsideViewport(page, panel);
    expect(
      await panel.evaluate((element) => getComputedStyle(element).overflowY)
    ).toBe("auto");
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  });
}

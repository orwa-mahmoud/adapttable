/** Searchless toolbars must not strand native filter cards outside the viewport. */
import { expect, type Locator, test } from "@playwright/test";

import { angularPart } from "./angular-kit";

const viewports = [
  { width: 390, height: 844 },
  { width: 1180, height: 757 },
  { width: 1440, height: 856 },
];

async function expectHorizontalFit(surface: Locator, width: number) {
  await expect
    .poll(async () => {
      const box = await surface.boundingBox();
      return box !== null && box.x >= 7 && box.x + box.width <= width - 7;
    })
    .toBe(true);
}

async function expectReachableFields(panel: Locator, width: number) {
  const fields = panel.locator('[data-adapttable-part="filter-field"]');
  await expect(fields).toHaveCount(7);
  const controls = fields.locator(
    'input:not([type="hidden"]), select, [role="combobox"]'
  );
  expect(await controls.count()).toBeGreaterThanOrEqual(7);
  for (const control of await controls.all()) {
    await control.scrollIntoViewIfNeeded();
    await control.click({ trial: true });
    await expectHorizontalFit(control, width);
  }
  const done = panel.locator("footer button").last();
  await expect(done).toBeInViewport({ ratio: 1 });
  await done.click({ trial: true });
  return done;
}

for (const key of ["angular-cdk", "material", "aria"]) {
  for (const locale of ["en", "ar"]) {
    for (const search of ["on", "off"]) {
      for (const viewport of viewports) {
        test(`${key} ${locale} search=${search} ${viewport.width}: filter card stays reachable at either toolbar edge`, async ({
          page,
        }, testInfo) => {
          await page.setViewportSize(viewport);
          await page.goto(
            `/angular-main/?kit=${key}&locale=${locale}&search=${search}`
          );
          const kit = { key };
          const trigger = angularPart(kit, page, "filters-button");
          const panel = angularPart(kit, page, "filters-popover");
          const surface =
            key === "material"
              ? page.locator(".cdk-overlay-pane mat-card")
              : panel;
          const searchable = page.getByRole("searchbox");
          if (search === "off") await expect(searchable).toHaveCount(0);
          else await expect(searchable).toBeVisible();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");
          await trigger.evaluate((button) =>
            button.scrollIntoView({ block: "center" })
          );
          await trigger.click();
          await expect(panel).toBeVisible();
          await expect(panel).toHaveAttribute(
            "data-dir",
            locale === "ar" ? "rtl" : "ltr"
          );
          await expect(trigger).toHaveAttribute("aria-expanded", "true");
          await expect(page.locator(".cdk-overlay-backdrop")).toHaveCount(0);
          await expectHorizontalFit(surface, viewport.width);
          await expect
            .poll(async () => {
              const anchor = (await trigger.boundingBox())!;
              const card = (await surface.boundingBox())!;
              return card.y - anchor.y - anchor.height;
            })
            .toBeGreaterThanOrEqual(0);

          const done = await expectReachableFields(panel, viewport.width);
          await testInfo.attach("Filter popover at the toolbar edge", {
            body: await page.screenshot(),
            contentType: "image/png",
          });
          await done.click();
          await expect(panel).toBeHidden();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");

          await trigger.click();
          await expect(panel).toBeVisible();
          await panel.getByRole("textbox").first().focus();
          await page.keyboard.press("Escape");
          await expect(panel).toBeHidden();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");
          await expect(trigger).toBeFocused();

          await trigger.click();
          await expect(panel).toBeVisible();
          await page.getByRole("heading", { level: 1 }).click();
          await expect(panel).toBeHidden();
          await expect(trigger).toHaveAttribute("aria-expanded", "false");

          if (viewport.width === 390) {
            // Consumer toolbars can center the trigger, where neither edge
            // alignment can contain a full-width card on a narrow screen.
            await angularPart(kit, page, "filters-anchor").evaluate(
              (anchor) => {
                anchor.style.cssText =
                  "position: fixed; left: 50%; top: 120px; transform: translateX(-50%); display: inline-flex";
              }
            );
            await trigger.click();
            await expect(panel).toBeVisible();
            await expectHorizontalFit(surface, viewport.width);
            const anchor = (await trigger.boundingBox())!;
            const card = (await surface.boundingBox())!;
            expect(card.y).toBeGreaterThanOrEqual(anchor.y + anchor.height);
            const centeredDone = await expectReachableFields(
              panel,
              viewport.width
            );
            await testInfo.attach(
              "Filter popover at a centered narrow trigger",
              {
                body: await page.screenshot(),
                contentType: "image/png",
              }
            );
            await centeredDone.click();
            await expect(panel).toBeHidden();
          }
        });
      }
    }
  }
}

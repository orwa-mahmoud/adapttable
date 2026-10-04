/** Searchless toolbars must not strand native filter cards outside the viewport. */
import { writeFile } from "node:fs/promises";

import { expect, type Locator, test, type TestInfo } from "@playwright/test";

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

/** Read both sides of a screenshot to distinguish scroll settling from clipping. */
async function captureMaterialLayout(
  panel: Locator,
  testInfo: TestInfo,
  phase: string
): Promise<void> {
  const measure = () =>
    panel.evaluate((inner) => {
      const identify = (element: Element | null) =>
        element
          ? {
              tag: element.tagName,
              id: element.id,
              className: element.getAttribute("class"),
              part: element.getAttribute("data-adapttable-part"),
            }
          : null;
      const describe = (element: Element | null) => {
        if (!(element instanceof HTMLElement)) return null;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        const hit = document.elementFromPoint(x, y);
        return {
          element: identify(element),
          rect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height,
            top: rect.top,
            right: rect.right,
            bottom: rect.bottom,
            left: rect.left,
          },
          scrollTop: element.scrollTop,
          scrollLeft: element.scrollLeft,
          scrollHeight: element.scrollHeight,
          scrollWidth: element.scrollWidth,
          clientHeight: element.clientHeight,
          clientWidth: element.clientWidth,
          style: {
            display: style.display,
            position: style.position,
            boxSizing: style.boxSizing,
            overflowX: style.overflowX,
            overflowY: style.overflowY,
            minHeight: style.minHeight,
            maxHeight: style.maxHeight,
            paddingTop: style.paddingTop,
            paddingBottom: style.paddingBottom,
            flex: style.flex,
            transform: style.transform,
          },
          centerHit: identify(hit),
          centerIsUnobscured: hit !== null && element.contains(hit),
        };
      };
      const body = inner.querySelector(".adapt-material-filters-body");
      const pane = inner.closest(".cdk-overlay-pane");
      const anchor = document.querySelector(".adapt-material-filters-anchor");
      const ancestors = [];
      for (let current = body; current; current = current.parentElement) {
        ancestors.push(describe(current));
      }
      return {
        capturedAt: performance.now(),
        viewport: {
          innerWidth: window.innerWidth,
          innerHeight: window.innerHeight,
          clientWidth: document.documentElement.clientWidth,
          clientHeight: document.documentElement.clientHeight,
          scrollX: window.scrollX,
          scrollY: window.scrollY,
        },
        trigger: describe(anchor?.querySelector("button") ?? null),
        anchor: describe(anchor),
        boundingBox: describe(pane?.parentElement ?? null),
        pane: describe(pane),
        card: describe(inner.closest("mat-card")),
        panel: describe(inner),
        header: describe(inner.querySelector("header")),
        title: describe(inner.querySelector("header h3")),
        clear: describe(inner.querySelector("header button")),
        body: describe(body),
        done: describe(inner.querySelector("footer button")),
        ancestors,
      };
    });
  const beforeScreenshot = await measure();
  const suffix = phase.replaceAll(" ", "-");
  const screenshotPath = testInfo.outputPath(
    `material-filter-layout-${suffix}.png`
  );
  await panel.page().screenshot({ path: screenshotPath });
  await testInfo.attach(`Material layout: ${phase}`, {
    path: screenshotPath,
    contentType: "image/png",
  });
  const afterScreenshot = await measure();
  const geometryPath = testInfo.outputPath(
    `material-filter-geometry-${suffix}.json`
  );
  await writeFile(
    geometryPath,
    JSON.stringify({ phase, beforeScreenshot, afterScreenshot }, null, 2)
  );
  await testInfo.attach(`Material geometry and scroll offsets: ${phase}`, {
    path: geometryPath,
    contentType: "application/json",
  });
  const summarize = (snapshot: typeof beforeScreenshot) =>
    Object.fromEntries(
      (["pane", "card", "panel", "header", "body", "done"] as const).map(
        (key) => {
          const element = snapshot[key];
          return [
            key,
            element && {
              top: element.rect.top,
              height: element.rect.height,
              scrollTop: element.scrollTop,
              scrollHeight: element.scrollHeight,
              clientHeight: element.clientHeight,
            },
          ];
        }
      )
    );
  console.log(
    "Material filter layout:",
    JSON.stringify({
      test: testInfo.title,
      phase,
      before: summarize(beforeScreenshot),
      after: summarize(afterScreenshot),
    })
  );
}

/** Run after the original scenario, so restoration cannot mask its assertions. */
async function diagnoseMaterialHeader(
  trigger: Locator,
  panel: Locator,
  width: number,
  testInfo: TestInfo
): Promise<void> {
  await trigger.evaluate((button) =>
    button.scrollIntoView({ block: "center" })
  );
  await trigger.click();
  await expect(panel).toBeVisible();
  await captureMaterialLayout(panel, testInfo, "replay before traversal");
  const done = await expectReachableFields(panel, width);
  await captureMaterialLayout(panel, testInfo, "replay after traversal");
  const header = panel.locator("header");
  // Preserve restoration evidence even when this exposes the suspected defect.
  await expect
    .soft(header, "Material filter header stays visible after full traversal")
    .toBeInViewport({ ratio: 1 });
  await captureMaterialLayout(panel, testInfo, "after header visibility check");
  await header.scrollIntoViewIfNeeded();
  await captureMaterialLayout(panel, testInfo, "after header restoration");
  await expect(header).toBeInViewport({ ratio: 1 });
  await expect(header.getByRole("heading")).toBeInViewport({ ratio: 1 });
  await expect(header.getByRole("button")).toBeInViewport({ ratio: 1 });
  await header.getByRole("heading").click({ trial: true });
  await expect(done).toBeInViewport({ ratio: 1 });
  await done.click();
  await expect(panel).toBeHidden();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
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

          const diagnoseHeader = key === "material" && viewport.width === 1180;
          if (diagnoseHeader)
            await captureMaterialLayout(
              panel,
              testInfo,
              "before original traversal"
            );
          const done = await expectReachableFields(panel, viewport.width);
          if (diagnoseHeader)
            await captureMaterialLayout(
              panel,
              testInfo,
              "after original traversal"
            );
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
          if (diagnoseHeader)
            await diagnoseMaterialHeader(
              trigger,
              panel,
              viewport.width,
              testInfo
            );
        });
      }
    }
  }
}

/** Mount stagger on every Vue and Angular kit. */
import { expect, type Page, test } from "@playwright/test";

import { builtAdapters } from "../apps/showcase/matrix.mjs";

async function arm(page: Page, reduced: boolean): Promise<void> {
  await page.emulateMedia({
    reducedMotion: reduced ? "reduce" : "no-preference",
  });
  await page.addInitScript(() => {
    const delays: number[] = [];
    const original = Element.prototype.animate;
    Element.prototype.animate = function (
      keyframes: Keyframe[] | PropertyIndexedKeyframes | null,
      options?: number | KeyframeAnimationOptions
    ) {
      const frames = Array.isArray(keyframes) ? keyframes : [];
      const first = frames[0] as { transform?: string } | undefined;
      if (first?.transform === "translateY(8px)") {
        const delay =
          typeof options === "object" && options
            ? Number(options.delay ?? 0)
            : 0;
        delays.push(delay);
      }
      return original.call(this, keyframes, options);
    };
    (window as unknown as { __staggerDelays: number[] }).__staggerDelays =
      delays;
  });
}

async function openTable(
  page: Page,
  framework: "vue" | "angular",
  kit: string,
  query: Record<string, string>
): Promise<void> {
  const search = new URLSearchParams({
    kit,
    editing: "off",
    ...query,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  const path = framework === "vue" ? "/vue-main/" : "/angular-main/";
  await page.goto(`${path}?${search.toString()}`);
  await expect(page.locator('[data-adapttable-part="root"]')).toBeVisible();
}

async function delays(page: Page): Promise<number[]> {
  return page.evaluate(
    () => (window as unknown as { __staggerDelays: number[] }).__staggerDelays
  );
}

/** The entrance of the layout that stayed on screen. A phone may also have
 * animated the desktop rows in the frame before the card layout took over. */
function lastEntrance(recorded: readonly number[], count: number): number[] {
  return recorded.slice(-count);
}

for (const framework of ["vue", "angular"] as const) {
  for (const kit of builtAdapters(framework)) {
    test(`${kit.key}: rows stagger when animate is on`, async ({ page }) => {
      await arm(page, false);
      await openTable(page, framework, kit.key, { animate: "on" });
      const marked = page.locator(
        '[data-adapttable-part="root"] [data-stagger]'
      );
      const rows = page.locator(
        '[data-adapttable-part="root"] [data-adapttable-part="row"]'
      );
      await expect(rows.first()).toBeVisible();
      await expect(
        page.locator(
          '[data-adapttable-part="root"] [data-adapttable-part="row"][data-stagger]'
        )
      ).toHaveCount(await rows.count());
      const count = await marked.count();
      const expected = Array.from({ length: count }, (_, index) => index * 40);
      const recorded = await delays(page);
      expect(recorded.length % count).toBe(0);
      expect(lastEntrance(recorded, count)).toEqual(expected);
    });

    test(`${kit.key}: rows stay put when reduced motion is on`, async ({
      page,
    }) => {
      await arm(page, true);
      await openTable(page, framework, kit.key, { animate: "on" });
      const marked = page.locator(
        '[data-adapttable-part="root"] [data-stagger]'
      );
      await expect(marked.first()).toBeVisible();
      expect(await delays(page)).toEqual([]);
    });

    test(`${kit.key}: cards stagger when animate is on`, async ({ page }) => {
      await arm(page, false);
      await openTable(page, framework, kit.key, {
        animate: "on",
        mobile: "on",
      });
      const cards = page.locator(
        '[data-adapttable-part="root"] [data-adapttable-part="card"]'
      );
      await expect(cards.first()).toBeVisible();
      await expect(
        page.locator(
          '[data-adapttable-part="root"] [data-adapttable-part="card"][data-stagger]'
        )
      ).toHaveCount(await cards.count());
      const count = await page
        .locator('[data-adapttable-part="root"] [data-stagger]')
        .count();
      const expected = Array.from({ length: count }, (_, index) => index * 40);
      const recorded = await delays(page);
      expect(recorded.length % count).toBe(0);
      expect(lastEntrance(recorded, count)).toEqual(expected);
    });
  }
}

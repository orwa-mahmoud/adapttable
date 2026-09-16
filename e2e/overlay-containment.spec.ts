/**
 * An anchored overlay stays inside the viewport.
 *
 * The defect this exists to catch is silent: a popover anchored under a
 * trigger near one edge is placed partly outside the window, and what falls
 * outside is its own labels. "contains" reads as "tains", and nothing throws.
 * It only appears on a viewport narrow enough that the panel cannot sit
 * beside its trigger — which is every phone.
 *
 * So the assertion is geometric, not visual: whatever a kit draws, it may not
 * start left of the window or end right of it, and the page may never scroll
 * sideways.
 */
import { expect, type Page, test } from "@playwright/test";

/** Widths a real phone actually reports, plus the tablet breakpoint. */
const NARROW = [320, 390, 768] as const;

/** Every surface that anchors itself to something. */
const OVERLAYS = [
  '[role="dialog"]',
  '[role="menu"]',
  '[data-adapttable-part$="-popover"]',
  '[data-adapttable-part$="-menu"]',
  '[data-adapttable-part$="-drawer"]',
].join(",");

/** Triggers worth opening on a demo page, by accessible name. */
const TRIGGERS = [/filters/i, /columns/i, /sort/i, /export/i, /views/i];

interface Escapee {
  readonly part: string;
  readonly left: number;
  readonly right: number;
}

/** Any open overlay that starts or ends outside the window. */
async function escapees(page: Page): Promise<Escapee[]> {
  return page.evaluate((selector) => {
    const width = window.innerWidth;
    return [...document.querySelectorAll(selector)]
      .filter((el) => el.getClientRects().length > 0)
      .map((el) => {
        const rect = el.getBoundingClientRect();
        return {
          part:
            el.getAttribute("data-adapttable-part") ??
            el.getAttribute("role") ??
            el.tagName.toLowerCase(),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
        };
      })
      .filter((box) => box.left < -1 || box.right > width + 1);
  }, OVERLAYS);
}

for (const width of NARROW) {
  test(`overlays stay inside a ${String(width)}px viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/mantine/filtering/");
    await expect(
      page.locator(".mx-shell, .ai-demo, main").first()
    ).toBeVisible();

    for (const name of TRIGGERS) {
      const trigger = page.getByRole("button", { name }).first();
      if ((await trigger.count()) === 0) continue;
      await trigger.click();
      await page.waitForTimeout(250);

      const outside = await escapees(page);
      expect(
        outside,
        `overlay outside the ${String(width)}px viewport: ${JSON.stringify(outside)}`
      ).toEqual([]);

      await page.keyboard.press("Escape");
      await page.waitForTimeout(150);
    }
  });

  test(`the page never scrolls sideways at ${String(width)}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 780 });
    await page.goto("/mantine/filtering/");
    await expect(
      page.locator(".mx-shell, .ai-demo, main").first()
    ).toBeVisible();

    const overflows = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1
    );
    expect(overflows).toBe(false);
  });
}

test("the assistant page fits a phone, schema and all", async ({ page }) => {
  // The developer inspector holds a JSON schema, and a grid child sizes to
  // its content unless told otherwise — which grew the whole column and
  // pushed the page sideways.
  await page.setViewportSize({ width: 320, height: 780 });
  await page.goto("/mantine/ai/");
  await expect(page.locator(".ai-demo")).toBeVisible();

  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

test("a filter panel opens its whole width, labels included", async ({
  page,
}) => {
  // The reported case: at 400px the panel was placed at x = -56, so the
  // leading edge of every label was cut off.
  await page.setViewportSize({ width: 400, height: 900 });
  await page.goto("/mantine/filtering/");
  await page
    .getByRole("button", { name: /filters/i })
    .first()
    .click();

  const panel = page
    .locator('[role="dialog"], [data-adapttable-part$="-popover"]')
    .first();
  await expect(panel).toBeVisible();
  const box = await panel.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(-1);
  expect(box!.x + box!.width).toBeLessThanOrEqual(401);
});

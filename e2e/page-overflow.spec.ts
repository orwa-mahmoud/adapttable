import { expect, test } from "@playwright/test";

import { SHOWCASE_PAGES } from "../apps/showcase/pages.mjs";

/**
 * No demo page scrolls the document sideways on a desktop.
 *
 * A page-level horizontal scrollbar is the one layout fault that touches every
 * page at once, because it comes from the shared chrome rather than from a
 * demo: the nav is on top of all twenty-one of them, and anything in it that
 * cannot fit pushes the whole document wider than the viewport. jsdom has no
 * layout, so only a real browser can measure it. The nav's own metrics — one
 * row at every desktop width, panels that float rather than widen the bar —
 * are held to in `nav-menu.spec.ts`.
 *
 * The pages come from `apps/showcase/pages.mjs`, the manifest Vite's build
 * inputs and the sitemap are generated from, so a page added there is covered
 * here without being listed twice.
 */

/** The dev server serves the showcase at the root; the site serves it at /demo/. */
const devPath = (route: string) => route.replace(/^\/demo/, "") || "/";

/**
 * Both above the nav's 920px mobile breakpoint, where the `<select>` takes over:
 * the narrowest desktop the nav strip has to fit into, and a common one.
 */
const VIEWPORTS = [
  { width: 1024, height: 900 },
  { width: 1440, height: 900 },
] as const;

/**
 * Non-indexable entries are either meta-refresh stubs (no layout of their
 * own) or kit/e2e labs that stay off the sitemap. Overflow is measured on
 * the indexable pages the nav actually offers.
 */
const PAGES = SHOWCASE_PAGES.filter((page) => page.indexable);

for (const { key, route } of PAGES) {
  for (const { width, height } of VIEWPORTS) {
    test(`${key}: the document does not scroll sideways at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height });
      await page.goto(devPath(route));
      await expect(page.locator(".nav__inner")).toBeVisible();

      const measured = await page.evaluate(() => {
        const root = document.documentElement;
        return {
          overflow: root.scrollWidth - root.clientWidth,
          // A page clipped with `overflow-x: hidden` measures clean while
          // hiding content off the inline edge. That is not the fix.
          clipped: [root, document.body].map(
            (element) => getComputedStyle(element).overflowX
          ),
        };
      });

      expect(
        measured.overflow,
        `${devPath(route)} overflows its viewport by ${measured.overflow}px at ${width}px`
      ).toBeLessThanOrEqual(1);
      for (const overflowX of measured.clipped) {
        expect(overflowX).not.toBe("hidden");
      }
    });
  }
}

/**
 * The same contract on a phone, at the narrowest width the site claims to
 * serve. A control row that only wraps at a desktop width, or a code sample
 * that widens the document instead of scrolling inside its own box, shows up
 * here and nowhere else — the desktop widths above have room to hide it.
 * 320px is the whole loop on purpose: a page that fits there fits the wider
 * phones, and the suite stays a suite rather than a matrix.
 */
for (const { key, route } of PAGES) {
  test(`${key}: the document does not scroll sideways at 320px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(devPath(route));

    const measured = await page.evaluate(() => {
      const root = document.documentElement;
      return {
        overflow: root.scrollWidth - root.clientWidth,
        clipped: [root, document.body].map(
          (element) => getComputedStyle(element).overflowX
        ),
      };
    });

    expect(
      measured.overflow,
      `${devPath(route)} overflows its viewport by ${measured.overflow}px at 320px`
    ).toBeLessThanOrEqual(1);
    for (const overflowX of measured.clipped) {
      expect(overflowX).not.toBe("hidden");
    }
  });
}

/**
 * The other half of the contract: a still page must not come from pinning the
 * demos' own scrollers. The scale page's wide column set is the case that tells
 * — forty columns scroll inside the table's scroll box while the document
 * stays put.
 */
test("the wide column set scrolls inside the table, not the page", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/mantine/scale/?cols=40");
  const box = page.locator('[data-adapttable-part="scroll-box"]').first();
  await expect(box).toBeVisible();

  const scroller = await box.evaluate((element) => ({
    scrollWidth: element.scrollWidth,
    clientWidth: element.clientWidth,
    overflowX: getComputedStyle(element).overflowX,
    pageOverflow:
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  }));

  expect(scroller.overflowX).toBe("auto");
  expect(
    scroller.scrollWidth,
    "the wide table has nothing left to scroll inside its box"
  ).toBeGreaterThan(scroller.clientWidth);
  expect(scroller.pageOverflow).toBeLessThanOrEqual(1);
});

/**
 * The pinned table chrome parks under the nav: toolbar at the nav's bottom
 * edge, header under the toolbar. Offset is measured from the live elements
 * rather than written down, so neither can slide under chrome that changed
 * shape.
 */
test("the pinned table chrome lands under the nav on a narrow desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1024, height: 800 });
  await page.goto("/mantine/scale/");
  await expect(page.locator("thead th").first()).toBeVisible();
  // The window grows as rows stream in; there is nothing to pin the header
  // against until the document is taller than the scroll this takes.
  await expect
    .poll(() => page.evaluate(() => document.documentElement.scrollHeight), {
      timeout: 15_000,
    })
    .toBeGreaterThan(3000);
  await page.evaluate(() => window.scrollTo(0, 1500));
  await expect
    .poll(() => page.evaluate(() => Math.round(window.scrollY)))
    .toBeGreaterThan(1000);

  const gap = await page.evaluate(() => {
    const nav = document.querySelector(".nav")!.getBoundingClientRect();
    const toolbar = document
      .querySelector('[data-adapttable-part="toolbar"]')!
      .getBoundingClientRect();
    const header = document.querySelector("thead th")!.getBoundingClientRect();
    return {
      toolbarFromNav: Math.round(toolbar.top - nav.bottom),
      headerFromToolbar: Math.round(header.top - toolbar.bottom),
    };
  });

  expect(
    gap.toolbarFromNav,
    "the toolbar hides behind the nav"
  ).toBeGreaterThanOrEqual(0);
  expect(
    gap.toolbarFromNav,
    "the toolbar floats below the nav"
  ).toBeLessThanOrEqual(2);
  expect(
    gap.headerFromToolbar,
    "the header hides behind the toolbar"
  ).toBeGreaterThanOrEqual(0);
  expect(
    gap.headerFromToolbar,
    "the header floats below the toolbar"
  ).toBeLessThanOrEqual(2);
});

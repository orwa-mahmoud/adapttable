import { expect, test } from "@playwright/test";

/**
 * The dev server must be as silent as the built site.
 *
 * `pnpm dev` was the leakiest case of all: the Cloudflare beacon was a plain
 * script tag in the HTML, so every local page view filed a real visitor. The
 * built-site guard is asserted in `e2e/analytics.spec.ts`; this asserts the
 * same thing for the server people actually develop against.
 */
const TRACKERS = [
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "clarity.ms",
  "cloudflareinsights.com",
];

for (const path of ["/", "/all-options/"]) {
  test(`the dev server sends no analytics from ${path}`, async ({ page }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (TRACKERS.some((host) => url.includes(host))) calls.push(url);
    });

    await page.goto(path, { waitUntil: "networkidle" });
    await page.waitForTimeout(250);

    expect(calls).toEqual([]);
  });
}

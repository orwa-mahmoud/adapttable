import { expect, test } from "@playwright/test";

/**
 * A local session must never reach the analytics.
 *
 * The published site carries three trackers — the Cloudflare beacon, GA4 and
 * Clarity. Each of them counted developer traffic: the beacon is a script tag
 * in the HTML, so it fired on `pnpm dev`, and the other two were gated on "is
 * this a production build", which is a different question from "is this the
 * real site". A local build, a preview, and this very suite are all production
 * builds, and every one of them filed itself as a visitor and a session
 * recording.
 *
 * The page now decides at runtime from its own hostname, and this is what
 * proves it: the suite serves the built site — tags and all — from localhost,
 * and no request may leave for any of them. Not a blocked one, not a dropped
 * one. None.
 *
 * A guard nothing exercises is a guard that quietly stops working, which is
 * why this runs against the same build every other spec does.
 */
const TRACKERS = [
  "googletagmanager.com",
  "google-analytics.com",
  "analytics.google.com",
  "clarity.ms",
  "cloudflareinsights.com",
];

/** Pages with different shells: the landing page, the lab, and a kit page. */
const PAGES = ["/", "/all-options/", "/mui/rows/"];

for (const path of PAGES) {
  test(`no analytics request leaves localhost from ${path}`, async ({
    page,
  }) => {
    const calls: string[] = [];
    page.on("request", (request) => {
      const url = request.url();
      if (TRACKERS.some((host) => url.includes(host))) calls.push(url);
    });

    await page.goto(path, { waitUntil: "networkidle" });
    // The injectors run on load; give a late one a chance to be wrong.
    await page.waitForTimeout(250);

    expect(calls).toEqual([]);
  });
}

test("the built page still carries the trackers it guards", async ({
  page,
}) => {
  // The assertions above would pass just as well if the tags had been stripped
  // from the build, which would prove nothing about the guard. This is what
  // makes them mean something: the code IS on the page, and chose not to run.
  await page.goto("/");
  const html = await page.content();
  for (const host of ["googletagmanager.com", "clarity.ms"]) {
    expect(html).toContain(host);
  }
});

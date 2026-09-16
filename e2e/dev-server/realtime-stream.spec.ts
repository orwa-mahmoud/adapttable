import { expect, test } from "@playwright/test";

import { builtAdapters } from "../../apps/showcase/matrix.mjs";

/**
 * The one behaviour that only the dev server can show.
 *
 * `createDemoPatchSource` opens a real `EventSource` under `import.meta.env.DEV`
 * and a scripted tick source otherwise, because the published demo is static
 * and has no server to stream from. Holding the stream off — which is what
 * makes the feed's empty state a fact rather than a race — therefore means
 * intercepting a network request that exists only while Vite is serving.
 *
 * The rest of the realtime page is asserted against the built site in
 * `e2e/realtime-page.spec.ts`, where every visitor's code path lives. This file
 * is the reason the `chromium-dev` project exists, and it should stay the only
 * thing in it.
 */
const KIT = builtAdapters()[0]!.key;

const feed = (page: import("@playwright/test").Page) =>
  page.getByTestId("realtime-feed");

test("the feed says it is waiting until a patch arrives", async ({ page }) => {
  await page.route("**/__adapttable/patches", (route) => route.abort());
  await page.goto(`/${KIT}/realtime/`);
  await expect(feed(page)).toContainText("waiting for the first patch");
  await expect(feed(page).locator("li")).toHaveCount(0);
});

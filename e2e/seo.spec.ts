import { expect, test } from "@playwright/test";

import { matrixPages } from "../apps/showcase/matrix.mjs";

/**
 * Every demo page answers without JavaScript.
 *
 * These pages are how people find the library, and a crawler — or anyone on a
 * slow connection — sees only the served HTML. Each page therefore has to
 * carry its own title, its own description, one h1, and enough real copy to
 * say what the page is. A page that renders an empty root is invisible.
 */

/**
 * The shared pages, and every page the adapter × feature matrix builds — read
 * from the manifest, so a page that ships is a page held to this bar without
 * being listed twice.
 */
const PAGES = [
  { path: "/", name: "live demo" },
  { path: "/all-options/", name: "Feature Lab" },
  ...matrixPages().map((page) => ({
    path: `/${page.dir}/`,
    name: page.feature ? `${page.adapter} ${page.feature}` : page.adapter,
  })),
] as const;

for (const { path, name } of PAGES) {
  test(`${name}: is readable with JavaScript disabled`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    // HTML and meta are what a crawler sees. `load` waits for Google Fonts
    // and times out a green page when that third-party request hangs.
    await page.goto(path, { waitUntil: "domcontentloaded" });

    const title = await page.title();
    expect(title.length, `${path} has no title`).toBeGreaterThan(10);

    const description = await page
      .locator('meta[name="description"]')
      .getAttribute("content");
    expect(description, `${path} has no meta description`).toBeTruthy();
    expect(description!.length).toBeGreaterThan(40);

    await expect(
      page.getByRole("heading", { level: 1 }),
      `${path} needs exactly one h1`
    ).toHaveCount(1);

    // Real copy, not a spinner or a placeholder.
    const words = (await page.locator("main").innerText()).split(/\s+/).length;
    expect(words, `${path} serves only ${words} words`).toBeGreaterThan(60);

    await context.close();
  });
}

test("no two pages share a title or a description", async ({ browser }) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  for (const { path } of PAGES) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    titles.add(await page.title());
    descriptions.add(
      (await page
        .locator('meta[name="description"]')
        .getAttribute("content")) ?? ""
    );
  }
  await context.close();
  // Duplicates make two pages compete for the same search, and one loses.
  expect(titles.size).toBe(PAGES.length);
  expect(descriptions.size).toBe(PAGES.length);
});

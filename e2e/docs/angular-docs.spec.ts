/** Verify rendered Angular guides against their canonical content and metadata. */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { expect, type Page, test } from "@playwright/test";

import { TITLES } from "../../apps/docs/sync-docs.mjs";
import { ANGULAR_DOCS } from "../../scripts/angular-docs.mjs";
import { ORIGIN } from "../../scripts/site.mjs";

const DOCS_URL = "http://localhost:4323";
const TITLES_BY_SOURCE: Readonly<Record<string, string>> = TITLES;
const DOCS_ROOT = join(import.meta.dirname, "../../docs");

test.use({ baseURL: DOCS_URL });

function linkText(markdown: string): string {
  let result = "";
  let cursor = 0;
  while (cursor < markdown.length) {
    const start = markdown.indexOf("[", cursor);
    if (start < 0) break;
    const labelEnd = markdown.indexOf("]", start + 1);
    if (labelEnd < 0) break;
    if (markdown[labelEnd + 1] !== "(") {
      // Preserve literal arrays such as filters([]) before the next real link.
      result += markdown.slice(cursor, labelEnd + 1);
      cursor = labelEnd + 1;
      continue;
    }
    const end = markdown.indexOf(")", labelEnd + 2);
    if (end < 0) break;
    result +=
      markdown.slice(cursor, start) + markdown.slice(start + 1, labelEnd);
    cursor = end + 1;
  }
  return result + markdown.slice(cursor);
}

function proseText(text: string): string {
  // Starlight smartens prose quotes, but preserves quotes inside inline code.
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function articleIntroduction(markdown: string): string {
  const introduction = markdown
    .replace(/^# .*\n/, "")
    .trim()
    .split(/\n\s*\n/)[0];
  if (!introduction) throw new Error("A guide needs an introduction");
  return proseText(
    linkText(introduction).replace(/`+/g, "").replace(/\*\*/g, "")
  );
}

async function expectGuide(page: Page, source: string, route: string) {
  const title = TITLES_BY_SOURCE[source];
  expect(title, `${source} needs a descriptive title`).toBeTruthy();
  await expect(page).toHaveURL(`${DOCS_URL}${route}`);
  await expect(page).toHaveTitle(`${title} | AdaptTable`);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toHaveCount(1);
  await expect(heading).toHaveText(title!);
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    `${ORIGIN}${route}`
  );
  const article = page.locator("main .sl-markdown-content");
  await expect(article).toHaveCount(1);
  await expect(article).toBeVisible();
  const introduction = article.locator(":scope > p").first();
  await expect(introduction).toBeVisible();
  await expect
    .poll(async () => proseText(await introduction.innerText()))
    .toBe(articleIntroduction(readFileSync(join(DOCS_ROOT, source), "utf8")));
  return article;
}

test("every Angular source is included in the browser inventory", () => {
  const sources = readdirSync(join(DOCS_ROOT, "angular"))
    .filter((file) => file.endsWith(".md"))
    .map((file) => `angular/${file}`)
    .sort((left, right) => left.localeCompare(right));
  expect(ANGULAR_DOCS.length).toBeGreaterThanOrEqual(50);
  expect(
    [...ANGULAR_DOCS].sort((left, right) => left.localeCompare(right))
  ).toEqual(sources);
});

for (const source of ANGULAR_DOCS) {
  const basename = source.replace(/^angular\//, "").replace(/\.md$/, "");
  const route = `/angular/${basename}/`;
  // These two Angular guides have framework-neutral counterparts at root.
  // Keep this expectation independent of the switch's routing function.
  const angularOnly = [
    "material",
    "ng-bootstrap",
    "spartan",
    "taiga-ui",
    "angular-cdk",
    "ngx-bootstrap",
    "aria",
  ].includes(basename);
  const reactRoute = ["data-tiers", "custom-table-source"].includes(basename)
    ? `/${basename}/`
    : `/react/${basename}/`;

  test(`${route} renders its guide and verifies its framework destination`, async ({
    page,
  }) => {
    const response = await page.goto(route, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const article = await expectGuide(page, source, route);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(
      "Angular"
    );

    const markdown = readFileSync(join(DOCS_ROOT, source), "utf8");
    const snippet = /```ts\n([\s\S]*?)\n```/.exec(markdown)?.[1];
    expect(snippet, `${source} needs a real Angular code example`).toBeTruthy();
    const example = article.locator('pre[data-language="ts"]').first();
    await expect(example).toBeVisible();
    // Expressive Code uses block elements for lines without text-node newlines.
    // Check every complete line in order, including blank lines, not textContent
    // for the entire pre, which concatenates otherwise correctly rendered lines.
    await expect(example.locator(".ec-line .code")).toHaveText(
      snippet!.trim().split("\n")
    );
    expect((await article.innerText()).split(/\s+/).length).toBeGreaterThan(
      150
    );
    await expect(article.locator("h2").first()).toBeVisible();

    const framework = page.locator("[data-framework-select]:visible").first();
    await expect(framework).toHaveValue("angular");
    const destination = angularOnly
      ? `/react/getting-started/?unavailable=${basename}`
      : reactRoute;
    await expect(framework.locator('option[value="react"]')).toHaveAttribute(
      "data-href",
      destination
    );
    await framework.selectOption("react");
    if (angularOnly) {
      await expect(page).toHaveURL(`${DOCS_URL}${destination}`);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(
        TITLES_BY_SOURCE["getting-started.md"]!
      );
      await expect(page.locator("[data-framework-notice]")).toContainText(
        "not available for React"
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${ORIGIN}/react/getting-started/`
      );
      await page.goBack();
    } else {
      await expectGuide(page, `${basename}.md`, reactRoute);
      await expect(framework).toHaveValue("react");
      await expect(
        framework.locator('option[value="angular"]')
      ).toHaveAttribute("data-href", route);
      await framework.selectOption("angular");
    }
    await expectGuide(page, source, route);
  });
}

test("an unregistered Angular guide is a real 404, never the showcase", async ({
  page,
}) => {
  const response = await page.goto("/angular/not-a-registered-guide/", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(404);
  await expect(page.locator("body")).toHaveText("not found");
  await expect(page.locator("main .sl-markdown-content")).toHaveCount(0);
});

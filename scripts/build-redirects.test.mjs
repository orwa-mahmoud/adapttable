import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import {
  addressMap,
  finalRoute,
  redirectPage,
  redirectsTable,
  writeLegacySite,
} from "./build-redirects.mjs";
import { LEGACY_SITE } from "./legacy-routes.mjs";
import { DEMO_ROOT, demoRoute, docsRoute, siteUrl } from "./site.mjs";

const PAGE = '<!doctype html><meta charset="utf-8" /><title>A page</title>';
const STUB =
  '<!doctype html><meta http-equiv="refresh" content="0; url=../mantine/columns/" />';

const temps = [];
after(() => {
  for (const dir of temps) rmSync(dir, { recursive: true, force: true });
});

const write = (root, rel, body) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
};

/** A composed site small enough to reason about. */
const composed = () => {
  const root = mkdtempSync(join(tmpdir(), "adapttable-redirects-"));
  temps.push(root);
  const demo = DEMO_ROOT.slice(1);
  write(root, "index.html", PAGE);
  write(root, `${docsRoute("filtering").slice(1)}index.html`, PAGE);
  write(root, `${docsRoute("concepts").slice(1)}index.html`, PAGE);
  write(root, `v1${docsRoute("filtering")}index.html`, PAGE);
  write(root, `${demo}index.html`, PAGE);
  write(root, `${demo}mantine/columns/index.html`, PAGE);
  write(root, `${demo}columns/index.html`, STUB);
  write(root, "media/ai/demo.gif", "GIF89a");
  write(root, "og/filtering.png", "png");
  write(root, "llms.txt", "# AdaptTable");
  write(root, "google0123abcd.html", "google-site-verification");
  write(root, "0123456789abcdef0123456789abcdef.txt", "key");
  write(root, "_astro/app.js", "// bundle");
  write(
    root,
    "sitemap.xml",
    `<urlset>${[
      "/",
      docsRoute("filtering"),
      docsRoute("concepts"),
      demoRoute("mantine/columns"),
    ]
      .map((route) => `<loc>${siteUrl(route)}</loc>`)
      .join("")}</urlset>`
  );
  return root;
};

describe("finalRoute", () => {
  it("keeps a page and follows a stub to where it forwards", () => {
    assert.equal(finalRoute("/react/filtering/", PAGE), "/react/filtering/");
    assert.equal(
      finalRoute(demoRoute("columns"), STUB),
      demoRoute("mantine/columns")
    );
  });
});

describe("addressMap", () => {
  it("maps every built page from its previous path to its final route", () => {
    const map = addressMap(composed());
    const byFrom = new Map(map.map(({ from, to }) => [from, to]));
    assert.equal(byFrom.get("/"), "/");
    assert.equal(byFrom.get("/filtering/"), docsRoute("filtering"));
    assert.equal(byFrom.get("/concepts/"), docsRoute("concepts"));
    assert.equal(byFrom.get("/v1/filtering/"), `/v1${docsRoute("filtering")}`);
    assert.equal(byFrom.get("/demo/"), DEMO_ROOT);
    assert.equal(byFrom.get("/demo/columns/"), demoRoute("mantine/columns"));
    assert.equal(map.length, 7);
  });
});

describe("redirectsTable", () => {
  it("answers each changed path, with and without its slash, and nothing unchanged", () => {
    const lines = redirectsTable(composed()).split("\n");
    const target = docsRoute("filtering");
    assert.ok(lines.includes(`/filtering/ ${target} 301`));
    assert.ok(lines.includes(`/filtering ${target} 301`));
    assert.ok(lines.includes(`/v1/filtering/ /v1${target} 301`));
    assert.ok(lines.includes(`/demo/* ${DEMO_ROOT}:splat 301`));
    assert.equal(
      lines.some((line) => line.startsWith("/concepts")),
      false
    );
    assert.equal(
      lines.some((line) => line.startsWith("/ ")),
      false
    );
  });
});

describe("redirectPage", () => {
  it("declares the move three ways and escapes the URL", () => {
    const html = redirectPage("https://example.com/a?b=1&c=2");
    assert.match(
      html,
      /<link rel="canonical" href="https:\/\/example\.com\/a\?b=1&amp;c=2" \/>/
    );
    assert.match(
      html,
      /http-equiv="refresh" content="0; url=https:\/\/example\.com\/a\?b=1&amp;c=2"/
    );
    assert.match(
      html,
      /location\.replace\("https:\/\/example\.com\/a\?b=1&c=2" \+ location\.search \+ location\.hash\)/
    );
    assert.equal(html.includes("noindex"), false);
  });
});

describe("writeLegacySite", () => {
  it("writes a page per previous address, keeps the files READMEs embed, and lists what was indexed", () => {
    const root = composed();
    const out = mkdtempSync(join(tmpdir(), "adapttable-legacy-"));
    temps.push(out);
    const { pages, listed } = writeLegacySite(root, out);
    assert.equal(pages, 7);
    assert.equal(listed, 4);

    const filtering = readFileSync(
      join(out, "filtering", "index.html"),
      "utf8"
    );
    assert.ok(filtering.includes(`href="${siteUrl(docsRoute("filtering"))}"`));
    const stub = readFileSync(
      join(out, "demo", "columns", "index.html"),
      "utf8"
    );
    assert.ok(stub.includes(`href="${siteUrl(demoRoute("mantine/columns"))}"`));

    for (const file of [
      "media/ai/demo.gif",
      "og/filtering.png",
      "llms.txt",
      "google0123abcd.html",
      "0123456789abcdef0123456789abcdef.txt",
      "404.html",
      "robots.txt",
      "sitemap.xml",
    ]) {
      assert.ok(existsSync(join(out, file)), file);
    }
    assert.equal(existsSync(join(out, "_astro")), false);

    const sitemap = readFileSync(join(out, "sitemap.xml"), "utf8");
    assert.ok(sitemap.includes(`<loc>${LEGACY_SITE}/filtering/</loc>`));
    assert.equal(sitemap.includes("/demo/columns/"), false);
    assert.ok(
      readFileSync(join(out, "robots.txt"), "utf8").includes(
        `Sitemap: ${LEGACY_SITE}/sitemap.xml`
      )
    );
  });
});

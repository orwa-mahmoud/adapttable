import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import {
  auditDemoRoutes,
  auditDocsRoutes,
  classifyDemoPages,
  deadRoutes,
  demoPages,
} from "./check-sitemap.mjs";
import { DEMO_ROOT, demoRoute } from "./site.mjs";
import { SITE } from "./sitemap-routes.mjs";

/** Where the showcase sits inside a composed site. */
const DEMO_DIR = DEMO_ROOT.slice(1, -1);

const ROOT_ROUTE = demoRoute();
const COLUMNS_ROUTE = demoRoute("columns");
const STUB_ROUTE = demoRoute("export-pdf");
const LEGACY_ROUTE = demoRoute("legacy");
const ORPHAN_ROUTE = demoRoute("orphan");
/** Listed in a sitemap, built by nobody. */
const GHOST_ROUTE = demoRoute("ghost");

const INDEX = "index.html";
const PAGE = '<!doctype html><meta charset="utf-8" /><title>A demo</title>';
const STUB =
  '<!doctype html><meta http-equiv="refresh" content="0; url=../export/" />';

/**
 * The `legacy` stub is deliberately absent: it stands for a stub nobody
 * registered, which the meta-refresh sniff has to catch on its own.
 */
const MANIFEST = [
  { key: "main", html: "./index.html", route: ROOT_ROUTE, indexable: true },
  {
    key: "columns",
    html: "./columns/index.html",
    route: COLUMNS_ROUTE,
    indexable: true,
  },
  {
    key: "export-pdf",
    html: "./export-pdf/index.html",
    route: STUB_ROUTE,
    indexable: false,
  },
];

const temps = [];

const write = (root, rel, body) => {
  const file = join(root, rel);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, body);
};

/** A composed site: two real pages, two stubs, one unlisted page, one asset. */
const composed = () => {
  const root = mkdtempSync(join(tmpdir(), "adapttable-sitemap-"));
  temps.push(root);
  write(root, join(DEMO_DIR, INDEX), PAGE);
  write(root, join(DEMO_DIR, "columns", INDEX), PAGE);
  write(root, join(DEMO_DIR, "export-pdf", INDEX), STUB);
  write(root, join(DEMO_DIR, "legacy", INDEX), STUB);
  write(root, join(DEMO_DIR, "orphan", INDEX), PAGE);
  write(root, join(DEMO_DIR, "assets", "app.js"), "// bundle");
  return root;
};

const empty = () => {
  const root = mkdtempSync(join(tmpdir(), "adapttable-sitemap-"));
  temps.push(root);
  return root;
};

const urlset = (routes) =>
  `<urlset>${routes
    .map((route) => `<url><loc>${SITE}${route}</loc></url>`)
    .join("")}</urlset>`;

after(() => {
  for (const root of temps) rmSync(root, { recursive: true, force: true });
});

describe("demoPages", () => {
  it("finds every built page and nothing that is not one", () => {
    assert.deepEqual(
      demoPages(composed()).map((page) => page.route),
      [ROOT_ROUTE, COLUMNS_ROUTE, STUB_ROUTE, LEGACY_ROUTE, ORPHAN_ROUTE].sort(
        (a, b) => a.localeCompare(b)
      )
    );
  });

  it("finds no pages in a tree that was never composed", () => {
    assert.deepEqual(demoPages(empty()), []);
  });
});

describe("classifyDemoPages", () => {
  it("excludes a stub the manifest marks and one only the HTML reveals", () => {
    const { crawlable, redirects } = classifyDemoPages(composed(), MANIFEST);
    assert.deepEqual(crawlable, [ROOT_ROUTE, COLUMNS_ROUTE, ORPHAN_ROUTE]);
    assert.deepEqual(redirects, [STUB_ROUTE, LEGACY_ROUTE]);
  });
});

describe("auditDemoRoutes", () => {
  it("names the crawlable route the sitemap left out", () => {
    const xml = urlset([ROOT_ROUTE, COLUMNS_ROUTE]);
    assert.deepEqual(auditDemoRoutes(composed(), xml, MANIFEST).missing, [
      ORPHAN_ROUTE,
    ]);
  });

  it("finds nothing wrong when the sitemap carries every crawlable route", () => {
    const xml = urlset([ROOT_ROUTE, COLUMNS_ROUTE, ORPHAN_ROUTE]);
    const { missing, dead } = auditDemoRoutes(composed(), xml, MANIFEST);
    assert.deepEqual(missing, []);
    assert.deepEqual(dead, []);
  });

  it("never asks the sitemap to carry a redirect", () => {
    const xml = urlset([ROOT_ROUTE, COLUMNS_ROUTE, ORPHAN_ROUTE]);
    const { missing, redirects } = auditDemoRoutes(composed(), xml, MANIFEST);
    assert.equal(missing.includes(STUB_ROUTE), false);
    assert.equal(missing.includes(LEGACY_ROUTE), false);
    assert.deepEqual(redirects, [STUB_ROUTE, LEGACY_ROUTE]);
  });

  it("names a sitemap route with no page behind it", () => {
    const xml = urlset([ROOT_ROUTE, COLUMNS_ROUTE, ORPHAN_ROUTE, GHOST_ROUTE]);
    assert.deepEqual(auditDemoRoutes(composed(), xml, MANIFEST).dead, [
      GHOST_ROUTE,
    ]);
  });
});

describe("deadRoutes", () => {
  it("names a sitemap route with no page behind it", () => {
    const xml = urlset([ROOT_ROUTE, GHOST_ROUTE]);
    assert.deepEqual(deadRoutes(composed(), xml), [GHOST_ROUTE]);
  });

  it("accepts a sitemap whose demo routes are all built", () => {
    const xml = urlset([ROOT_ROUTE, COLUMNS_ROUTE]);
    assert.deepEqual(deadRoutes(composed(), xml), []);
  });
});

describe("every framework's demo root", () => {
  const ANGULAR_ROUTE = demoRoute("unstyled/filtering", "angular");
  const ANGULAR_GHOST = demoRoute("unstyled/ghost", "angular");

  /** The composed site, plus one Angular page under Angular's root. */
  const withAngular = () => {
    const root = composed();
    write(root, join(ANGULAR_ROUTE.slice(1), INDEX), PAGE);
    return root;
  };

  it("walks the Angular demo root beside React's", () => {
    assert.ok(
      demoPages(withAngular())
        .map((page) => page.route)
        .includes(ANGULAR_ROUTE)
    );
  });

  it("names an Angular page the sitemap left out, and an Angular route that 404s", () => {
    const xml = urlset([
      ROOT_ROUTE,
      COLUMNS_ROUTE,
      ORPHAN_ROUTE,
      ANGULAR_GHOST,
    ]);
    const { missing, dead } = auditDemoRoutes(withAngular(), xml, MANIFEST);
    assert.deepEqual(missing, [ANGULAR_ROUTE]);
    assert.deepEqual(dead, [ANGULAR_GHOST]);
  });
});

describe("canonical documentation routes", () => {
  const sources = [
    "filtering.md",
    "angular/filtering.md",
    "data-tiers.md",
    "angular/data-tiers.md",
  ];
  const routes = [
    "/react/filtering/",
    "/angular/filtering/",
    "/data-tiers/",
    "/angular/data-tiers/",
  ];
  const docs = () => {
    const root = empty();
    for (const route of routes)
      write(
        root,
        `${route.slice(1)}index.html`,
        `${PAGE}<link href="${SITE}${route}" rel="canonical">`
      );
    return root;
  };

  it("requires a real page and one canonical sitemap entry for every source", () => {
    const result = auditDocsRoutes(docs(), urlset(routes), sources);
    assert.deepEqual(result, {
      routes,
      missing: [],
      duplicate: [],
      unbuilt: [],
      canonical: [],
      dead: [],
    });
  });

  it("rejects missing and repeated Angular sitemap entries", () => {
    const result = auditDocsRoutes(
      docs(),
      urlset([routes[0], routes[1], routes[1], routes[2]]),
      sources
    );
    assert.deepEqual(result.missing, ["/angular/data-tiers/"]);
    assert.deepEqual(result.duplicate, ["/angular/filtering/"]);
  });

  it("rejects Angular pages without HTML even if they are in the sitemap", () => {
    const root = docs();
    rmSync(join(root, "angular/filtering/index.html"));
    const result = auditDocsRoutes(root, urlset(routes), sources);
    assert.deepEqual(result.unbuilt, ["/angular/filtering/"]);
    assert.deepEqual(result.dead, ["/angular/filtering/"]);
  });

  it("rejects a React canonical URL on an Angular page and canonical redirects", () => {
    const root = docs();
    write(
      root,
      "angular/filtering/index.html",
      `${PAGE}<link rel="canonical" href="${SITE}/react/filtering/">`
    );
    write(
      root,
      "angular/data-tiers/index.html",
      `${STUB}<link rel="canonical" href="${SITE}/angular/data-tiers/">`
    );
    assert.deepEqual(auditDocsRoutes(root, urlset(routes), sources).canonical, [
      "/angular/filtering/",
      "/angular/data-tiers/",
    ]);
  });
});

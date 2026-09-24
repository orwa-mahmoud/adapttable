import assert from "node:assert/strict";
import { readdirSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  DEMO_ROOT,
  demoRoute,
  docsRoute,
  docsSlug,
  FRAMEWORK,
  ORIGIN,
  SHARED_DOCS,
  siteUrl,
} from "./site.mjs";

const DOCS = fileURLToPath(new URL("../docs/", import.meta.url));
const PAGES = readdirSync(DOCS)
  .filter((file) => file.endsWith(".md"))
  .map((file) => file.replace(/\.md$/, ""));

describe("site addresses", () => {
  it("serves the site from the root of an https origin", () => {
    const origin = new URL(ORIGIN);
    assert.equal(origin.protocol, "https:");
    assert.equal(origin.pathname, "/");
    assert.equal(ORIGIN.endsWith("/"), false);
    assert.equal(siteUrl("/"), `${ORIGIN}/`);
  });

  it("puts framework docs in the framework section and shared docs at the root", () => {
    assert.equal(docsSlug("filtering"), `${FRAMEWORK}/filtering`);
    assert.equal(docsRoute("filtering"), `/${FRAMEWORK}/filtering/`);
    assert.equal(docsSlug("concepts"), "concepts");
    assert.equal(docsRoute("concepts"), "/concepts/");
  });

  it("names only shared pages that exist in docs/", () => {
    for (const page of SHARED_DOCS) {
      assert.ok(PAGES.includes(page), `${page} is not a docs/*.md page`);
    }
  });

  it("gives every docs page one route, and no two pages the same one", () => {
    const routes = PAGES.map(docsRoute);
    assert.equal(new Set(routes).size, routes.length);
    for (const route of routes) {
      assert.match(route, /^\/([a-z]+\/)?[a-z0-9-]+\/$/);
    }
  });

  it("mounts the showcase inside the framework section", () => {
    assert.equal(DEMO_ROOT, `/${FRAMEWORK}/demo/`);
    assert.equal(demoRoute(), DEMO_ROOT);
    assert.equal(demoRoute("mantine/pivot"), `${DEMO_ROOT}mantine/pivot/`);
  });
});

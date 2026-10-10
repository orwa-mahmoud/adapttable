import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { ANGULAR_DOCS } from "./angular-docs.mjs";
import { docsFiles } from "./docs-files.mjs";
import {
  DEMO_ROOT,
  DEMO_ROOTS,
  demoRoute,
  docsReferenceRoute,
  docsRoute,
  docsSlug,
  FRAMEWORK,
  ORIGIN,
  SHARED_DOCS,
  siteUrl,
  switchDocsRoute,
} from "./site.mjs";
import { VUE_DOCS } from "./vue-docs.mjs";

const DOCS = fileURLToPath(new URL("../docs/", import.meta.url));
const PAGES = docsFiles(DOCS).map((file) => file.replace(/\.md$/, ""));

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

  it("registers only implemented Vue guides with framework-aware fallback", () => {
    assert.deepEqual(VUE_DOCS, [
      "vue/getting-started.md",
      "vue/element-plus.md",
      "vue/naive-ui.md",
      "vue/nuxt-ui.md",
      "vue/quasar.md",
      "vue/reka-ui.md",
      "vue/shadcn-vue.md",
      "vue/vuetify.md",
      "vue/features.md",
      "vue/api.md",
      "vue/assistant.md",
      "vue/summary-row.md",
      "vue/column-menu.md",
      "vue/navigation.md",
      "vue/actions.md",
      "vue/specialized.md",
    ]);
    for (const source of VUE_DOCS) {
      assert.ok(PAGES.includes(source.replace(/\.md$/, "")), source);
      assert.equal(docsRoute(source), `/${source.replace(/\.md$/, "")}/`);
    }
    assert.equal(docsReferenceRoute("api", "vue"), "/vue/api/");
    assert.equal(
      docsReferenceRoute("filtering", "vue"),
      "/vue/getting-started/?unavailable=filtering"
    );
    assert.equal(docsReferenceRoute("concepts", "vue"), "/concepts/");
    assert.equal(
      switchDocsRoute("/vue/api/", "react", ["api.md", ...VUE_DOCS]),
      "/react/api/"
    );
    assert.equal(
      switchDocsRoute("/react/filtering/", "vue", [
        "filtering.md",
        ...VUE_DOCS,
      ]),
      "/vue/getting-started/"
    );
  });

  it("names only shared pages that exist in docs/", () => {
    for (const page of SHARED_DOCS) {
      assert.ok(PAGES.includes(page), `${page} is not a docs/*.md page`);
    }
  });

  it("uses canonical Angular source folders before classifying shared basenames", () => {
    assert.equal(docsSlug("filtering", "angular"), "angular/filtering");
    assert.equal(docsRoute("angular/filtering.md"), "/angular/filtering/");
    assert.equal(
      docsRoute("angular/filtering", "angular"),
      "/angular/filtering/"
    );
    assert.equal(docsRoute("angular/data-tiers.md"), "/angular/data-tiers/");
    assert.equal(
      docsRoute("angular/custom-table-source"),
      "/angular/custom-table-source/"
    );
    assert.equal(docsRoute("data-tiers"), "/data-tiers/");
    assert.equal(docsRoute("custom-table-source"), "/custom-table-source/");
    assert.equal(docsRoute("concepts", "angular"), "/concepts/");
    assert.equal(ANGULAR_DOCS.length, 58);
    assert.ok(ANGULAR_DOCS.includes("angular/migrating-to-0-5.md"));
    for (const kit of [
      "material",
      "ng-bootstrap",
      "spartan",
      "taiga-ui",
      "angular-cdk",
      "ngx-bootstrap",
      "aria",
    ]) {
      assert.ok(ANGULAR_DOCS.includes(`angular/${kit}.md`), kit);
      assert.ok(PAGES.includes(`angular/${kit}`), kit);
      assert.equal(docsRoute(`angular/${kit}.md`), `/angular/${kit}/`);
    }
    for (const source of ANGULAR_DOCS)
      assert.equal(docsRoute(source), `/${source.replace(/\.md$/, "")}/`);
  });

  it("keeps Angular references on available Angular guides and shared references", () => {
    assert.equal(
      docsReferenceRoute("filtering", "angular"),
      "/angular/filtering/"
    );
    assert.equal(
      docsReferenceRoute("data-tiers", "angular"),
      "/angular/data-tiers/"
    );
    assert.equal(docsReferenceRoute("ai", "angular"), "/ai/");
    assert.equal(
      docsReferenceRoute("api", "angular"),
      "/angular/getting-started/?unavailable=api"
    );
    assert.equal(docsReferenceRoute("filtering"), "/react/filtering/");
  });

  it("switches matching registered pages and uses an honest front-door fallback", () => {
    const sources = [
      "getting-started.md",
      "angular/getting-started.md",
      "filtering.md",
      "angular/filtering.md",
      "ssr-rsc.md",
      "angular/ssr-rsc.md",
      "concepts.md",
      "data-tiers.md",
      "angular/data-tiers.md",
      "migrate-from-v2.md",
    ];
    assert.equal(
      switchDocsRoute("/react/filtering/", "angular", sources),
      "/angular/filtering/"
    );
    assert.equal(
      switchDocsRoute("angular/filtering.md", "react", sources),
      "/react/filtering/"
    );
    assert.equal(
      switchDocsRoute("/react/ssr-rsc/", "angular", sources),
      "/angular/ssr-rsc/"
    );
    assert.equal(switchDocsRoute("concepts", "angular", sources), "/concepts/");
    assert.equal(
      switchDocsRoute("data-tiers", "angular", sources),
      "/angular/data-tiers/"
    );
    assert.equal(
      switchDocsRoute("angular/data-tiers", "react", sources),
      "/data-tiers/"
    );
    assert.equal(
      switchDocsRoute("migrate-from-v2", "angular", sources),
      "/angular/getting-started/"
    );
    assert.equal(
      switchDocsRoute("angular/only-here", "react", sources),
      "/react/getting-started/"
    );
    assert.throws(
      () => switchDocsRoute("missing", "angular", []),
      /Missing docs front door/
    );
  });

  it("gives every docs page one route, and no two pages the same one", () => {
    const routes = PAGES.map((page) => docsRoute(page));
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

  it("mounts each framework's demo pages in that framework's section", () => {
    assert.equal(demoRoute("", "angular"), "/angular/demo/");
    assert.equal(
      demoRoute("all-options", "angular"),
      "/angular/demo/all-options/"
    );
    assert.equal(
      demoRoute("unstyled/filtering", "angular"),
      "/angular/demo/unstyled/filtering/"
    );
    assert.equal(demoRoute("unstyled", "vue"), "/vue/demo/unstyled/");
    assert.equal(demoRoute("mantine", "react"), "/react/demo/mantine/");
    assert.deepEqual(DEMO_ROOTS, {
      react: "/react/demo/",
      angular: "/angular/demo/",
      vue: "/vue/demo/",
    });
  });
});

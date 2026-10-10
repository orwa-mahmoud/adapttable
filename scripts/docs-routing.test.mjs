/** Verify nested docs discovery, framework sidebars and canonical link rewriting. */
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";

import { sidebarPages, sidebarSlugs } from "../apps/docs/sidebar.mjs";
import { rewriteDocLinks } from "../apps/docs/sync-docs.mjs";
import { unlistedDocs } from "./build-llms-full.mjs";
import { docsFiles } from "./docs-files.mjs";
import { REPO_ROOT } from "./packages.mjs";

const temporary = [];
after(() =>
  temporary.forEach((directory) =>
    rmSync(directory, { recursive: true, force: true })
  )
);

describe("canonical docs sources", () => {
  it("discovers nested markdown sources and flags unregistered nested pages", () => {
    const directory = mkdtempSync(join(tmpdir(), "adapttable-docs-files-"));
    temporary.push(directory);
    for (const file of [
      "concepts.md",
      "angular/filtering.md",
      "angular/unregistered.md",
      "angular/asset.png",
    ]) {
      const target = join(directory, file);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, "fixture");
    }
    assert.deepEqual(docsFiles(directory), [
      "angular/filtering.md",
      "angular/unregistered.md",
      "concepts.md",
    ]);
    assert.deepEqual(unlistedDocs(directory), ["angular/unregistered.md"]);
  });

  it("recurses through nested sidebar groups without changing source IDs", () => {
    const tree = [
      {
        label: "Angular",
        items: [
          {
            label: "Features",
            items: [{ label: "Filtering", slug: "angular/filtering" }],
          },
        ],
      },
    ];
    assert.deepEqual(sidebarSlugs(tree), ["angular/filtering"]);
    assert.deepEqual(sidebarPages(tree), [
      { label: "Filtering", slug: "angular/filtering", group: "Features" },
    ]);
    assert.deepEqual(
      sidebarSlugs()
        .filter((slug) => slug.startsWith("angular/"))
        .sort(),
      docsFiles(join(REPO_ROOT, "docs"))
        .filter((file) => file.startsWith("angular/"))
        .map((file) => file.replace(/\.md$/, ""))
        .sort()
    );
  });
});

describe("source-relative markdown links", () => {
  it("preserves Angular siblings and shared anchors while explaining an unavailable API guide", () => {
    const source =
      "[Filters](./filtering.md#operators) [Concepts](../concepts.md) [API](../api.md#the-angular-binding)";
    assert.equal(
      rewriteDocLinks(source, "angular/columns.md"),
      "[Filters](/angular/filtering/#operators) [Concepts](/concepts/) [API](/angular/getting-started/?unavailable=api)"
    );
  });

  it("preserves explicit Angular sources with shared basenames", () => {
    assert.equal(
      rewriteDocLinks(
        "[Data](./data-tiers.md) [Custom](./custom-table-source.md)",
        "angular/getting-started.md"
      ),
      "[Data](/angular/data-tiers/) [Custom](/angular/custom-table-source/)"
    );
    assert.equal(
      rewriteDocLinks(
        "[Angular](./angular/filtering.md)",
        "getting-started.md"
      ),
      "[Angular](/angular/filtering/)"
    );
    assert.equal(
      rewriteDocLinks("[Data](./data-tiers.md)", "getting-started.md"),
      "[Data](/data-tiers/)"
    );
  });

  it("routes experimental Vue links without treating them as React sources", () => {
    assert.equal(
      rewriteDocLinks(
        "[API](./api.md#data-sources) [Concepts](../concepts.md)",
        "vue/getting-started.md"
      ),
      "[API](/vue/api/#data-sources) [Concepts](/concepts/)"
    );
    assert.equal(
      rewriteDocLinks("[Vue](./vue/api.md)", "api.md"),
      "[Vue](/vue/api/)"
    );
    assert.equal(
      rewriteDocLinks("[Filters](../filtering.md)", "vue/api.md"),
      "[Filters](/vue/getting-started/?unavailable=filtering)"
    );
    assert.deepEqual(
      sidebarSlugs()
        .filter((slug) => slug.startsWith("vue/"))
        .sort(),
      docsFiles(join(REPO_ROOT, "docs"))
        .filter((file) => file.startsWith("vue/"))
        .map((file) => file.replace(/\.md$/, ""))
        .sort()
    );
  });

  it("normalizes repository links from either source depth and leaves external links alone", () => {
    const root = "https://github.com/orwa-mahmoud/adapttable/blob/main/";
    assert.equal(
      rewriteDocLinks(
        "[Code](../../packages/angular/angular/src/cell.ts#L1)",
        "angular/columns.md"
      ),
      `[Code](${root}packages/angular/angular/src/cell.ts#L1)`
    );
    assert.equal(
      rewriteDocLinks("[Readme](../../README.md)", "angular/columns.md"),
      `[Readme](${root}README.md)`
    );
    assert.equal(
      rewriteDocLinks(
        "[Code](../packages/shared/core/src/index.ts)",
        "concepts.md"
      ),
      `[Code](${root}packages/shared/core/src/index.ts)`
    );
    const external = "[Remote](https://example.com/file.md) [Here](#heading)";
    assert.equal(rewriteDocLinks(external, "angular/filtering.md"), external);
  });
});

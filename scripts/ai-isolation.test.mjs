import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  baseGraphPaths,
  checkGraphs,
  GRAPHS,
  leaksIn,
  MARKERS,
  moduleEntries,
  moduleEntry,
} from "./ai-isolation.mjs";

describe("AI isolation", () => {
  it("names the marker and the graph that carries it", () => {
    const found = leaksIn(
      "packages/react/react/dist/index.js",
      'import { createAgentSession } from "@adapttable/ai";'
    );
    assert.deepEqual(found, [
      "packages/react/react/dist/index.js contains createAgentSession",
      "packages/react/react/dist/index.js contains @adapttable/ai",
    ]);
  });

  it("passes a graph that mentions none of them", () => {
    assert.deepEqual(
      leaksIn("packages/shared/core/dist/index.js", "export {};"),
      []
    );
  });

  it("watches every optional subpath, not only the package name", () => {
    for (const marker of MARKERS) {
      assert.deepEqual(leaksIn("g", `a ${marker} b`), [`g contains ${marker}`]);
    }
  });

  it("covers all bindings, implemented Angular and Vue kits, core, server and published React adapters", () => {
    // Exact paths catch a dropped graph, a duplicate or an unintended extra.
    // Private implemented Angular and Vue kits still owe AI isolation proof.
    const expected = [
      "packages/shared/core/dist/index.js",
      "packages/react/react/dist/index.js",
      "packages/vue/vue/dist/index.js",
      "packages/vue/adapter-vue-unstyled/dist/index.js",
      "packages/angular/angular/dist/fesm2022/adapttable-angular.mjs",
      "packages/shared/server/dist/index.js",
      ...[
        "mantine",
        "mui",
        "chakra",
        "antd",
        "radix",
        "base-ui",
        "unstyled",
        "shadcn",
      ].map((kit) => `packages/react/adapter-${kit}/dist/index.js`),
      ...[
        ["angular-unstyled", "angular-unstyled"],
        ["material", "angular-material"],
        ["ng-bootstrap", "ng-bootstrap"],
        ["spartan", "spartan"],
        ["taiga-ui", "taiga-ui"],
        ["angular-aria", "angular-aria"],
        ["ngx-bootstrap", "ngx-bootstrap"],
        ["angular-cdk", "angular-cdk"],
        ["ng-zorro", "ng-zorro"],
      ].map(
        ([folder, name]) =>
          `packages/angular/adapter-${folder}/dist/fesm2022/adapttable-${name}.mjs`
      ),
    ];
    const commonjs = expected
      .filter((path) => path.endsWith("/index.js"))
      .map((path) => path.replace(/\.js$/, ".cjs"));
    assert.deepEqual([...GRAPHS].sort(), [...expected, ...commonjs].sort());
  });

  it("resolves nested import/default exports and never mistakes declarations for code", () => {
    assert.equal(
      moduleEntry({
        types: "./dist/index.d.ts",
        import: {
          types: "./dist/entry.d.ts",
          default: "./dist/fesm2022/entry.mjs",
        },
      }),
      "./dist/fesm2022/entry.mjs"
    );
    assert.equal(
      moduleEntry({ import: "./dist/index.js", default: "./dist/index.cjs" }),
      "./dist/index.js"
    );
    assert.equal(moduleEntry({ types: "./dist/index.d.ts" }), undefined);
  });

  it("treats an unbuilt entry as a failure rather than a graph it skipped", () => {
    // A graph that is not there proves nothing about isolation. Reporting it
    // as clean is how a check keeps passing over a package nobody built.
    const { missing, leaked } = checkGraphs([
      "packages/shared/never-built/dist/index.js",
      "packages/shared/also-never-built/dist/index.js",
    ]);
    assert.deepEqual(missing, [
      "packages/shared/never-built/dist/index.js",
      "packages/shared/also-never-built/dist/index.js",
    ]);
    assert.deepEqual(leaked, []);
  });
});

function fixture(t, packages) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-ai-isolation-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const [path, manifest] of Object.entries(packages)) {
    const dir = join(root, "packages", path);
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "package.json"), JSON.stringify(manifest));
  }
  return root;
}

const rootExport = {
  ".": { import: "./dist/index.js", types: "./dist/index.d.ts" },
};
const neutralPackages = {
  "shared/core": { name: "@adapttable/core", exports: rootExport },
  "shared/server": { name: "@adapttable/server", exports: rootExport },
};

describe("base graph discovery", () => {
  it("checks every advertised runtime condition and catches require-only AI leaks", (t) => {
    const root = fixture(t, {
      ...neutralPackages,
      "vue/vue": {
        name: "@adapttable/vue",
        exports: {
          ".": {
            import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
            require: {
              types: "./dist/index.d.cts",
              default: "./dist/index.cjs",
            },
            browser: "./dist/browser.js",
          },
        },
      },
    });
    const dist = join(root, "packages/vue/vue/dist");
    mkdirSync(dist, { recursive: true });
    writeFileSync(join(dist, "index.js"), "export {};\n");
    writeFileSync(join(dist, "browser.js"), "export {};\n");
    writeFileSync(join(dist, "index.cjs"), "require('./helper.cjs');\n");
    writeFileSync(join(dist, "helper.cjs"), "require('@adapttable/ai');\n");
    const graphs = baseGraphPaths(root, []).filter((path) =>
      path.includes("/vue/")
    );
    assert.deepEqual(graphs.sort(), [
      "packages/vue/vue/dist/browser.js",
      "packages/vue/vue/dist/index.cjs",
      "packages/vue/vue/dist/index.js",
    ]);
    const result = checkGraphs(graphs, root);
    assert.deepEqual(result.missing, []);
    assert.ok(
      result.leaked.some(
        (leak) =>
          leak.includes("index.cjs reaches") && leak.includes("@adapttable/ai")
      )
    );
  });

  it("discovers require-only exports and excludes declaration conditions", () => {
    assert.deepEqual(
      moduleEntries({
        types: "./dist/index.d.ts",
        require: { types: "./dist/index.d.cts", default: "./dist/index.cjs" },
        default: "./dist/index.cjs",
      }),
      ["./dist/index.cjs"]
    );
    assert.deepEqual(moduleEntries({ types: "./dist/index.d.ts" }), []);
  });

  it("guards an existing Vue binding before any Vue kit participates", (t) => {
    const root = fixture(t, {
      ...neutralPackages,
      "vue/vue": { name: "@adapttable/vue", exports: rootExport },
      "vue/ai-vue": { name: "@adapttable/ai-vue", exports: rootExport },
    });
    assert.deepEqual(baseGraphPaths(root, []).sort(), [
      "packages/shared/core/dist/index.js",
      "packages/shared/server/dist/index.js",
      "packages/vue/vue/dist/index.js",
    ]);
  });

  it("guards implemented private Vue kits without claiming empty placeholders are built", (t) => {
    const root = fixture(t, {
      ...neutralPackages,
      "vue/vue": { name: "@adapttable/vue", exports: rootExport },
      "vue/adapter-vue-fixture": {
        name: "@adapttable/vue-fixture",
        private: true,
        exports: rootExport,
      },
      "vue/adapter-placeholder": {
        name: "@adapttable/placeholder",
        private: true,
        exports: {},
      },
    });
    const kits = [
      { name: "adapter-vue-fixture", framework: "vue", role: "private" },
      { name: "adapter-placeholder", framework: "vue", role: "private" },
    ];
    assert.deepEqual(baseGraphPaths(root, kits).sort(), [
      "packages/shared/core/dist/index.js",
      "packages/shared/server/dist/index.js",
      "packages/vue/adapter-vue-fixture/dist/index.js",
      "packages/vue/vue/dist/index.js",
    ]);
    assert.deepEqual(
      checkGraphs(baseGraphPaths(root, kits), root).missing.sort(),
      baseGraphPaths(root, kits).sort()
    );
  });

  it("fails on a present binding or participating kit with no root export", (t) => {
    const root = fixture(t, {
      ...neutralPackages,
      "vue/vue": { name: "@adapttable/vue", exports: {} },
    });
    assert.throws(
      () => baseGraphPaths(root, []),
      /No JavaScript root export declared by vue/
    );
    const kitRoot = fixture(t, {
      ...neutralPackages,
      "vue/vue": { name: "@adapttable/vue", exports: rootExport },
      "vue/adapter-vue-fixture": {
        name: "@adapttable/vue-fixture",
        exports: {},
      },
    });
    assert.throws(
      () =>
        baseGraphPaths(kitRoot, [
          { name: "adapter-vue-fixture", framework: "vue", role: "native" },
        ]),
      /No JavaScript root export declared by adapter-vue-fixture/
    );
  });

  it("rejects an AI import hidden in a base graph's helper chunk", (t) => {
    const root = fixture(t, neutralPackages);
    const dir = join(root, "packages/shared/core/dist");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.js"), 'export * from "./helper.js";');
    writeFileSync(
      join(dir, "helper.js"),
      'export { createAgentSession } from "@adapttable/ai";'
    );
    const result = checkGraphs(["packages/shared/core/dist/index.js"], root);
    assert.deepEqual(result.missing, []);
    assert.ok(
      result.leaked.some(
        (leak) => leak.includes("helper.js") && leak.includes("@adapttable/ai")
      ),
      result.leaked.join("\n")
    );
  });

  it("reports an unresolved local graph edge instead of proving a partial graph clean", (t) => {
    const root = fixture(t, neutralPackages);
    const dir = join(root, "packages/shared/core/dist");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "index.js"), 'export * from "./missing.js";');
    const result = checkGraphs(["packages/shared/core/dist/index.js"], root);
    assert.ok(
      result.missing.some((missing) => missing.includes("./missing.js")),
      result.missing.join("\n")
    );
    assert.deepEqual(result.leaked, []);
  });

  it("rejects AI and provider integration markers in Vue base graphs", () => {
    for (const graph of [
      "packages/vue/vue/dist/index.js",
      "packages/vue/adapter-vue-fixture/dist/index.js",
    ]) {
      for (const marker of MARKERS) {
        assert.deepEqual(leaksIn(graph, `export const leaked = "${marker}";`), [
          `${graph} contains ${marker}`,
        ]);
      }
    }
  });
});

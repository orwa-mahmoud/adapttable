import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  checkGraphs,
  GRAPHS,
  leaksIn,
  MARKERS,
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

  it("covers both bindings, every implemented Angular kit, core, server and published React adapters", () => {
    // Exact paths catch a dropped graph, a duplicate or an unintended extra.
    // Private implemented Angular kits still owe proof of AI isolation.
    const expected = [
      "packages/shared/core/dist/index.js",
      "packages/react/react/dist/index.js",
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
    assert.deepEqual([...GRAPHS].sort(), expected.sort());
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

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

  it("covers both bindings, Angular native development, core, server and published adapters", () => {
    // A graph dropped from this list is a graph nobody checks, and the check
    // would still report success over the ones that remain.
    assert.equal(GRAPHS.length, 13);
    assert.ok(
      GRAPHS.includes(
        "packages/angular/angular/dist/fesm2022/adapttable-angular.mjs"
      )
    );
    assert.ok(
      GRAPHS.includes(
        "packages/angular/adapter-angular-unstyled/dist/fesm2022/adapttable-angular-unstyled.mjs"
      )
    );
    assert.ok(!GRAPHS.some((path) => path.includes("ai-angular")));
    for (const path of [
      "packages/shared/core",
      "packages/react/react",
      "packages/shared/server",
    ]) {
      assert.ok(GRAPHS.includes(`${path}/dist/index.js`), path);
    }
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

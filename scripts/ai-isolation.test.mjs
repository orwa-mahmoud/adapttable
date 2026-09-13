import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { checkGraphs, GRAPHS, leaksIn, MARKERS } from "./ai-isolation.mjs";

describe("AI isolation", () => {
  it("names the marker and the graph that carries it", () => {
    const found = leaksIn(
      "packages/react/dist/index.js",
      'import { createAgentSession } from "@adapttable/ai";'
    );
    assert.deepEqual(found, [
      "packages/react/dist/index.js contains createAgentSession",
      "packages/react/dist/index.js contains @adapttable/ai",
    ]);
  });

  it("passes a graph that mentions none of them", () => {
    assert.deepEqual(leaksIn("packages/core/dist/index.js", "export {};"), []);
  });

  it("watches every optional subpath, not only the package name", () => {
    for (const marker of MARKERS) {
      assert.deepEqual(leaksIn("g", `a ${marker} b`), [`g contains ${marker}`]);
    }
  });

  it("covers core, react, server and every published adapter root", () => {
    // A graph dropped from this list is a graph nobody checks, and the check
    // would still report success over the ones that remain.
    assert.equal(GRAPHS.length, 11);
    for (const name of ["core", "react", "server"]) {
      assert.ok(GRAPHS.includes(`packages/${name}/dist/index.js`), name);
    }
  });

  it("treats an unbuilt entry as a failure rather than a graph it skipped", () => {
    // A graph that is not there proves nothing about isolation. Reporting it
    // as clean is how a check keeps passing over a package nobody built.
    const { missing, leaked } = checkGraphs([
      "packages/core/dist/index.js",
      "packages/never-built/dist/index.js",
    ]);
    assert.deepEqual(missing, ["packages/never-built/dist/index.js"]);
    assert.deepEqual(leaked, []);
  });
});

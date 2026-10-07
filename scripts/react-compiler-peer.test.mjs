import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { describe, it } from "node:test";

import { REPO_ROOT } from "./packages.mjs";

function manifest(path) {
  return JSON.parse(readFileSync(join(REPO_ROOT, path), "utf8"));
}

const root = manifest("package.json");
const compilerRange = root.devDependencies["@babel/core"];
const consumers = [
  "apps/showcase",
  ...readdirSync(join(REPO_ROOT, "starters"), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => `starters/${entry.name}`),
].filter(
  (path) =>
    manifest(`${path}/package.json`).devDependencies?.["@vitejs/plugin-react"]
);

describe("React compiler peer support", () => {
  it("keeps the explicitly supported Node floor and root compiler contract", () => {
    assert.equal(root.engines.node, ">=22.12.0");
    assert.match(compilerRange, /^\^7\./);
    assert.equal(consumers.length, 10);
  });

  for (const path of consumers) {
    it(`resolves ${path} through its declared compatible compiler peer`, () => {
      const file = join(REPO_ROOT, path, "package.json");
      assert.equal(
        manifest(`${path}/package.json`).devDependencies["@babel/core"],
        compilerRange
      );
      const consumer = createRequire(file);
      const react = createRequire(consumer.resolve("@vitejs/plugin-react"));
      const compiler = createRequire(react.resolve("@rolldown/plugin-babel"));
      const babel = JSON.parse(
        readFileSync(compiler.resolve("@babel/core/package.json"), "utf8")
      );
      assert.match(babel.version, /^7\./, path);
      // A changed compiler engine contract requires another actual Node-floor
      // build, development-transform and React Refresh proof before adoption.
      assert.equal(babel.engines.node, ">=6.9.0", path);
    });
  }
});

/** Verify docs build caching covers canonical sources and imported dependencies. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, posix, relative, sep } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { docsFiles } from "./docs-files.mjs";
import { walkGraph } from "./module-graph.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  readFileSync(join(ROOT, "apps/docs/turbo.json"), "utf8")
);
const inputs = config.tasks.build.inputs;
const externalInputs = inputs
  .filter((input) => input.startsWith("$TURBO_ROOT$/"))
  .map((input) => input.slice("$TURBO_ROOT$/".length));
const includesExternal = (file) =>
  externalInputs.some((pattern) => posix.matchesGlob(file, pattern));

describe("docs build cache inputs", () => {
  it("keeps package assets and archived snapshots in the inherited build", () => {
    assert.deepEqual(config.extends, ["//"]);
    assert.ok(inputs.includes("$TURBO_DEFAULT$"));
    // $TURBO_DEFAULT$ retains tracked src/, public/ and the archived guides.
    // Only the input inventory changes; root dependencies and dist outputs
    // keep their existing behavior.
    assert.deepEqual(Object.keys(config.tasks.build), ["inputs"]);
    assert.ok(inputs.every((input) => !input.startsWith("!")));
  });

  it("invalidates for canonical markdown and the hand-written LLM index", () => {
    for (const source of docsFiles(join(ROOT, "docs"))) {
      assert.ok(includesExternal(`docs/${source}`), source);
    }
    assert.ok(includesExternal("docs/angular/future-guide.md"));
    assert.ok(includesExternal("llms.txt"));
    assert.ok(includesExternal("scripts/site-notices.mjs"));
    assert.ok(includesExternal("scripts/vue-docs.mjs"));
    assert.ok(includesExternal("scripts/framework-navigation.mjs"));
    assert.ok(includesExternal("scripts/third-party-licenses/manifest.json"));
    assert.ok(includesExternal("scripts/third-party-licenses/future-LICENSE"));
    // sync-docs generates this from the canonical markdown before copying
    // it. Hashing it as an input would invalidate the build on its own output.
    assert.equal(includesExternal("llms-full.txt"), false);
  });

  it("covers the external imports of sync, Astro config and sitemap repair", () => {
    const entries = [
      "apps/docs/sync-docs.mjs",
      "apps/docs/astro.config.mjs",
      "apps/docs/fix-sitemap.mjs",
    ].map((file) => join(ROOT, file));
    const graph = walkGraph(entries, new Map());
    assert.deepEqual([...graph.unresolved], []);
    const externalFiles = [...graph.files]
      .map((file) => relative(ROOT, file).split(sep).join("/"))
      .filter((file) => !file.startsWith("apps/docs/"));
    assert.ok(externalFiles.includes("scripts/angular-docs.mjs"));
    assert.ok(externalFiles.includes("scripts/vue-docs.mjs"));
    assert.ok(externalFiles.includes("apps/showcase/matrix.mjs"));
    for (const file of externalFiles) {
      assert.ok(includesExternal(file), `uncached docs dependency: ${file}`);
    }
  });

  it("does not invalidate docs for unrelated package or tooling sources", () => {
    for (const file of [
      "packages/shared/core/src/index.ts",
      "apps/showcase/src/Demo.tsx",
      "scripts/bench.mjs",
      "e2e/filter-tree.spec.ts",
      "README.md",
    ]) {
      assert.equal(includesExternal(file), false, file);
    }
  });
});

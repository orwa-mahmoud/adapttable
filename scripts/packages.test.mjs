import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { buildPkgDirByName } from "./module-graph.mjs";
import {
  listPackages,
  packageDir,
  packageNames,
  packageRel,
  resolvePackagePath,
} from "./packages.mjs";

describe("framework-independent package discovery", () => {
  it("discovers Vue binding, AI and adapter manifests without inventing missing packages", (t) => {
    const root = mkdtempSync(join(tmpdir(), "adapttable-packages-"));
    t.after(() => rmSync(root, { recursive: true, force: true }));
    const packages = [
      ["shared", "core", "@adapttable/core"],
      ["react", "react", "@adapttable/react"],
      ["angular", "angular", "@adapttable/angular"],
      ["vue", "vue", "@adapttable/vue"],
      ["vue", "ai-vue", "@adapttable/ai-vue"],
      ["vue", "adapter-vue-fixture", "@adapttable/vue-fixture"],
    ];
    for (const [group, folder, name] of packages) {
      const dir = join(root, "packages", group, folder);
      mkdirSync(dir, { recursive: true });
      writeFileSync(join(dir, "package.json"), JSON.stringify({ name }));
    }
    mkdirSync(join(root, "packages/vue/adapter-not-created"));
    const discovered = listPackages(root);
    assert.equal(discovered.length, packages.length);
    assert.deepEqual(
      packageNames(root),
      packages.map(([, folder]) => folder).sort((a, b) => a.localeCompare(b))
    );
    const byPublishedName = buildPkgDirByName(root);
    for (const [group, folder, name] of packages) {
      const dir = join(root, "packages", group, folder);
      assert.equal(packageDir(folder, root), dir);
      assert.equal(packageRel(folder, root), `packages/${group}/${folder}`);
      assert.equal(
        resolvePackagePath(`${folder}/src/index.ts`, root),
        join(dir, "src/index.ts")
      );
      assert.equal(byPublishedName.get(name), dir);
    }
    assert.throws(
      () => packageDir("adapter-not-created", root),
      /no package folder/
    );
  });
});

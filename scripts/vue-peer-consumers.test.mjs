import assert from "node:assert/strict";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  allEntryConsumer,
  builtVueEntries,
  builtVueProfile,
  copyBuiltPackages,
} from "./vue-peer-consumers.mjs";

function workspace(t) {
  const root = mkdtempSync(join(tmpdir(), "vue-built-peer-fixture-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
}
function addPackage(root, folder, name, dependencies = {}) {
  const dir = join(
    root,
    "packages",
    folder === "core" ? "shared" : "vue",
    folder
  );
  mkdirSync(join(dir, "dist"), { recursive: true });
  mkdirSync(join(dir, "src"), { recursive: true });
  writeFileSync(
    join(dir, "src/index.ts"),
    "throw new Error('source must not load');\n"
  );
  const entries = ["index", "features", "future-feature"];
  for (const entry of entries) {
    for (const suffix of ["d.ts", "d.cts"])
      writeFileSync(join(dir, `dist/${entry}.${suffix}`), "export {};\n");
  }
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({
      name,
      dependencies,
      exports: Object.fromEntries([
        ...entries.map((entry) => [
          entry === "index" ? "." : `./${entry}`,
          {
            import: { types: `./dist/${entry}.d.ts` },
            require: { types: `./dist/${entry}.d.cts` },
          },
        ]),
        ["./package.json", "./package.json"],
      ]),
    })
  );
  return dir;
}

describe("built Vue peer consumer isolation", () => {
  it("discovers future feature declarations in both export conditions", (t) => {
    const root = workspace(t);
    const dir = addPackage(root, "vue", "@adapttable/vue");
    const entries = builtVueEntries(dir);
    assert.deepEqual(entries, [
      "@adapttable/vue",
      "@adapttable/vue/features",
      "@adapttable/vue/future-feature",
    ]);
    assert.match(
      allEntryConsumer(entries, false),
      /import \* as entry2 from "@adapttable\/vue\/future-feature"/
    );
    assert.match(
      allEntryConsumer(entries, true),
      /import entry2 = require\("@adapttable\/vue\/future-feature"\)/
    );
    rmSync(join(dir, "dist/future-feature.d.cts"));
    assert.throws(
      () => builtVueEntries(dir),
      /Build.*missing.*future-feature.d.cts/
    );
  });

  it("requires a real nonempty CSS artifact without exempting a CSS-named script", (t) => {
    const root = workspace(t);
    const dir = addPackage(
      root,
      "adapter-vue-unstyled",
      "@adapttable/vue-unstyled"
    );
    const path = join(dir, "package.json");
    const manifest = JSON.parse(readFileSync(path, "utf8"));
    manifest.exports["./styles.css"] = "./dist/styles.css";
    writeFileSync(path, JSON.stringify(manifest));
    assert.throws(() => builtVueEntries(dir), /missing.*styles\.css/);
    writeFileSync(join(dir, "dist/styles.css"), "\n");
    assert.throws(() => builtVueEntries(dir), /empty stylesheet/);
    writeFileSync(
      join(dir, "dist/styles.css"),
      ".native-overlay { background: Canvas; }\n"
    );
    assert.equal(builtVueEntries(dir).length, 3);
    manifest.exports["./styles.css"] = "./dist/styles.js";
    writeFileSync(path, JSON.stringify(manifest));
    assert.throws(() => builtVueEntries(dir), /missing import types/);
  });

  it("copies only built local packages and their dependency closure", (t) => {
    const root = workspace(t);
    addPackage(root, "core", "@adapttable/core");
    addPackage(root, "vue", "@adapttable/vue", { "@adapttable/core": "1.0.0" });
    addPackage(root, "adapter-vue-unstyled", "@adapttable/vue-unstyled", {
      "@adapttable/vue": "1.0.0",
    });
    addPackage(root, "ai-vue", "@adapttable/ai-vue", {
      "@adapttable/vue": "1.0.0",
    });
    const cell = join(root, "cell");
    copyBuiltPackages(cell, root);
    for (const name of ["core", "vue", "vue-unstyled", "ai-vue"]) {
      const copy = join(cell, "node_modules/@adapttable", name);
      assert.equal(existsSync(join(copy, "src")), false);
      assert.equal(
        readFileSync(join(copy, "dist/index.d.cts"), "utf8"),
        "export {};\n"
      );
      assert.equal(existsSync(join(copy, "package.json")), true);
    }
  });

  it("keeps strict clean ESM/SFC, intended-negative and NodeNext consumer profiles", () => {
    for (const mode of ["positive", "negative", "cjs"]) {
      const profile = builtVueProfile("/repository", "/cell", "vue", mode);
      assert.equal(profile.compilerOptions.skipLibCheck, false);
      assert.equal(profile.vueCompilerOptions.strictTemplates, true);
      assert.deepEqual(profile.compilerOptions.paths, {});
      assert.equal(profile.extends, "/repository/tsconfig.base.json");
      if (mode === "cjs") {
        assert.equal(profile.compilerOptions.module, "NodeNext");
        assert.equal(profile.compilerOptions.moduleResolution, "NodeNext");
        assert.deepEqual(profile.include, ["/cell/consumers/*.cts"]);
      } else {
        assert.ok(profile.include.includes("/cell/consumers/all-entries.ts"));
        assert.deepEqual(
          profile.exclude,
          mode === "negative" ? [] : ["/cell/vue/test/types/invalid"]
        );
      }
    }
  });
});

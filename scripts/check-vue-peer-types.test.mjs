import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import {
  publishedVueEntries,
  vueDefaultTemplateProfile,
  vuePeerProfile,
} from "./check-vue-peer-types.mjs";

function fixture(t) {
  const root = mkdtempSync(join(tmpdir(), "vue-peer-profile-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const packageRoot = join(root, "packages/vue/adapter-vue-unstyled");
  mkdirSync(join(packageRoot, "src"), { recursive: true });
  const entries = [
    "index",
    "features",
    "editing",
    "batch-editing",
    "filters",
    "header-filters",
    "future-feature",
  ];
  for (const entry of entries)
    writeFileSync(join(packageRoot, `src/${entry}.ts`), "export {};\n");
  writeFileSync(
    join(packageRoot, "package.json"),
    JSON.stringify({
      exports: Object.fromEntries([
        ...entries.map((entry) => [entry === "index" ? "." : `./${entry}`, {}]),
        ["./package.json", "./package.json"],
      ]),
    })
  );
  return { root, packageRoot, entries };
}

describe("complete Vue peer source profiles", () => {
  it("checks every published entry, including the broad barrel and future exports", (t) => {
    const { packageRoot, entries } = fixture(t);
    assert.deepEqual(
      publishedVueEntries(packageRoot),
      entries.map((entry) => join(packageRoot, `src/${entry}.ts`))
    );
    rmSync(join(packageRoot, "src/future-feature.ts"));
    assert.throws(
      () => publishedVueEntries(packageRoot),
      /Missing published source entry.*future-feature/
    );
  });

  it("preserves strict declarations, template checks and complete consumer coverage at the selected Vue", (t) => {
    const { root, packageRoot } = fixture(t);
    const vueRoot = join(root, "floor/node_modules/vue");
    for (const negative of [false, true]) {
      const profile = vuePeerProfile(root, packageRoot, vueRoot, negative);
      assert.equal(profile.compilerOptions.skipLibCheck, false);
      assert.equal(profile.vueCompilerOptions.strictTemplates, true);
      assert.deepEqual(profile.compilerOptions.paths.vue, [vueRoot]);
      assert.deepEqual(profile.compilerOptions.paths["vue/*"], [
        join(vueRoot, "*"),
      ]);
      assert.deepEqual(profile.files, publishedVueEntries(packageRoot));
      assert.deepEqual(profile.include, [
        join(packageRoot, `test/types/${negative ? "invalid/**/*" : "**/*"}`),
      ]);
      assert.deepEqual(
        profile.exclude,
        negative ? [] : [join(packageRoot, "test/types/invalid")]
      );
    }
  });
});

it("adds the native default-template profile without changing strict contracts", (t) => {
  const { root, packageRoot } = fixture(t);
  const vueRoot = join(root, "floor/node_modules/vue");
  const compatibility = vueDefaultTemplateProfile(root, packageRoot, vueRoot);
  const strict = vuePeerProfile(root, packageRoot, vueRoot, false);
  assert.deepEqual(compatibility.compilerOptions, strict.compilerOptions);
  assert.equal(compatibility.compilerOptions.skipLibCheck, false);
  assert.deepEqual(compatibility.files, strict.files);
  assert.deepEqual(compatibility.include, strict.include);
  assert.deepEqual(compatibility.exclude, strict.exclude);
  assert.deepEqual(compatibility.vueCompilerOptions, {
    dataAttributes: ["data-*"],
  });
  assert.equal(strict.vueCompilerOptions.strictTemplates, true);
  assert.equal(
    vuePeerProfile(root, packageRoot, vueRoot, true).vueCompilerOptions
      .strictTemplates,
    true
  );
});

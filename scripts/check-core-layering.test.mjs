import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { coreLayeringProblems } from "./check-core-layering.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

/** A repository holding one package `name` with `files`, its manifest first. */
function repo(manifest, files = {}) {
  const root = mkdtempSync(join(tmpdir(), "core-layering-"));
  roots.push(root);
  const dir = join(root, "packages", "react", "pkg");
  for (const [path, text] of Object.entries({
    "package.json": JSON.stringify(manifest),
    ...files,
  })) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), text);
  }
  return root;
}

const kit = (fields = {}) => ({
  name: "@adapttable/kit",
  dependencies: { "@adapttable/react": "1.0.0" },
  ...fields,
});

describe("core layering", () => {
  it("passes a package above a binding that reaches core through it", () => {
    const root = repo(kit(), {
      "src/index.ts": 'export { DataTable } from "@adapttable/react";\n',
    });
    assert.deepEqual(coreLayeringProblems(root), []);
  });

  it("fails a core entry in any dependency field", () => {
    for (const field of ["dependencies", "devDependencies"]) {
      const manifest = kit();
      manifest[field] = { ...manifest[field], "@adapttable/core": "3.0.0" };
      assert.deepEqual(coreLayeringProblems(repo(manifest)), [
        `@adapttable/kit: lists @adapttable/core in ${field}`,
      ]);
    }
  });

  it("fails every form of core import, in sources, tests and SFCs", () => {
    const root = repo(kit(), {
      "src/a.ts": 'import { x } from "@adapttable/core";\n',
      "src/b.test.tsx": 'export * from "@adapttable/core/binding";\n',
      "src/c.ts": 'const m = await import("@adapttable/core/engine");\n',
      "src/d.ts": 'type T = import("@adapttable/core").TableSource;\n',
      "src/E.vue":
        '<script setup lang="ts">\nimport type { P } from "@adapttable/core/binding";\n</script>\n',
    });
    assert.deepEqual(coreLayeringProblems(root).length, 5);
  });

  it("ignores core named in strings, configs and built output", () => {
    const root = repo(kit(), {
      "src/fixture.test.ts":
        'const input = `import { DataTable } from "@adapttable/core";`;\n',
      "vitest.config.ts":
        "export default { alias: [{ find: /^@adapttable\\/core$/ }] };\n",
      "dist/index.js": 'import "@adapttable/core";\n',
    });
    assert.deepEqual(coreLayeringProblems(root), []);
  });

  it("leaves packages beside core alone", () => {
    const root = repo(
      { name: "@adapttable/server", dependencies: { "@adapttable/core": "3" } },
      { "src/index.ts": 'import { x } from "@adapttable/core";\n' }
    );
    assert.deepEqual(coreLayeringProblems(root), []);
  });
});

/** Compile the Vue guide examples, including native SFC props and slots. */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { it } from "node:test";

import { REPO_ROOT } from "./packages.mjs";
import { VUE_DOCS } from "./vue-docs.mjs";

// Template fragments share the documented setup; the selection model is
// omitted where that independent feature is not used by the cell-slot example.
function vueExample(code, context, page) {
  const setup = /<script setup[^>]*>[\s\S]*?<\/script>/.exec(code)?.[0];
  if (setup) {
    context.setup = setup;
    return code;
  }
  assert.ok(context.setup, `${page} has no setup for its template`);
  const fragmentSetup = context.setup.replace(
    /^const selectedIds = .*;\n/m,
    ""
  );
  return `${fragmentSetup}\n${code}`;
}

it("compiles every complete Vue example and the documented cell-slot template", () => {
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-vue-docs-"));
  try {
    symlinkSync(
      join(REPO_ROOT, "packages/vue/vue/node_modules"),
      join(scratch, "node_modules"),
      "junction"
    );
    const files = [];
    const sources = [];
    const vueContext = { setup: undefined };
    for (const page of VUE_DOCS) {
      const markdown = readFileSync(join(REPO_ROOT, "docs", page), "utf8");
      let index = 0;
      for (const match of markdown.matchAll(/```(ts|vue)\n([\s\S]*?)```/g)) {
        const [, language, code] = match;
        // Signature-only reference blocks intentionally omit module imports.
        if (language === "ts" && !code.includes("import ")) continue;
        const source =
          language === "vue"
            ? vueExample(code, vueContext, page)
            : code.replaceAll(/^const /gm, "export const ");
        const file = `${basename(page, ".md")}-${++index}.${language}`;
        writeFileSync(join(scratch, file), source);
        files.push(file);
        sources.push(`${file}: docs/${page}`);
      }
      assert.ok(index > 0, `${page} has no checked example`);
    }
    assert.ok(files.some((file) => file.endsWith(".vue")));
    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify({
        extends: join(REPO_ROOT, "tsconfig.base.json"),
        compilerOptions: {
          noEmit: true,
          jsx: "preserve",
          jsxImportSource: "vue",
          paths: {
            vue: [join(REPO_ROOT, "packages/vue/vue/node_modules/vue")],
            "@adapttable/core": [
              join(REPO_ROOT, "packages/shared/core/src/index.ts"),
            ],
            "@adapttable/core/*": [
              join(REPO_ROOT, "packages/shared/core/src/*.ts"),
            ],
            "@adapttable/vue": [
              join(REPO_ROOT, "packages/vue/vue/src/index.ts"),
            ],
            "@adapttable/vue/adapter": [
              join(REPO_ROOT, "packages/vue/vue/src/adapter.ts"),
            ],
            "@adapttable/vue/features": [
              join(REPO_ROOT, "packages/vue/vue/src/features.ts"),
            ],
            "@adapttable/vue-unstyled": [
              join(REPO_ROOT, "packages/vue/adapter-vue-unstyled/src/index.ts"),
            ],
          },
        },
        vueCompilerOptions: {
          strictTemplates: true,
          dataAttributes: ["data-*"],
        },
        files,
        include: [],
      })
    );
    const compiler = join(REPO_ROOT, "node_modules/vue-tsc/bin/vue-tsc.js");
    const result = spawnSync(
      process.execPath,
      [compiler, "-p", join(scratch, "tsconfig.json")],
      { encoding: "utf8", timeout: 120_000, maxBuffer: 8 * 1024 * 1024 }
    );
    const diagnostics = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    const context = `${sources.join("\n")}\n${diagnostics}`;
    assert.ifError(result.error);
    assert.equal(result.signal, null, context);
    assert.equal(result.status, 0, context);
    assert.equal(diagnostics.trim(), "", context);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

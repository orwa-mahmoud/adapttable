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

// Each guide explicitly identifies the earlier setup used by its template
// fragments. Keep that setup intact and local to its own page.
function examplesFromPage(page, markdown) {
  const examples = [];
  let setup;
  for (const match of markdown.matchAll(/```(ts|vue)\n([\s\S]*?)```/g)) {
    const [, language, code] = match;
    // Signature-only reference blocks intentionally omit module imports.
    if (language === "ts" && !code.includes("import ")) continue;
    let source = code;
    if (language === "vue") {
      const currentSetup = /<script setup[^>]*>[\s\S]*?<\/script>/.exec(
        code
      )?.[0];
      if (currentSetup) {
        setup = currentSetup;
      } else {
        assert.ok(setup, `${page} has no setup for its template`);
        const template = /^\s*<template(?:\s|>)/.test(code)
          ? code
          : `<template>\n${code}</template>\n`;
        source = `${setup}\n${template}`;
      }
    } else {
      // Top-level examples expose their results to the host application.
      source = code.replaceAll(/^const /gm, "export const ");
    }
    examples.push({
      file: `${basename(page, ".md")}-${examples.length + 1}.${language}`,
      source,
      page,
    });
  }
  assert.ok(examples.length > 0, `${page} has no checked example`);
  return examples;
}

function documentedExamples() {
  return VUE_DOCS.flatMap((page) =>
    examplesFromPage(page, readFileSync(join(REPO_ROOT, "docs", page), "utf8"))
  );
}

function compileExamples(examples) {
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-vue-docs-"));
  try {
    symlinkSync(
      join(REPO_ROOT, "packages/vue/vue/node_modules"),
      join(scratch, "node_modules"),
      "junction"
    );
    for (const { file, source } of examples) {
      writeFileSync(join(scratch, file), source);
    }
    writeFileSync(
      join(scratch, "tsconfig.json"),
      JSON.stringify({
        extends: join(REPO_ROOT, "tsconfig.base.json"),
        compilerOptions: {
          noEmit: true,
          skipLibCheck: false,
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
            "@adapttable/vue/*": [join(REPO_ROOT, "packages/vue/vue/src/*.ts")],
            "@adapttable/vue-unstyled/*": [
              join(REPO_ROOT, "packages/vue/adapter-vue-unstyled/src/*.ts"),
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
            // Only the optional assistant guide needs this source package.
            "@adapttable/ai-vue": [
              join(REPO_ROOT, "packages/vue/ai-vue/src/index.ts"),
            ],
          },
        },
        vueCompilerOptions: {
          strictTemplates: true,
          dataAttributes: ["data-*"],
        },
        files: examples.map(({ file }) => file),
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
    const sources = examples.map(({ file, page }) => `${file}: docs/${page}`);
    const context = `${sources.join("\n")}\n${diagnostics}`;
    assert.ifError(result.error);
    assert.equal(result.signal, null, context);
    return { status: result.status, diagnostics, context };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

it("compiles every complete Vue guide example and its documented template fragments", (test) => {
  const examples = documentedExamples();
  assert.ok(examples.some(({ file }) => file.endsWith(".vue")));
  const result = compileExamples(examples);
  assert.equal(result.status, 0, result.context);
  assert.equal(result.diagnostics.trim(), "", result.context);
  test.diagnostic(
    `${examples.length} examples across ${VUE_DOCS.length} registered Vue guides`
  );
});

it("keeps template setup on its own page and wraps raw template bodies", () => {
  const setup = '<script setup lang="ts">\nconst label = "Invoice";\n</script>';
  const first = `${setup}\n<template><p>{{ label }}</p></template>`;
  const body = "<strong>{{ label }}</strong>\n";
  const markdown = `\`\`\`vue\n${first}\n\`\`\`\n\`\`\`vue\n${body}\`\`\``;
  const examples = examplesFromPage("first.md", markdown);
  assert.equal(examples.length, 2);
  assert.equal(examples[0].source, `${first}\n`);
  assert.equal(
    examples[1].source,
    `${setup}\n<template>\n${body}</template>\n`
  );
  assert.throws(
    () => examplesFromPage("next.md", `\`\`\`vue\n${body}\`\`\``),
    /next\.md has no setup for its template/
  );
});

it("rejects wrong row, edit callback, footer slot and optional assistant callback types", () => {
  const examples = documentedExamples();
  const cases = [
    {
      original: "getting-started-1.vue",
      file: "WrongRow.vue",
      before: ':row-key="rowKey"',
      after: ':row-key="(row: { id: number }) => String(row.id)"',
      diagnostic: /error TS2322: .*not assignable/,
    },
    {
      original: "getting-started-2.ts",
      file: "WrongEditCallback.ts",
      before: "editing<Person>((row, key, value) =>",
      after: "editing<Person>((row: { id: number }, key, value) =>",
      diagnostic: /error TS2345: .*not assignable/,
    },
    {
      original: "summary-row-2.vue",
      file: "WrongFooterSlot.vue",
      before: "{{ value }}",
      after: "{{ column.missingMember }}",
      diagnostic: /error TS2339: Property 'missingMember' does not exist/,
    },
    {
      original: "assistant-1.vue",
      file: "WrongAssistantCallback.vue",
      before: "attach: (value) =>",
      after: "attach: (value: number) =>",
      diagnostic: /error TS2322: .*not assignable/,
    },
  ];
  const invalid = cases.map(({ original, file, before, after }) => {
    const example = examples.find((candidate) => candidate.file === original);
    assert.ok(example, `missing documented example: ${original}`);
    assert.equal(example.source.split(before).length, 2, original);
    return { ...example, file, source: example.source.replace(before, after) };
  });
  const result = compileExamples(invalid);
  assert.equal(result.status, 2, result.context);
  const diagnostics = result.diagnostics.trim().split("\n");
  for (const { file, diagnostic } of cases) {
    assert.ok(
      diagnostics.some(
        (line) => line.includes(`${file}(`) && diagnostic.test(line)
      ),
      `${file} must fail for its deliberately invalid type:\n${result.context}`
    );
  }
  assert.doesNotMatch(result.diagnostics, /error TS2307:/, result.context);
  for (const line of diagnostics.filter((entry) =>
    entry.includes("error TS")
  )) {
    assert.ok(
      cases.some(({ file }) => line.includes(`${file}(`)),
      `unexpected source diagnostic:\n${result.context}`
    );
  }
});

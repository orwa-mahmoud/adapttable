import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  mkdir,
  mkdtemp,
  readFile,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { lintVuePackage } from "./vue-typed-lint.mjs";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(join(root, "apps/showcase/package.json"));

test("the real Vue declaration bridge resolves a nested showcase SFC without losing its prop contract", async () => {
  const cwd = await mkdtemp(join(root, ".showcase-sfc-types-test-"));
  try {
    const source = join(cwd, "src/vue");
    await mkdir(source, { recursive: true });
    await writeFile(join(cwd, "package.json"), '{"type":"module"}');
    await mkdir(join(cwd, "node_modules"));
    for (const tool of ["eslint", "vue-tsc", "vue", "typescript"]) {
      await symlink(
        dirname(require.resolve(`${tool}/package.json`)),
        join(cwd, "node_modules", tool),
        "dir"
      );
    }
    await writeFile(
      join(cwd, "eslint.config.mjs"),
      `export { default } from ${JSON.stringify(join(root, "eslint.config.mjs"))};\n`
    );
    await writeFile(
      join(source, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          strict: true,
          target: "ES2022",
          module: "ESNext",
          moduleResolution: "Bundler",
          skipLibCheck: true,
          noEmit: true,
          types: [],
          rootDirs: [".", "../../.sfc-types/src/vue"],
        },
        include: ["**/*.ts", "**/*.vue"],
      })
    );
    await writeFile(
      join(source, "Example.vue"),
      '<script setup lang="ts">\ndefineProps<{ count: number }>();\n</script>\n<template><span>{{ count }}</span></template>\n'
    );
    await writeFile(
      join(source, "entry.ts"),
      'import { createApp } from "vue";\n\nimport Example from "./Example.vue";\n\ncreateApp(Example, { count: 1 });\n'
    );
    const eslint = join(
      dirname(require.resolve("eslint/package.json")),
      "bin/eslint.js"
    );
    const before = spawnSync(process.execPath, [eslint, "src/vue/entry.ts"], {
      cwd,
      encoding: "utf8",
    });
    assert.ifError(before.error);
    assert.equal(before.status, 1, before.stdout + before.stderr);
    assert.match(before.stdout, /@typescript-eslint\/no-unsafe-argument/);

    const after = await lintVuePackage({
      cwd,
      tsconfig: "src/vue/tsconfig.json",
      lintArgs: ["src/vue/entry.ts"],
    });
    assert.equal(after, 0);
    const declaration = await readFile(
      join(cwd, ".sfc-types/src/vue/Example.vue.d.ts"),
      "utf8"
    );
    assert.match(declaration, /count: number/);

    await writeFile(
      join(source, "wrong-props.ts"),
      'import Example from "./Example.vue";\ntype Props = InstanceType<typeof Example>["$props"];\nconst wrong: Props = { count: "invalid" };\nvoid wrong;\n'
    );
    const tsc = join(
      dirname(require.resolve("typescript/package.json")),
      "bin/tsc"
    );
    const negative = spawnSync(
      process.execPath,
      [tsc, "--noEmit", "--pretty", "false", "-p", "src/vue/tsconfig.json"],
      { cwd, encoding: "utf8" }
    );
    assert.ifError(negative.error);
    assert.equal(negative.status, 2, negative.stdout + negative.stderr);
    assert.match(
      negative.stdout,
      /TS2322: Type 'string' is not assignable to type 'number'/
    );
    assert.doesNotMatch(negative.stdout, /TS2307|TS7016/);
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
});

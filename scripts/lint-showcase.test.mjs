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
import { afterEach, test } from "node:test";
import { fileURLToPath } from "node:url";

import { ESLint } from "eslint";

import { lintShowcase, showcaseLintGroups } from "./lint-showcase.mjs";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const roots = [];
afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))
  );
});

async function fixture(files = {}) {
  const temporary = join(repositoryRoot, ".turbo", "showcase-lint-tests");
  await mkdir(temporary, { recursive: true });
  const root = await mkdtemp(join(temporary, "fixture "));
  roots.push(root);
  const contents = {
    "package.json": '{"type":"module"}',
    "src/vue/tsconfig.json": JSON.stringify({
      compilerOptions: {
        strict: true,
        target: "ES2022",
        module: "ESNext",
        moduleResolution: "Bundler",
        skipLibCheck: true,
        types: [],
        rootDirs: [".", "../../.sfc-types/src/vue"],
      },
      include: ["**/*.ts", "**/*.vue"],
    }),
    "eslint.config.mjs": `export default [
      { ignores: ["**/dist/**", "**/build/**", "**/.sfc-types/**", "**/*.bundled_*.mjs", "**/ignored.ts"] },
      { files: ["**/*.{js,cjs,mjs,ts,tsx,vue}"], rules: { "no-undef": "error" } }
    ];`,
    ...files,
  };
  for (const [name, content] of Object.entries(contents)) {
    const path = join(root, name);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content);
  }
  const require = createRequire(
    join(repositoryRoot, "apps/showcase/package.json")
  );
  await mkdir(join(root, "node_modules"));
  for (const tool of ["eslint", "vue-tsc", "vue"]) {
    await symlink(
      dirname(require.resolve(`${tool}/package.json`)),
      join(root, "node_modules", tool),
      "dir"
    );
  }
  return root;
}

async function lintFileSet(cwd, options = {}) {
  const { patterns = ["."], ...eslintOptions } = options;
  const results = await new ESLint({
    cwd,
    errorOnUnmatchedPattern: false,
    ...eslintOptions,
  }).lintFiles(patterns);
  return results.map(({ filePath }) => filePath).sort();
}

async function assertPartition(cwd, options = {}) {
  const ordinary = await lintFileSet(cwd, options);
  const groups = await Promise.all(
    showcaseLintGroups.map(({ patterns, ignorePatterns }) =>
      lintFileSet(cwd, { ...options, patterns, ignorePatterns })
    )
  );
  assert.deepEqual(groups.flat().sort(), ordinary);
  assert.equal(new Set(groups.flat()).size, ordinary.length);
  return { ordinary, groups };
}

test("the partition equals ordinary ESLint discovery, including ignores and spaces", async () => {
  const cwd = await fixture({
    "src/React file.tsx": "",
    "src/angular/deep path/Angular file.ts": "",
    "src/angular/deep path/plain file.mjs": "",
    "src/vue/Component file.vue": "",
    "src/vue/entry file.ts": "",
    "src/vue/ordinary.js": "",
    "src/vue/.hidden.ts": "",
    "src/vue/ignored.ts": "missing();",
    "src/angular/dist/broken.ts": "missing();",
    "src/vue/.sfc-types/broken.vue": "missing();",
    "build/broken.mjs": "missing();",
    "transient.bundled_123.mjs": "missing();",
    "README.md": "not JavaScript",
  });
  const { ordinary } = await assertPartition(cwd);
  assert.ok(ordinary.some((path) => path.endsWith("Component file.vue")));
  assert.ok(ordinary.some((path) => path.endsWith(".hidden.ts")));
  assert.ok(
    !ordinary.some((path) => /broken|ignored|bundled|README/.test(path))
  );
});

test("the actual showcase partition preserves ESLint's complete eligible set", async () => {
  const { default: config } = await import("../eslint.config.mjs");
  // Discovery proof only: avoid constructing three typed graphs just to list
  // files. Keep every files/ignores/processor entry unchanged, neutralize rule
  // execution, and parse an empty program. Production always uses real ESLint.
  const parser = {
    parse: () => ({
      type: "Program",
      body: [],
      tokens: [],
      comments: [],
      sourceType: "module",
      range: [0, 0],
      loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 0 } },
    }),
  };
  const discovery = config.map((entry) =>
    entry.rules || entry.languageOptions
      ? {
          ...entry,
          languageOptions: { ...entry.languageOptions, parser },
          rules: Object.fromEntries(
            Object.keys(entry.rules ?? {}).map((name) => [name, "off"])
          ),
        }
      : entry
  );
  const cwd = join(repositoryRoot, "apps/showcase");
  const { ordinary, groups } = await assertPartition(cwd, {
    overrideConfigFile: true,
    overrideConfig: discovery,
  });
  assert.ok(ordinary.length > 0);
  assert.ok(groups.every((group) => group.length > 0));
});

test("empty Angular and Vue groups are harmless", async () => {
  const cwd = await fixture({ "src/plain.js": "" });
  const { groups } = await assertPartition(cwd);
  assert.equal(groups[1].length, 0);
  assert.equal(groups[2].length, 0);
  assert.equal(await lintShowcase({ cwd }), 0);
});

test("an empty React group does not skip an eligible Vue file", async () => {
  const cwd = await fixture({
    "eslint.config.mjs": `export default [
      { ignores: ["**/*.config.mjs"] },
      { files: ["**/*.vue"], rules: { "no-undef": "error" } }
    ];`,
    "src/vue/only file.vue": "<template><div /></template>",
  });
  const { groups } = await assertPartition(cwd);
  assert.equal(groups[0].length, 0);
  assert.equal(groups[1].length, 0);
  assert.equal(groups[2].length, 1);
  assert.equal(await lintShowcase({ cwd }), 1);
});

test("every group runs and any nonzero exit is preserved", async () => {
  const calls = [];
  const statuses = [1, 2, 0];
  const run = (args, cwd) => {
    calls.push({ args, cwd });
    return statuses[calls.length - 1];
  };
  const code = await lintShowcase(
    { cwd: "/showcase", lintArgs: ["--", "--fix"] },
    run,
    run
  );
  assert.equal(code, 2);
  assert.equal(calls.length, 3);
  assert.ok(calls.every((call) => call.args.at(-1) === "--fix"));
  assert.ok(calls.every((call) => call.cwd === "/showcase"));
});

test("custom CLI options keep whole-run semantics", async () => {
  const calls = [];
  const args = ["--max-warnings", "1", "--format", "json"];
  assert.equal(
    await lintShowcase({ lintArgs: args }, undefined, (received) => {
      calls.push(received);
      return 1;
    }),
    1
  );
  assert.deepEqual(calls, [[".", ...args]]);
});

for (const invocation of ["direct", "symlink"]) {
  test(`${invocation} CLI invocation performs real lint and propagates failure`, async () => {
    const cwd = await fixture({
      "src/angular/bad file.js": "missing();",
      "src/vue/good file.vue": "<template><div /></template>",
    });
    const script = fileURLToPath(
      new URL("./lint-showcase.mjs", import.meta.url)
    );
    const entry =
      invocation === "direct" ? script : join(cwd, "linked lint runner.mjs");
    if (invocation === "symlink") await symlink(script, entry);
    const result = spawnSync(process.execPath, [entry], {
      cwd,
      encoding: "utf8",
    });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stdout, /bad file\.js/);
    assert.match(result.stdout, /no-undef/);
    assert.match(result.stdout, /Showcase ESLint: Vue/);
    assert.match(
      await readFile(
        join(cwd, ".sfc-types/src/vue/good file.vue.d.ts"),
        "utf8"
      ),
      /DefineComponent/
    );
  });
}

test("showcase Vue scripts and SFCs retain the same typed parser options", async () => {
  const eslint = new ESLint({ cwd: repositoryRoot });
  for (const name of ["entry-native.ts", "NativeDemo.vue"]) {
    const config = await eslint.calculateConfigForFile(
      `apps/showcase/src/vue/${name}`
    );
    assert.deepEqual(config.languageOptions.parserOptions.extraFileExtensions, [
      ".vue",
    ]);
    assert.equal(config.languageOptions.parserOptions.projectService, true);
    assert.equal(config.rules["@typescript-eslint/no-unsafe-argument"][0], 2);
    assert.equal(config.rules["@typescript-eslint/no-unsafe-return"][0], 2);
  }
  const manifest = JSON.parse(
    await readFile(join(repositoryRoot, "apps/showcase/package.json"), "utf8")
  );
  assert.equal(manifest.scripts.lint, "node ../../scripts/lint-showcase.mjs");
});

#!/usr/bin/env node
/**
 * Check every published binding/native source entry and generic consumer at the
 * installed Vue version and the exact declared peer floor. An existing exact
 * floor installation can be supplied with --vue-root /path/to/node_modules/vue.
 * Otherwise an isolated temporary npm installation supplies the floor.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import ts from "typescript";

import {
  diagnosticProblems,
  invalidFixtures,
  VUE_TYPE_EXPECTATIONS,
} from "./check-vue-types.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const packages = ["vue", "adapter-vue-unstyled"];
const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));

/** Discover exports instead of maintaining a second list of checked barrels. */
export function publishedVueEntries(packageRoot) {
  const manifest = readJson(join(packageRoot, "package.json"));
  return Object.keys(manifest.exports)
    .filter((key) => key !== "./package.json")
    .map((key) => {
      const entry = join(
        packageRoot,
        "src",
        `${key === "." ? "index" : key.slice(2)}.ts`
      );
      assert.ok(existsSync(entry), `Missing published source entry: ${entry}`);
      return entry;
    });
}

export function vuePeerProfile(repository, packageRoot, vueRoot, negative) {
  const fixtureRoot = join(packageRoot, "test/types");
  return {
    extends: join(repository, "tsconfig.base.json"),
    compilerOptions: {
      noEmit: true,
      skipLibCheck: false,
      jsx: "preserve",
      jsxImportSource: "vue",
      types: ["node"],
      typeRoots: [join(repository, "node_modules/@types")],
      paths: {
        vue: [vueRoot],
        "vue/*": [join(vueRoot, "*")],
        ...Object.fromEntries(
          [
            ["@adapttable/core", "shared/core"],
            ["@adapttable/i18n", "shared/i18n"],
            ["@adapttable/vue", "vue/vue"],
            ["@adapttable/vue-unstyled", "vue/adapter-vue-unstyled"],
          ].flatMap(([name, directory]) => [
            [name, [join(repository, "packages", directory, "src/index.ts")]],
            [
              `${name}/*`,
              [join(repository, "packages", directory, "src/*.ts")],
            ],
          ])
        ),
      },
    },
    files: publishedVueEntries(packageRoot),
    include: [join(fixtureRoot, negative ? "invalid/**/*" : "**/*")],
    exclude: negative ? [] : [join(fixtureRoot, "invalid")],
    vueCompilerOptions: { strictTemplates: true, dataAttributes: ["data-*"] },
  };
}

/** A normal Vue app uses the compiler's default props fallback. Keep that
 * compatibility check separate from strict positive and exact negative gates.
 */
export function vueDefaultTemplateProfile(repository, packageRoot, vueRoot) {
  return {
    ...vuePeerProfile(repository, packageRoot, vueRoot, false),
    vueCompilerOptions: { dataAttributes: ["data-*"] },
  };
}

function run(args, cwd) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Process terminated by ${result.signal}`);
  return {
    status: result.status,
    output: `${result.stdout}\n${result.stderr}`,
  };
}

/** Check compiler resolution too: a version label alone is not floor evidence. */
export function verifyVueResolution(
  config,
  probeFile,
  vueRoot,
  expectedVersion
) {
  const parsed = ts.parseJsonConfigFileContent(config, ts.sys, root);
  assert.deepEqual(parsed.errors, []);
  for (const [name, declaration] of [
    ["vue", "dist/vue.d.ts"],
    ["vue/jsx-runtime", "jsx-runtime/index.d.ts"],
  ]) {
    const found = ts.resolveModuleName(name, probeFile, parsed.options, ts.sys);
    if (name === "vue")
      assert.equal(
        found.resolvedModule?.packageId?.version,
        expectedVersion,
        name
      );
    const declarations =
      name === "vue"
        ? [
            declaration,
            readJson(join(vueRoot, "package.json")).exports["."].import.types,
          ]
        : [declaration];
    assert.ok(
      declarations.some(
        (entry) =>
          realpathSync(found.resolvedModule.resolvedFileName) ===
          realpathSync(join(vueRoot, entry))
      ),
      `${name} resolved outside the selected Vue declarations: ${found.resolvedModule.resolvedFileName}`
    );
  }
}

export function declaredFloor() {
  const versions = packages.map((name) => {
    const manifest = readJson(join(root, "packages/vue", name, "package.json"));
    const floor = /^\^(\d+\.\d+\.\d+)$/.exec(
      manifest.peerDependencies.vue
    )?.[1];
    assert.ok(floor, `${manifest.name}: unsupported Vue peer range`);
    return floor;
  });
  assert.equal(new Set(versions).size, 1, "Vue peers disagree on the floor");
  return versions[0];
}

export function installFloor(scratch, version) {
  const npm = join(
    dirname(process.execPath),
    process.platform === "win32" ? "npm.cmd" : "npm"
  );
  writeFileSync(
    join(scratch, "package.json"),
    JSON.stringify({ private: true })
  );
  const result = spawnSync(
    npm,
    [
      "install",
      "--ignore-scripts",
      "--no-audit",
      "--no-fund",
      `vue@${version}`,
    ],
    { cwd: scratch, encoding: "utf8" }
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  return join(scratch, "node_modules/vue");
}

function checkProfile({
  compiler,
  scratch,
  label,
  vueRoot,
  name,
  negative,
  defaultTemplates = false,
}) {
  const version = readJson(join(vueRoot, "package.json")).version;
  const packageRoot = join(root, "packages/vue", name);
  const manifest = readJson(join(packageRoot, "package.json"));
  const profile = defaultTemplates
    ? vueDefaultTemplateProfile(root, packageRoot, vueRoot)
    : vuePeerProfile(root, packageRoot, vueRoot, negative);
  verifyVueResolution(
    profile,
    join(packageRoot, "src/index.ts"),
    vueRoot,
    version
  );
  const polarity = negative ? "negative" : "positive";
  const mode = defaultTemplates ? `default-template-${polarity}` : polarity;
  const configPath = join(scratch, `${label}-${name}-${mode}.json`);
  writeFileSync(configPath, JSON.stringify(profile, null, 2));
  const result = run(
    [
      "--max-old-space-size=2048",
      compiler,
      "--noEmit",
      "--pretty",
      "false",
      "-p",
      configPath,
    ],
    root
  );
  if (negative) {
    const fixtureDir = join(packageRoot, "test/types/invalid");
    const problems = diagnosticProblems({
      files: invalidFixtures(fixtureDir),
      expectations: VUE_TYPE_EXPECTATIONS[manifest.name],
      output: result.output,
      status: result.status,
      cwd: root,
      fixtureDir,
    });
    assert.deepEqual(problems, [], problems.join("\n"));
  } else {
    assert.equal(result.status, 0, result.output);
    assert.equal(result.output.trim(), "");
  }
  const ordinaryLabel = negative ? "exact negative" : "positive";
  const consumerLabel = defaultTemplates
    ? "default-template positive"
    : ordinaryLabel;
  console.log(
    `${manifest.name}: Vue ${version} ${label}, ${profile.files.length} published entries, ${consumerLabel} consumers passed`
  );
}

export function checkVuePeerTypes(floorRoot) {
  const compiler = createRequire(import.meta.url).resolve(
    "vue-tsc/bin/vue-tsc.js"
  );
  const scratch = mkdtempSync(join(tmpdir(), "adapttable-vue-peer-types-"));
  try {
    const version = declaredFloor();
    const minimumRoot = floorRoot ?? installFloor(scratch, version);
    assert.equal(readJson(join(minimumRoot, "package.json")).version, version);
    const currentRoot = realpathSync(
      join(root, "packages/vue/vue/node_modules/vue")
    );
    for (const [label, vueRoot] of [
      ["current", currentRoot],
      ["floor", realpathSync(minimumRoot)],
    ]) {
      for (const name of packages) {
        for (const negative of [false, true]) {
          checkProfile({ compiler, scratch, label, vueRoot, name, negative });
        }
        if (name === "adapter-vue-unstyled")
          checkProfile({
            compiler,
            scratch,
            label,
            vueRoot,
            name,
            negative: false,
            defaultTemplates: true,
          });
      }
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const args = process.argv.slice(2);
  assert.ok(
    args.length === 0 || (args.length === 2 && args[0] === "--vue-root"),
    "Usage: check-vue-peer-types.mjs [--vue-root /path/to/node_modules/vue]"
  );
  checkVuePeerTypes(args[1] && resolve(args[1]));
}

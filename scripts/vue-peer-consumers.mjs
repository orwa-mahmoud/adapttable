/** Isolated built-package consumers for the Vue peer compatibility gates. */
import assert from "node:assert/strict";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { join } from "node:path";

import { listPackages, packageDir, REPO_ROOT } from "./packages.mjs";
import { isVueCssExport } from "./vue-export-kind.mjs";

export const VUE_PACKAGES = ["vue", "adapter-vue-unstyled", "ai-vue"];
export const readJson = (file) => JSON.parse(readFileSync(file, "utf8"));
export const writeJson = (file, value) =>
  writeFileSync(file, JSON.stringify(value, null, 2) + "\n");

/** Every published declaration must exist in both consumer module formats. */
export function builtVueEntries(packageRoot) {
  const manifest = readJson(join(packageRoot, "package.json"));
  return Object.entries(manifest.exports)
    .filter(([key, target]) => {
      if (key === "./package.json") return false;
      if (!isVueCssExport(target)) return true;
      const css = join(packageRoot, target);
      assert.ok(
        existsSync(css),
        `Build ${manifest.name} before checking CSS: missing ${target}`
      );
      assert.ok(
        readFileSync(css, "utf8").trim(),
        `${manifest.name}${key}: empty stylesheet`
      );
      return false;
    })
    .map(([key, entry]) => {
      for (const mode of ["import", "require"]) {
        const file = entry[mode]?.types;
        assert.ok(file, `${manifest.name}${key}: missing ${mode} types`);
        assert.ok(
          existsSync(join(packageRoot, file)),
          `Build ${manifest.name} before checking Vue peers: missing ${file}`
        );
      }
      return manifest.name + (key === "." ? "" : key.slice(1));
    });
}

export function allEntryConsumer(entries, commonjs) {
  return entries
    .map((entry, index) =>
      commonjs
        ? `import entry${index} = require(${JSON.stringify(entry)});\nvoid entry${index};`
        : `import * as entry${index} from ${JSON.stringify(entry)};\nvoid entry${index};`
    )
    .join("\n");
}

function linkDirectory(source, target) {
  mkdirSync(join(target, ".."), { recursive: true });
  if (existsSync(target)) {
    assert.equal(realpathSync(target), realpathSync(source));
    return;
  }
  symlinkSync(realpathSync(source), target, "junction");
}

/** Copy built local dependencies; their source trees cannot resolve in the cell. */
export function copyBuiltPackages(cell, repository = REPO_ROOT) {
  const registry = new Map(
    listPackages(repository).map(({ dir }) => [
      readJson(join(dir, "package.json")).name,
      dir,
    ])
  );
  const copied = new Set();
  function copyPackage(name) {
    if (copied.has(name)) return;
    const source = registry.get(name);
    assert.ok(source, `Missing workspace package: ${name}`);
    const manifest = readJson(join(source, "package.json"));
    assert.ok(existsSync(join(source, "dist")), `Build ${name} first`);
    const target = join(cell, "node_modules", name);
    mkdirSync(target, { recursive: true });
    cpSync(join(source, "package.json"), join(target, "package.json"));
    cpSync(join(source, "dist"), join(target, "dist"), { recursive: true });
    copied.add(name);
    for (const dependency of Object.keys(manifest.dependencies ?? {})) {
      if (registry.has(dependency)) copyPackage(dependency);
      else if (dependency !== "vue")
        linkDirectory(
          join(source, "node_modules", dependency),
          join(cell, "node_modules", dependency)
        );
    }
  }
  for (const name of VUE_PACKAGES) {
    const source = packageDir(name, repository);
    copyPackage(readJson(join(source, "package.json")).name);
  }
}

export function prepareVueCell(cell, vueRoot, repository = REPO_ROOT) {
  mkdirSync(cell, { recursive: true });
  writeJson(join(cell, "package.json"), { private: true, type: "module" });
  copyBuiltPackages(cell, repository);
  linkDirectory(vueRoot, join(cell, "node_modules/vue"));
  linkDirectory(
    join(repository, "node_modules/vitest"),
    join(cell, "node_modules/vitest")
  );
  linkDirectory(
    join(repository, "node_modules/@types"),
    join(cell, "node_modules/@types")
  );
  for (const name of VUE_PACKAGES) {
    const source = packageDir(name, repository);
    for (const folder of ["types", "fixtures"]) {
      const fixtures = join(source, "test", folder);
      if (existsSync(fixtures))
        cpSync(fixtures, join(cell, name, "test", folder), { recursive: true });
    }
  }
  cpSync(
    join(repository, "scripts/vue-peer-consumer-fixtures"),
    join(cell, "consumers"),
    { recursive: true }
  );
  writeJson(join(cell, "consumers/tsconfig.json"), {
    extends: join(repository, "tsconfig.base.json"),
    compilerOptions: { noEmit: true, skipLibCheck: false, paths: {} },
  });
  const entries = VUE_PACKAGES.flatMap((name) =>
    builtVueEntries(
      join(
        cell,
        "node_modules",
        readJson(join(packageDir(name, repository), "package.json")).name
      )
    )
  );
  for (const [suffix, commonjs] of [
    ["ts", false],
    ["cts", true],
  ])
    writeFileSync(
      join(cell, `consumers/all-entries.${suffix}`),
      allEntryConsumer(entries, commonjs)
    );
  return entries;
}

export function builtVueProfile(repository, cell, name, mode) {
  const negative = mode === "negative";
  const commonjs = mode === "cjs";
  return {
    extends: join(repository, "tsconfig.base.json"),
    compilerOptions: {
      noEmit: true,
      skipLibCheck: false,
      jsx: "preserve",
      jsxImportSource: "vue",
      types: ["node"],
      paths: {},
      ...(commonjs ? { module: "NodeNext", moduleResolution: "NodeNext" } : {}),
    },
    vueCompilerOptions: { strictTemplates: true, dataAttributes: ["data-*"] },
    include: commonjs
      ? [join(cell, "consumers/*.cts")]
      : [
          join(cell, name, `test/types/${negative ? "invalid/**/*" : "**/*"}`),
          join(cell, "consumers/all-entries.ts"),
          ...(negative ? [] : [join(cell, "consumers/*.vue")]),
        ],
    exclude:
      negative || commonjs ? [] : [join(cell, name, "test/types/invalid")],
  };
}

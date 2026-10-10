import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, resolve, sep } from "node:path";
import { describe, it } from "node:test";

import ts from "typescript";

import { packageDir } from "./packages.mjs";

const dir = packageDir("angular");
const manifest = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
const config = ts.readConfigFile(join(dir, "tsconfig.json"), ts.sys.readFile);
assert.equal(config.error, undefined);
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, dir);
assert.deepEqual(parsed.errors, []);

// A prior build must not make this regression pass. Hide only this package's
// output from TypeScript, without moving files or racing another gate's build.
const dist = resolve(dir, "dist");
const isDist = (file) => {
  const absolute = resolve(file);
  // Workspace consumers may reach this dist through a package-manager symlink.
  const canonical = ts.sys.realpath?.(absolute) ?? absolute;
  return canonical === dist || canonical.startsWith(`${dist}${sep}`);
};
const host = {
  ...ts.sys,
  fileExists: (file) => !isDist(file) && ts.sys.fileExists(file),
  directoryExists: (file) => !isDist(file) && ts.sys.directoryExists(file),
  readFile: (file) => (isDist(file) ? undefined : ts.sys.readFile(file)),
};
const importer = join(dir, "formula", "formulaUrlState.ts");

describe("Angular self-package resolution before a build", () => {
  for (const subpath of Object.keys(manifest.exports).filter(
    (key) => key !== "./package.json"
  )) {
    const specifier = manifest.name + (subpath === "." ? "" : subpath.slice(1));
    it(`resolves ${specifier} to its source entry`, () => {
      const entryDir = subpath === "." ? dir : join(dir, subpath);
      const entry = JSON.parse(
        readFileSync(join(entryDir, "ng-package.json"), "utf8")
      );
      const result = ts.resolveModuleName(
        specifier,
        importer,
        parsed.options,
        host
      );
      assert.equal(
        result.resolvedModule?.resolvedFileName,
        resolve(entryDir, entry.lib.entryFile)
      );
    });
  }

  it("cannot fall back to built declarations when source mappings are absent", () => {
    const options = { ...parsed.options, paths: {} };
    const result = ts.resolveModuleName(manifest.name, importer, options, host);
    assert.equal(result.resolvedModule, undefined);
  });
});

// These kits intentionally exercise the binding source through Vite aliases.
// TypeScript must resolve those same public entries before any dist exists.
describe("Bootstrap kit binding source resolution", () => {
  for (const kit of ["adapter-ng-bootstrap", "adapter-ngx-bootstrap"]) {
    const kitRoot = packageDir(kit);
    const config = ts.readConfigFile(
      join(kitRoot, "tsconfig.spec.json"),
      ts.sys.readFile
    );
    assert.equal(config.error, undefined);
    const parsed = ts.parseJsonConfigFileContent(
      config.config,
      ts.sys,
      kitRoot
    );
    assert.deepEqual(parsed.errors, []);
    for (const subpath of Object.keys(manifest.exports).filter(
      (key) => key !== "./package.json"
    )) {
      const specifier =
        manifest.name + (subpath === "." ? "" : subpath.slice(1));
      it(`${kit} resolves ${specifier} to the same source as its Vite alias`, () => {
        const entryDir = subpath === "." ? dir : join(dir, subpath);
        const entry = JSON.parse(
          readFileSync(join(entryDir, "ng-package.json"), "utf8")
        );
        const result = ts.resolveModuleName(
          specifier,
          join(kitRoot, "src/dataTable.ts"),
          parsed.options,
          host
        );
        assert.equal(
          result.resolvedModule?.resolvedFileName,
          resolve(entryDir, entry.lib.entryFile)
        );
      });
    }
    for (const subpath of ["features", "adapter"]) {
      it(`${kit} rejects its old wildcard fallback for ${subpath}`, () => {
        const specifier = `${manifest.name}/${subpath}`;
        const paths = { ...parsed.options.paths };
        delete paths[specifier];
        const result = ts.resolveModuleName(
          specifier,
          join(kitRoot, "src/dataTable.ts"),
          { ...parsed.options, paths },
          host
        );
        assert.equal(result.resolvedModule, undefined);
      });
    }
  }
});

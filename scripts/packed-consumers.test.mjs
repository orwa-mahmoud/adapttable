import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, describe, it } from "node:test";
import { gzipSync } from "node:zlib";

import { measure, resolutionProblems } from "./bundle-budget.mjs";
import {
  declarationProblems,
  exportSpecifier,
  installPacked,
  nodeConsumerProblems,
  packedModules,
  tarballFiles,
} from "./packed-consumers.mjs";

let scratch;

before(() => {
  scratch = mkdtempSync(join(tmpdir(), "adapttable-packed-test-"));
});

after(() => {
  rmSync(scratch, { recursive: true, force: true });
});

function octal(value, length) {
  return `${value.toString(8).padStart(length - 1, "0")}\0`;
}

/** A gzipped ustar archive holding `entries` ({ path, body, type }). */
function tarball(name, entries) {
  const blocks = [];
  for (const { path, body = "", type = "0" } of entries) {
    const content = Buffer.from(body);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100);
    header.write(octal(0o644, 8), 100);
    header.write(octal(0, 8), 108);
    header.write(octal(0, 8), 116);
    header.write(octal(content.length, 12), 124);
    header.write(octal(0, 12), 136);
    header.write("        ", 148);
    header.write(type, 156);
    header.write("ustar\0", 257);
    header.write("00", 263);
    let sum = 0;
    for (const byte of header) sum += byte;
    header.write(octal(sum, 7), 148);
    blocks.push(header, content);
    const padding = (512 - (content.length % 512)) % 512;
    blocks.push(Buffer.alloc(padding));
  }
  blocks.push(Buffer.alloc(1024));
  const file = join(scratch, `${name.replaceAll("/", "-")}.tgz`);
  writeFileSync(file, gzipSync(Buffer.concat(blocks)));
  return file;
}

/** A packed `@adapttable/fake` whose workspace build holds more than it ships. */
function fakePack(files, exports) {
  const manifest = {
    name: "@adapttable/fake",
    version: "1.0.0",
    type: "module",
    exports,
  };
  const workspace = mkdtempSync(join(scratch, "workspace-"));
  mkdirSync(join(workspace, "dist"));
  for (const [path, body] of Object.entries(files)) {
    writeFileSync(join(workspace, "dist", path), body);
  }
  // The workspace build also has a file the tarball's exports never name.
  writeFileSync(
    join(workspace, "dist", "unlisted.js"),
    "export const unlisted = 1;"
  );
  return {
    folder: "fake",
    dir: workspace,
    name: manifest.name,
    file: tarball(manifest.name, [
      { path: "package/package.json", body: JSON.stringify(manifest) },
      ...Object.entries(files).map(([path, body]) => ({
        path: `package/dist/${path}`,
        body,
      })),
    ]),
  };
}

function consumer(packs, options) {
  const dir = mkdtempSync(join(scratch, "consumer-"));
  const manifests = installPacked(packs, dir, options);
  return {
    dir,
    specifier: (_folder, file) =>
      exportSpecifier(manifests.get("@adapttable/fake"), file),
  };
}

const ROOT_EXPORT = {
  ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
};

describe("packed tarballs", () => {
  it("reads regular files and refuses a path outside the package", () => {
    const good = tarball("good", [
      { path: "package/dist/index.js", body: "export {};" },
      { path: "package/dist", type: "5" },
    ]);
    assert.deepEqual([...tarballFiles(good).keys()], ["dist/index.js"]);
    const evil = tarball("evil", [{ path: "package/../escape.js", body: "x" }]);
    assert.throws(() => tarballFiles(evil), /outside its package/);
  });

  it("maps a dist file to the specifier its exports map publishes", () => {
    const manifest = {
      name: "@adapttable/kit",
      exports: {
        ".": {
          import: { types: "./dist/index.d.ts", default: "./dist/index.js" },
        },
        "./grouping": { import: "./dist/grouping.js" },
        "./styles.css": "./dist/styles.css",
      },
    };
    assert.equal(exportSpecifier(manifest, "index.js"), "@adapttable/kit");
    assert.equal(
      exportSpecifier(manifest, "grouping.js"),
      "@adapttable/kit/grouping"
    );
    assert.equal(
      exportSpecifier(manifest, "styles.css"),
      "@adapttable/kit/styles.css"
    );
    assert.throws(
      () => exportSpecifier(manifest, "unlisted.js"),
      /publishes no export for dist\/unlisted\.js/
    );
  });

  it("fails a consumer of a missing export even though the workspace file exists", async () => {
    const pack = fakePack(
      { "index.js": "export const shipped = 1;" },
      ROOT_EXPORT
    );
    const install = consumer([pack]);
    assert.throws(
      () => install.specifier("fake", "unlisted.js"),
      /publishes no export/
    );
    await assert.rejects(
      measure(
        {
          name: "direct import of an unexported file",
          pkg: "fake",
          code: 'export { unlisted } from "@adapttable/fake/unlisted";',
        },
        install.dir,
        install
      ),
      /Could not resolve '@adapttable\/fake\/unlisted'/
    );
  });

  it("fails a consumer of a package the install does not hold", async () => {
    const install = consumer([
      fakePack({ "index.js": "export const shipped = 1;" }, ROOT_EXPORT),
    ]);
    const measured = await measure(
      {
        name: "package that never shipped",
        pkg: "fake",
        code: 'export { absent } from "@adapttable/absent";',
      },
      install.dir,
      install
    );
    assert.deepEqual(resolutionProblems({}, measured), [
      "did not resolve from the tarballs: @adapttable/absent",
    ]);
  });

  it("records the packed files a graph resolved and nothing from the workspace", async () => {
    const pack = fakePack(
      {
        "index.js": 'export { shipped } from "./part.js";',
        "part.js": "export const shipped = 1;",
      },
      ROOT_EXPORT
    );
    const install = consumer([pack]);
    const measured = await measure(
      { name: "packed", pkg: "fake", code: 'export { shipped } from "PKG";' },
      install.dir,
      install
    );
    assert.deepEqual(measured.entryImports, ["@adapttable/fake"]);
    assert.deepEqual(measured.resolvedFiles, [
      "node_modules/@adapttable/fake/dist/index.js",
      "node_modules/@adapttable/fake/dist/part.js",
    ]);
    assert.deepEqual(measured.unpackedFiles, []);
    assert.deepEqual(resolutionProblems({}, measured), []);
  });

  it("splits packed modules from workspace package files", () => {
    const pack = fakePack({ "index.js": "export {};" }, ROOT_EXPORT);
    const install = consumer([pack]);
    const root = mkdtempSync(join(scratch, "repository-"));
    const source = join(root, "packages", "shared", "core", "src", "index.ts");
    mkdirSync(join(source, ".."), { recursive: true });
    writeFileSync(source, "export {};");
    const packed = join(
      install.dir,
      "node_modules",
      "@adapttable",
      "fake",
      "dist",
      "index.js"
    );
    assert.deepEqual(
      packedModules([packed, source, "\0virtual"], install.dir, root),
      {
        files: ["node_modules/@adapttable/fake/dist/index.js"],
        unpacked: ["packages/shared/core/src/index.ts"],
      }
    );
  });

  it("fails a type-only consumer that reached runtime modules", () => {
    const measured = {
      unpackedFiles: [],
      externalImports: [],
      resolvedFiles: ["node_modules/@adapttable/core/dist/index.js"],
    };
    assert.match(
      resolutionProblems({ typeOnly: true }, measured)[0],
      /type-only import reached runtime modules/
    );
    assert.deepEqual(resolutionProblems({}, measured), []);
  });

  it("fails the declaration consumer when the tarball ships no .d.ts", () => {
    const withTypes = fakePack(
      {
        "index.js": "export const shipped = 1;",
        "index.d.ts": "export declare const shipped: number;",
      },
      ROOT_EXPORT
    );
    const typed = consumer([withTypes]);
    const ok = declarationProblems(typed.dir, [
      { id: "typed", code: 'export { shipped } from "@adapttable/fake";' },
    ]);
    assert.deepEqual(ok.get("typed"), []);

    const untyped = consumer([
      fakePack({ "index.js": "export const shipped = 1;" }, ROOT_EXPORT),
    ]);
    const missing = declarationProblems(untyped.dir, [
      { id: "untyped", code: 'export { shipped } from "@adapttable/fake";' },
    ]);
    assert.equal(missing.get("untyped").length, 1);
    assert.match(missing.get("untyped")[0], /^TS70\d\d: /);
  });

  it("runs Node consumers with no framework installed and fails one that needs it", () => {
    const neutral = fakePack(
      { "index.js": "export const parse = (value) => value.trim();" },
      ROOT_EXPORT
    );
    assert.deepEqual(
      nodeConsumerProblems(
        [neutral],
        'import { parse } from "@adapttable/fake";\nif (parse(" a ") !== "a") throw new Error("parse");'
      ),
      []
    );
    const framework = fakePack(
      { "index.js": 'export { useState } from "react";' },
      ROOT_EXPORT
    );
    const [problem] = nodeConsumerProblems(
      [framework],
      'import "@adapttable/fake";'
    );
    assert.match(problem, /ERR_MODULE_NOT_FOUND|Cannot find package 'react'/);
  });

  it("requires every third-party dependency a packed manifest declares", () => {
    const manifest = {
      name: "@adapttable/needy",
      version: "1.0.0",
      dependencies: { "adapttable-no-such-package": "1.0.0" },
    };
    const pack = {
      folder: "needy",
      dir: scratch,
      name: manifest.name,
      file: tarball(manifest.name, [
        { path: "package/package.json", body: JSON.stringify(manifest) },
      ]),
    };
    assert.throws(
      () => installPacked([pack], mkdtempSync(join(scratch, "needy-"))),
      /adapttable-no-such-package is required/
    );
  });
});

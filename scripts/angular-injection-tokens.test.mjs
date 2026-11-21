/**
 * Every Angular injection token the packages ship is constructed once.
 *
 * ng-packagr bundles each entry with a copy of every module it reaches by a
 * relative import. A token constructed in two bundles is two tokens: a part
 * that provides one copy is invisible to a part that injects the other.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { packageDir } from "./packages.mjs";

const TOKEN =
  /new InjectionToken\(\s*("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`[^`]*`)/g;

/** Each token description and the bundles of one package that construct it. */
export function tokenOwners(bundles) {
  const owners = new Map();
  for (const [file, code] of bundles) {
    for (const match of code.matchAll(TOKEN)) {
      const files = owners.get(match[1]) ?? new Set();
      files.add(file);
      owners.set(match[1], files);
    }
  }
  return owners;
}

function fesmBundles(pkg) {
  const dir = join(packageDir(pkg), "dist", "fesm2022");
  if (!existsSync(dir)) return undefined;
  return readdirSync(dir)
    .filter((file) => file.endsWith(".mjs"))
    .map((file) => [file, readFileSync(join(dir, file), "utf8")]);
}

describe("Angular injection tokens", () => {
  it("finds a token constructed by two bundles", () => {
    const code = 'const T = new InjectionToken("table store");';
    const owners = tokenOwners([
      ["main.mjs", code],
      ["adapter.mjs", code],
    ]);
    assert.deepEqual(
      [...owners.get('"table store"')],
      ["main.mjs", "adapter.mjs"]
    );
  });

  const bundles = fesmBundles("angular");
  it(
    "constructs each binding token in exactly one bundle",
    { skip: bundles ? false : "needs @adapttable/angular built" },
    () => {
      const shared = [...tokenOwners(bundles)]
        .filter(([, files]) => files.size > 1)
        .map(([name, files]) => `${name}: ${[...files].join(", ")}`);
      assert.deepEqual(shared, []);
    }
  );
});

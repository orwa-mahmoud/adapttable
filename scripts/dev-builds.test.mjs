/**
 * Each package with a development build ships its warnings only there.
 *
 * The production files are the default export condition and call no
 * `devWarn`; the files under `dist/dev`, the `development` condition, still
 * do, so a developer sees every warning and an application ships none.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

import { packageDir } from "./packages.mjs";

const PACKAGES = ["core", "react", "vue"];

/** `devWarn(…)` calls, not the function's own declaration. */
export function warningCalls(code) {
  return [...code.matchAll(/(?<!function )\bdevWarn\(/g)].length;
}

function callsIn(dir) {
  return readdirSync(dir)
    .filter((file) => /\.(c?js)$/.test(file))
    .reduce(
      (sum, file) => sum + warningCalls(readFileSync(join(dir, file), "utf8")),
      0
    );
}

describe("development builds", () => {
  it("counts calls, not the declaration", () => {
    assert.equal(
      warningCalls("function devWarn(m) {}\nif (x) devWarn('a');"),
      1
    );
  });

  for (const pkg of PACKAGES) {
    const dist = join(packageDir(pkg), "dist");
    it(
      `${pkg}: production calls no devWarn, development keeps them`,
      { skip: existsSync(join(dist, "dev")) ? false : `needs ${pkg} built` },
      () => {
        assert.equal(callsIn(dist), 0);
        assert.ok(callsIn(join(dist, "dev")) > 0);
      }
    );
  }
});

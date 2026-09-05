import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  buildPackageSplitMap,
  representativeExamplesAgree,
  splitMapErrors,
} from "./package-split-map.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("v3 package-split map", () => {
  it("covers the committed contract and the four representative consumers", () => {
    const map = buildPackageSplitMap();
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "etc", "api-contract.json"), "utf8")
    );
    assert.deepEqual(splitMapErrors(map, manifest), []);
    assert.deepEqual(representativeExamplesAgree(map), []);
  });

  it("matches the committed map bytes for the generated symbol set", () => {
    const generated = buildPackageSplitMap();
    const committed = JSON.parse(
      readFileSync(join(ROOT, "scripts", "v3-package-split-map.json"), "utf8")
    );
    assert.equal(committed.symbols.length, generated.symbols.length);
    assert.deepEqual(committed.symbols, generated.symbols);
  });

  it("is wired into the library check", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    assert.match(pkg.scripts.check, /pnpm run check:package-split/);
    assert.match(pkg.scripts["verify:release"], /pnpm run check:package-split/);
  });
});

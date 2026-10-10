import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { gateSteps } from "./gate-graph.mjs";
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

  it("keeps edit settlement types on their neutral core entry points", () => {
    const map = buildPackageSplitMap();
    const manifest = JSON.parse(
      readFileSync(join(ROOT, "etc", "api-contract.json"), "utf8")
    );
    const settlementTypes = [
      "EditCommitSnapshot",
      "EditCommitValidationFailure",
      "EditCommitValidationOptions",
    ];
    for (const [surface, currentImport, names] of [
      ["core", "@adapttable/core", settlementTypes],
      [
        "core-binding",
        "@adapttable/core/binding",
        [...settlementTypes, "EditableColumnLike", "RowValidator"],
      ],
    ]) {
      assert.ok(manifest.frameworks.neutral.includes(surface), surface);
      for (const name of names) {
        assert.ok(manifest.surfaces[surface].includes(name), name);
        assert.deepEqual(
          map.symbols.filter(
            (row) => row.currentImport === currentImport && row.export === name
          ),
          [
            {
              export: name,
              currentImport,
              kind: "type",
              class: "neutral-model",
              proposedImport: currentImport,
              behavior: "",
            },
          ]
        );
      }
    }
  });

  it("is wired into the library check", () => {
    const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf8"));
    assert.ok(gateSteps(pkg.scripts, "check").has("check:package-split"));
    assert.ok(
      gateSteps(pkg.scripts, "verify:release").has("check:package-split")
    );
  });
});

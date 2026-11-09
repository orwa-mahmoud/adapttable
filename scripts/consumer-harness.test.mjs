import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { HARNESS_CASES, selectedHarnessCases } from "./consumer-harness.mjs";
import { extendedDiagnostics, TYPING_EXAMPLES } from "./consumer-typing.mjs";

describe("consumer harness cases", () => {
  it("runs every case by default, in order", () => {
    assert.deepEqual(HARNESS_CASES, [
      "resolution",
      "pnpm",
      "react-free",
      "vite",
      "next",
      "typing",
    ]);
    assert.deepEqual(selectedHarnessCases([]), HARNESS_CASES);
  });

  it("runs only the named cases, in run order", () => {
    assert.deepEqual(
      selectedHarnessCases(["--case", "typing", "--case=react-free"]),
      ["react-free", "typing"]
    );
  });

  it("refuses an unknown or empty case", () => {
    assert.throws(
      () => selectedHarnessCases(["--case", "storybook"]),
      /Unknown --case storybook/
    );
    assert.throws(() => selectedHarnessCases(["--case"]), /needs a case ID/);
  });
});

describe("typing baseline", () => {
  it("has one compact typed example per framework, each from its kit's public entries", () => {
    assert.deepEqual(
      TYPING_EXAMPLES.map((example) => example.id),
      ["react", "angular", "vue"]
    );
    for (const example of TYPING_EXAMPLES) {
      assert.match(example.code, /interface Person/);
      assert.match(example.code, /ColumnDef<Person>\[\]/);
      assert.match(example.code, /\/cell-navigation"/);
      assert.doesNotMatch(example.code, /dist\/|packages\//);
      assert.ok(example.code.split("\n").length < 60, example.id);
    }
  });

  it("reads the compiler's extended diagnostics", () => {
    const output = [
      "Files:                          90",
      "Lines of TypeScript:            28",
      "Types:                        1959",
      "Instantiations:               4914",
      "Memory used:                114142K",
      "Check time:                   0.06s",
      "Total time:                   0.38s",
    ].join("\n");
    assert.deepEqual(extendedDiagnostics(output), {
      files: 90,
      typescriptLines: 28,
      types: 1959,
      instantiations: 4914,
      memoryKB: 114142,
      checkSeconds: 0.06,
      totalSeconds: 0.38,
    });
    assert.throws(
      () => extendedDiagnostics("Files: 3"),
      /no types, instantiations, memoryKB, checkSeconds figure/
    );
  });
});

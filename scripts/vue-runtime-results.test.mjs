import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";

import {
  assertVueRuntimeCases,
  assertVueRuntimeCells,
} from "./vue-runtime-results.mjs";

const root = resolve("runtime-fixture");
const partsFile = "packages/vue/adapter-vue-unstyled/test/parts.test.ts";
const tableFile = "packages/vue/vue/test/tableParts.test.ts";
const versionFile = "scripts/vue-peer-consumer-fixtures/version.test.ts";
const builtFile = "consumers/runtime.test.ts";
const passed = (fullName) => ({ fullName, status: "passed" });
const result = (file, names) => ({
  name: resolve(root, file),
  status: "passed",
  assertionResults: names.map(passed),
});
const nativeCases = [
  "native canonical semantic parts places search, selection and scroll parts on the real native elements while retaining classNames keys",
];
const packedCases = [
  "packed DataTable canonical native targets retains marker, tag and class ownership for basic columns",
  "packed DataTable canonical native targets retains marker, tag and class ownership for grouped columns",
];
for (const part of ["table", "header-cell", "cell"]) {
  for (const fault of ["marker", "target", "class"]) {
    nativeCases.push(
      `native canonical semantic parts rejects a wrong '${fault}' on the native '${part}' target`
    );
    for (const mode of ["basic", "grouped"])
      packedCases.push(
        `packed DataTable canonical native targets rejects a wrong '${fault}' for '${part}' in the packed '${mode}' table`
      );
  }
}
function report(cell) {
  const testResults =
    cell === "source"
      ? [
          result(tableFile, [
            "places canonical basic and mobile parts on semantic targets with kit first",
            "places canonical basic and mobile parts on semantic targets with kit second",
            "distinguishes spanning group bands from the leaf header row",
          ]),
          result(partsFile, nativeCases),
          result(versionFile, ["runs the selected Vue runtime"]),
        ]
      : [result(builtFile, packedCases)];
  return {
    success: true,
    numTotalTests: cell === "source" ? 14 : 20,
    testResults,
  };
}

for (const cell of ["source", "built"]) {
  test(`${cell}: accepts every required passing case`, () => {
    const value = report(cell);
    assert.equal(
      value.testResults.reduce(
        (count, entry) => count + entry.assertionResults.length,
        0
      ),
      value.numTotalTests
    );
    assertVueRuntimeCases(value, root, cell);
  });

  test(`${cell}: permits additional ordinary suite cases`, () => {
    const value = report(cell);
    value.testResults[0].assertionResults.push(passed("another scenario"));
    value.testResults.push(result("other.test.ts", ["another module"]));
    value.numTotalTests += 2;
    assert.doesNotThrow(() => assertVueRuntimeCases(value, root, cell));
  });

  test(`${cell}: rejects unsuccessful, empty or malformed reports`, () => {
    for (const value of [
      undefined,
      {},
      { ...report(cell), success: false },
      { ...report(cell), numTotalTests: 0 },
      { ...report(cell), numTotalTests: -1 },
      { ...report(cell), testResults: [] },
      { ...report(cell), testResults: undefined },
    ])
      assert.throws(() => assertVueRuntimeCases(value, root, cell));
  });

  for (const [moduleIndex, module] of report(cell).testResults.entries()) {
    test(`${cell}: requires the exact absolute module ${module.name}`, () => {
      for (const name of [
        module.name + ".other",
        resolve(root, "other", module.name.slice(root.length + 1)),
        module.name.slice(root.length + 1),
        resolve(root, "..", "outside", module.name.slice(root.length + 1)),
      ]) {
        const value = report(cell);
        value.testResults[moduleIndex].name = name;
        assert.throws(() => assertVueRuntimeCases(value, root, cell));
      }
    });

    test(`${cell}: rejects absent, duplicate or failed ${module.name}`, () => {
      const missing = report(cell);
      missing.testResults.splice(moduleIndex, 1);
      assert.throws(() => assertVueRuntimeCases(missing, root, cell));
      const duplicate = report(cell);
      duplicate.testResults.push(structuredClone(module));
      assert.throws(() => assertVueRuntimeCases(duplicate, root, cell));
      for (const status of [
        "failed",
        "skipped",
        "pending",
        "todo",
        undefined,
      ]) {
        const value = report(cell);
        value.testResults[moduleIndex].status = status;
        assert.throws(() => assertVueRuntimeCases(value, root, cell));
      }
      const malformed = report(cell);
      malformed.testResults[moduleIndex].assertionResults = undefined;
      assert.throws(() => assertVueRuntimeCases(malformed, root, cell));
    });

    for (const [caseIndex, required] of module.assertionResults.entries()) {
      test(`${cell}: requires one passing ${required.fullName}`, () => {
        const missing = report(cell);
        missing.testResults[moduleIndex].assertionResults.splice(caseIndex, 1);
        assert.throws(() => assertVueRuntimeCases(missing, root, cell));
        const duplicate = report(cell);
        duplicate.testResults[moduleIndex].assertionResults.push({
          ...required,
        });
        assert.throws(() => assertVueRuntimeCases(duplicate, root, cell));
        const renamed = report(cell);
        renamed.testResults[moduleIndex].assertionResults[caseIndex].fullName +=
          " renamed";
        assert.throws(() => assertVueRuntimeCases(renamed, root, cell));
        for (const status of [
          "failed",
          "skipped",
          "pending",
          "todo",
          undefined,
        ]) {
          const value = report(cell);
          value.testResults[moduleIndex].assertionResults[caseIndex].status =
            status;
          assert.throws(() => assertVueRuntimeCases(value, root, cell));
        }
      });
    }
  }
}

test("rejects an unknown cell and relative root", () => {
  assert.throws(() => assertVueRuntimeCases(report("source"), root, "other"));
  assert.throws(() => assertVueRuntimeCases(report("source"), ".", "source"));
});

const peers = [
  { label: "current", root: resolve("current/vue"), version: "3.5.0" },
  { label: "floor", root: resolve("floor/vue"), version: "3.3.0" },
];
const completed = () =>
  peers.flatMap((peer) =>
    ["source", "built"].map((cell) => ({
      peer: peer.label,
      cell,
      root: peer.root,
      version: peer.version,
    }))
  );

test("requires four cells with their selected roots and versions", () => {
  assert.doesNotThrow(() => assertVueRuntimeCells(completed(), peers));
  assert.doesNotThrow(() =>
    assertVueRuntimeCells(completed().reverse(), peers)
  );
  const sameVersion = peers.map((peer) => ({ ...peer, version: "3.5.0" }));
  assert.doesNotThrow(() =>
    assertVueRuntimeCells(
      completed().map((cell) => ({ ...cell, version: "3.5.0" })),
      sameVersion
    )
  );
});

test("rejects missing, extra or duplicate runtime cell completions", () => {
  for (let index = 0; index < 4; index++) {
    const missing = completed();
    missing.splice(index, 1);
    assert.throws(() => assertVueRuntimeCells(missing, peers));
    const duplicated = completed();
    duplicated[index] = { ...duplicated[(index + 1) % 4] };
    assert.throws(() => assertVueRuntimeCells(duplicated, peers));
  }
  assert.throws(() => assertVueRuntimeCells([], peers));
  assert.throws(() =>
    assertVueRuntimeCells([...completed(), completed()[0]], peers)
  );
});

test("rejects every cell with an incorrect label, root, version or kind", () => {
  for (let index = 0; index < 4; index++) {
    for (const [key, value] of [
      ["peer", "other"],
      ["cell", "other"],
      ["root", resolve("unselected/vue")],
      ["version", "0.0.0"],
    ]) {
      const cells = completed();
      cells[index][key] = value;
      assert.throws(() => assertVueRuntimeCells(cells, peers));
    }
  }
});

test("rejects incomplete or duplicated peer expectations", () => {
  for (const expected of [
    [],
    peers.slice(0, 1),
    [peers[0], peers[0]],
    [...peers, peers[0]],
  ])
    assert.throws(() => assertVueRuntimeCells(completed(), expected));
});

test("rejects missing expected roots and versions even if completions match", () => {
  for (const key of ["root", "version"]) {
    for (const value of [undefined, "", null]) {
      const expected = peers.map((peer) => ({ ...peer, [key]: value }));
      const cells = completed().map((cell) => ({ ...cell, [key]: value }));
      assert.throws(() => assertVueRuntimeCells(cells, expected));
    }
  }
});

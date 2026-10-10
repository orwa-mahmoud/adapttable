/** Require collected, passing semantic-part cases in every Vue runtime cell. */
import assert from "node:assert/strict";
import { isAbsolute, relative, sep } from "node:path";

const parts = ["table", "header-cell", "cell"];
const faults = ["marker", "target", "class"];
const native = "native canonical semantic parts";
const packed = "packed DataTable canonical native targets";
const sourceCases = new Map([
  [
    "packages/vue/vue/test/tableParts.test.ts",
    [
      ...["first", "second"].map(
        (kit) =>
          `places canonical basic and mobile parts on semantic targets with kit ${kit}`
      ),
      "distinguishes spanning group bands from the leaf header row",
    ],
  ],
  [
    "packages/vue/adapter-vue-unstyled/test/parts.test.ts",
    [
      `${native} places search, selection and scroll parts on the real native elements while retaining classNames keys`,
      ...parts.flatMap((part) =>
        faults.map(
          (fault) =>
            `${native} rejects a wrong '${fault}' on the native '${part}' target`
        )
      ),
    ],
  ],
  [
    "scripts/vue-peer-consumer-fixtures/version.test.ts",
    ["runs the selected Vue runtime"],
  ],
]);
const builtCases = new Map([
  [
    "consumers/runtime.test.ts",
    [
      ...["basic", "grouped"].map(
        (mode) =>
          `${packed} retains marker, tag and class ownership for ${mode} columns`
      ),
      ...["basic", "grouped"].flatMap((mode) =>
        parts.flatMap((part) =>
          faults.map(
            (fault) =>
              `${packed} rejects a wrong '${fault}' for '${part}' in the packed '${mode}' table`
          )
        )
      ),
    ],
  ],
]);

export function assertVueRuntimeCases(report, root, cell) {
  assert.ok(cell === "source" || cell === "built", "Unknown Vue runtime cell");
  assert.ok(isAbsolute(root), "Vue runtime root must be absolute");
  assert.equal(report?.success, true, "Vue runtime report did not succeed");
  assert.ok(report.numTotalTests > 0, "Vue runtime report contains no tests");
  assert.ok(Array.isArray(report.testResults), "Missing Vue runtime results");
  const required = cell === "built" ? builtCases : sourceCases;
  for (const [file, names] of required) {
    const matches = report.testResults.filter(
      (result) =>
        typeof result.name === "string" &&
        isAbsolute(result.name) &&
        relative(root, result.name).split(sep).join("/") === file
    );
    assert.equal(matches.length, 1, `Expected one runtime result for ${file}`);
    const [result] = matches;
    assert.equal(result.status, "passed", `${file}: runtime module failed`);
    assert.ok(Array.isArray(result.assertionResults), `${file}: missing cases`);
    for (const name of names) {
      const cases = result.assertionResults.filter(
        (test) => test.fullName === name
      );
      assert.equal(cases.length, 1, `${file}: expected one case: ${name}`);
      assert.equal(
        cases[0].status,
        "passed",
        `${file}: case did not pass: ${name}`
      );
    }
  }
}

export function assertVueRuntimeCells(completed, peers) {
  assert.equal(peers.length, 2, "Expected current and floor Vue peers");
  assert.deepEqual(
    peers.map((peer) => peer.label).sort(),
    ["current", "floor"],
    "Expected current and floor Vue peers"
  );
  assert.equal(completed.length, 4, "Expected all four Vue runtime cells");
  for (const peer of peers) {
    assert.ok(
      typeof peer.root === "string" && peer.root.length > 0,
      `${peer.label}: missing expected Vue root`
    );
    assert.ok(
      typeof peer.version === "string" && peer.version.length > 0,
      `${peer.label}: missing expected Vue version`
    );
    for (const cell of ["built", "source"]) {
      const matches = completed.filter(
        (result) => result.peer === peer.label && result.cell === cell
      );
      assert.equal(
        matches.length,
        1,
        `${peer.label}: expected one ${cell} cell`
      );
      assert.equal(matches[0].root, peer.root, `${peer.label}: wrong Vue root`);
      assert.equal(
        matches[0].version,
        peer.version,
        `${peer.label}: wrong Vue version`
      );
    }
  }
}

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { checkConformanceRegistry } from "./check-conformance-registry.mjs";

/**
 * @param {string} relative
 * @param {string} text
 */
function kitRoot(relative, text) {
  const root = mkdtempSync(join(tmpdir(), "adapttable-registry-"));
  const file = join(root, relative);
  mkdirSync(join(file, ".."), { recursive: true });
  if (text !== undefined) writeFileSync(file, text);
  return root;
}

const kit = {
  name: "adapter-fixture",
  framework: "react",
  role: "shell",
};

describe("conformance registry", () => {
  it("rejects a kit that never registers the suite", () => {
    const root = kitRoot(
      "packages/react/adapter-fixture/src/conformance.test.tsx",
      "export const unused = 1;\n"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, [
        "react/adapter-fixture: conformance suite is not registered",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a suite wrapped in describe.skip", () => {
    const root = kitRoot(
      "packages/react/adapter-fixture/src/conformance.test.tsx",
      "describe.skip('table', () => {\n  tableConformanceTests(driver, harness);\n});\n"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, [
        "react/adapter-fixture: conformance suite is skipped",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("accepts a kit that calls the suite", () => {
    const root = kitRoot(
      "packages/react/adapter-fixture/test/conformance.test.ts",
      "for (const test of tableConformanceTests(driver, harness)) {\n  it(test.name, test.run);\n}\n"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a kit that filters the shared cases", () => {
    const root = kitRoot(
      "packages/react/adapter-fixture/src/conformance.test.tsx",
      "const tests = tableConformanceTests(driver, harness).filter(() => false);\n"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, [
        "react/adapter-fixture: conformance suite does not run every case",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  /**
   * A kit that runs its binding's wrapper of the suite.
   *
   * @param {string} wrapperBody
   */
  function wrapperRoot(wrapperBody) {
    const root = kitRoot(
      "packages/react/adapter-fixture/src/conformance.test.tsx",
      [
        'import { reactTableConformanceTests } from "../../react/test/kit/conformance";',
        "for (const test of reactTableConformanceTests(kit)) it(test.name, test.run);",
        "",
      ].join("\n")
    );
    const wrapper = join(root, "packages/react/react/test/kit/conformance.tsx");
    mkdirSync(join(wrapper, ".."), { recursive: true });
    writeFileSync(
      wrapper,
      [
        "export function reactTableConformanceTests(kit: Kit): readonly Test[] {",
        `  ${wrapperBody}`,
        "}",
        "",
      ].join("\n")
    );
    return root;
  }

  it("accepts a kit that runs its binding's wrapper of the whole suite", () => {
    const root = wrapperRoot(
      "return tableConformanceTests(driver(kit), harness);"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, []);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a binding wrapper that filters the shared cases", () => {
    const root = wrapperRoot(
      "return tableConformanceTests(driver(kit), harness).filter(() => false);"
    );
    try {
      const checked = checkConformanceRegistry({ root, kits: [kit] });
      assert.deepEqual(checked.problems, [
        "react/adapter-fixture: conformance suite is not registered",
      ]);
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects a shared suite that drops a common case", () => {
    const root = kitRoot(
      "packages/react/adapter-fixture/src/conformance.test.tsx",
      "for (const test of tableConformanceTests(driver, harness)) {\n  it(test.name, test.run);\n}\n"
    );
    const suite = join(root, "suite.ts");
    writeFileSync(
      suite,
      'it("activates a row from its body and not from an interactive control", () => {});\n'
    );
    try {
      const checked = checkConformanceRegistry({
        root,
        kits: [kit],
        suiteFile: suite,
      });
      assert.equal(checked.cases, 1);
      assert.ok(
        checked.problems.some((problem) =>
          problem.includes("marks a flashing cell")
        )
      );
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});

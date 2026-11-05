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
});

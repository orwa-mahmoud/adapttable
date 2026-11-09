import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  bindingCoreImportViolations,
  checkBindingCoreImports,
  checkSharedBehaviours,
  focusedValueDoors,
  reimplementedBehaviourViolations,
} from "./check-binding-core-imports.mjs";

describe("binding core imports", () => {
  const doors = focusedValueDoors();

  it("sends a focused value to its door and leaves a root-only name", () => {
    const violations = bindingCoreImportViolations(
      [
        'import { createTableEngine, resolveLabels } from "@adapttable/core";',
        'import { createCellEditSession } from "@adapttable/core/editing";',
        'import type { TableSource } from "@adapttable/core";',
        'export { beginCellEdit } from "@adapttable/core";',
      ].join("\n"),
      doors,
      "planted"
    );
    assert.deepEqual(violations, [
      "planted: createTableEngine belongs on @adapttable/core/engine",
      "planted: beginCellEdit belongs on @adapttable/core/editing",
    ]);
  });

  it("accepts the three bindings", () => {
    const violations = checkBindingCoreImports();
    assert.deepEqual(violations, []);
  });

  it("fails a planted binding duplicate and accepts the real bindings", () => {
    const behaviours = [
      {
        name: "sourceViewKey",
        owner: "packages/shared/core/src/source/sourceRefresh.ts",
      },
    ];
    assert.deepEqual(
      reimplementedBehaviourViolations(
        "export function sourceViewKey(state) { return state; }",
        behaviours,
        "planted"
      ),
      [
        "planted: sourceViewKey is owned by packages/shared/core/src/source/sourceRefresh.ts and cannot be reimplemented in a binding",
      ]
    );
    assert.deepEqual(
      reimplementedBehaviourViolations(
        'export { sourceViewKey } from "@adapttable/core/binding";',
        behaviours,
        "planted"
      ),
      []
    );
    assert.deepEqual(checkSharedBehaviours(), []);
  });
});

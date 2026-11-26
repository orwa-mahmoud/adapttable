import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, it } from "node:test";

import { featureBoundaryProblems } from "./check-react-feature-boundary.mjs";

const roots = [];
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

function src(files) {
  const root = mkdtempSync(join(tmpdir(), "feature-boundary-"));
  roots.push(root);
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
}

describe("react feature boundary", () => {
  it("passes a base that uses only the composition machinery and state keys", () => {
    const root = src({
      "kit/tableComposition.tsx":
        'import { FeatureSlot } from "../features/providers";\nimport { ROW_MODEL } from "../features/rowModelKey";\n',
      "features/providers.tsx": "export const FeatureSlot = 1;\n",
      "features/rowModelKey.ts": "export const ROW_MODEL = 1;\n",
      "features/find-in-table.tsx": "export const findInTable = 1;\n",
    });
    assert.deepEqual(featureBoundaryProblems(root), []);
  });

  it("names the chain that reaches a feature's own module", () => {
    const root = src({
      "kit/tableComposition.tsx": 'import { area } from "./area";\n',
      "kit/area.tsx":
        'import { findInTable } from "../features/find-in-table";\n',
      "features/find-in-table.tsx": "export const findInTable = 1;\n",
    });
    assert.deepEqual(featureBoundaryProblems(root), [
      "kit/tableComposition.tsx → kit/area.tsx → features/find-in-table.tsx",
    ]);
  });

  it("follows only imports that load code", () => {
    const root = src({
      "kit/toolbar.tsx":
        'import type { Props } from "../features/find-in-table";\nimport { type Other } from "../features/export-csv";\nexport type { Third } from "../features/fullscreen";\n',
      "features/find-in-table.tsx": "export type Props = 1;\n",
      "features/export-csv.tsx": "export type Other = 1;\n",
      "features/fullscreen.tsx": "export type Third = 1;\n",
    });
    assert.deepEqual(featureBoundaryProblems(root), []);
  });

  it("counts a lazy import of a feature", () => {
    const root = src({
      "kit/desktopTable.tsx":
        'export const load = () => import("../features/tree");\n',
      "features/tree.tsx": "export const tree = 1;\n",
    });
    assert.deepEqual(featureBoundaryProblems(root), [
      "kit/desktopTable.tsx → features/tree.tsx",
    ]);
  });

  it("ignores the base's own tests", () => {
    const root = src({
      "kit/tableComposition.test.tsx":
        'import { findInTable } from "../features/find-in-table";\n',
      "features/find-in-table.tsx": "export const findInTable = 1;\n",
    });
    assert.deepEqual(featureBoundaryProblems(root), []);
  });
});

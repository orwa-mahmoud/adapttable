import assert from "node:assert/strict";
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkCoreDependencies,
  readCoreEdges,
} from "./check-core-dependencies.mjs";

const OWNERSHIP = {
  layers: [
    { id: "leaf", rank: 0, prefixes: ["sort/"] },
    { id: "engine", rank: 10, prefixes: ["engine/", "rows/"] },
    { id: "source", rank: 20, prefixes: ["source/"] },
    { id: "presentation", rank: 40, prefixes: ["layout/", "style/"] },
  ],
  defaultRank: 30,
  lowMaxRank: 20,
  presentationMinRank: 40,
  incrementalModule: "rows/incremental.ts",
  incrementalOwners: ["engine/createTableEngine.ts"],
  knownViolations: [],
};

/**
 * @param {Record<string, string>} files
 * @param {object} [ownership]
 */
function check(files, ownership = OWNERSHIP) {
  const srcDir = mkdtempSync(join(tmpdir(), "adapttable-core-edges-"));
  for (const [name, text] of Object.entries(files)) {
    const path = join(srcDir, name);
    mkdirSync(join(path, ".."), { recursive: true });
    writeFileSync(path, text);
  }
  try {
    return checkCoreDependencies({ srcDir, ownership });
  } finally {
    rmSync(srcDir, { recursive: true, force: true });
  }
}

describe("core dependency checker", () => {
  it("rejects a direct low-layer import of presentation, with the path", () => {
    const checked = check({
      "layout/pin.ts": "export const pin = 1;\n",
      "source/direct.ts":
        'import { pin } from "../layout/pin";\nexport const used = pin;\n',
    });
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes("runtime: source/direct.ts -> layout/pin.ts")
      ),
      checked.problems.join("\n")
    );
    assert.equal(checked.typeOnly.length, 0);
  });

  it("rejects a barrel re-export of presentation from a low layer", () => {
    const checked = check({
      "layout/pin.ts": "export const pin = 1;\n",
      "sort/barrel.ts": 'export { pin } from "../layout/pin";\n',
    });
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes("runtime: sort/barrel.ts -> layout/pin.ts")
      ),
      checked.problems.join("\n")
    );
  });

  it("rejects an aliased import of presentation from a low layer", () => {
    const checked = check({
      "layout/pin.ts": "export const pin = 1;\n",
      "rows/aliased.ts":
        'import { pin as stuck } from "../layout/pin";\nexport const used = stuck;\n',
    });
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes("runtime: rows/aliased.ts -> layout/pin.ts")
      ),
      checked.problems.join("\n")
    );
  });

  it("rejects a dynamic framework import and a dynamic presentation import", () => {
    const checked = check({
      "layout/pin.ts": "export const pin = 1;\n",
      "engine/dynamic.ts":
        'export const loadVue = () => import("vue");\nexport const loadPin = () => import("../layout/pin");\n',
    });
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes("runtime: engine/dynamic.ts -> vue")
      ),
      checked.problems.join("\n")
    );
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes("runtime: engine/dynamic.ts -> layout/pin.ts")
      ),
      checked.problems.join("\n")
    );
  });

  it("reports a type-only presentation edge separately from JavaScript", () => {
    const checked = check({
      "style/css.ts": "export type Css = { top: number };\n",
      "rows/typed.ts":
        'import type { Css } from "../style/css";\nexport type RowCss = Css;\n',
    });
    assert.ok(
      checked.problems.some((problem) =>
        problem.startsWith("type-only: rows/typed.ts -> style/css.ts")
      ),
      checked.problems.join("\n")
    );
    assert.equal(checked.javascript.length, 0);
    assert.equal(checked.typeOnly.length, 1);
  });

  it("rejects a new edge and a stale recorded edge", () => {
    const ownership = {
      ...OWNERSHIP,
      knownViolations: [
        {
          id: "recorded",
          cause: "fixture",
          destinationItem: "t0up",
          edges: [
            {
              from: "sort/kept.ts",
              to: "layout/pin.ts",
              kind: "runtime",
            },
            {
              from: "sort/gone.ts",
              to: "layout/pin.ts",
              kind: "runtime",
            },
          ],
        },
      ],
    };
    const checked = check(
      {
        "layout/pin.ts": "export const pin = 1;\n",
        "sort/kept.ts":
          'import { pin } from "../layout/pin";\nexport const used = pin;\n',
        "sort/extra.ts":
          'import { pin } from "../layout/pin";\nexport const more = pin;\n',
      },
      ownership
    );
    assert.equal(
      checked.problems.some((problem) => problem.includes("sort/kept.ts")),
      false
    );
    assert.ok(
      checked.problems.some((problem) => problem.includes("sort/extra.ts")),
      checked.problems.join("\n")
    );
    assert.ok(
      checked.problems.some((problem) =>
        problem.includes(
          "stale violation: runtime sort/gone.ts -> layout/pin.ts"
        )
      ),
      checked.problems.join("\n")
    );
  });

  it("keeps neutral contracts free of implementation imports", () => {
    const src = join(
      dirname(fileURLToPath(import.meta.url)),
      "../packages/shared/core/src"
    );
    const names = readdirSync(join(src, "contracts")).filter((name) =>
      name.endsWith(".ts")
    );
    assert.ok(names.length >= 5);
    const edges = readCoreEdges(src).filter((edge) =>
      edge.from.startsWith("contracts/")
    );
    assert.deepEqual(
      edges.filter((edge) => edge.kind === "runtime").map((edge) => edge.from),
      []
    );
    const valueLine =
      /^(export )?(async )?(function |class |const |let |enum )/;
    for (const edge of edges) {
      const text = readFileSync(join(src, edge.to), "utf8");
      const hit = text.split("\n").find((line) => valueLine.test(line));
      assert.equal(hit, undefined, `${edge.from} -> ${edge.to}`);
    }
  });
});

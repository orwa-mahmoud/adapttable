import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
  ESBUILD_CEILINGS,
  esbuildMarkerProblems,
  esbuildPath,
  measureEsbuild,
} from "./esbuild-budget.mjs";

const dir = mkdtempSync(join(tmpdir(), "esbuild-budget-"));
after(() => rmSync(dir, { recursive: true, force: true }));

describe("esbuild budget", () => {
  it("resolves esbuild through Vite, not as a new dependency", () => {
    assert.match(esbuildPath(), /esbuild/);
  });

  it("drops a module the entry never imports and keeps one it names", async () => {
    writeFileSync(
      join(dir, "leak.js"),
      "export function leakedFeature() { return 1; }\n"
    );
    writeFileSync(join(dir, "entry.js"), "export const kept = 1;\n");
    const built = await measureEsbuild(join(dir, "entry.js"), [/^react($|\/)/]);
    assert.deepEqual(
      esbuildMarkerProblems(
        { absent: ["leakedFeature"], present: ["kept"] },
        built
      ),
      { leaked: [], missing: [] }
    );
    assert.ok(built.initialGzip > 0);
    assert.ok(built.totalGzip >= built.initialGzip);
  });

  it("still flags a named absence and ignores dead chunk text", () => {
    assert.deepEqual(
      esbuildMarkerProblems(
        {
          absent: [
            "pdfWriter",
            "data-cell-selected] {",
            "column keys must be unique",
          ],
          present: ["kept"],
        },
        { js: "export const kept = 1;\nconst pdfWriter = 1;\n", css: "" }
      ),
      { leaked: ["pdfWriter"], missing: [] }
    );
  });

  it("names the plain and full unstyled table of each framework", () => {
    assert.deepEqual(Object.keys(ESBUILD_CEILINGS), [
      "unstyled · table",
      "unstyled · table + preset",
      "vue-unstyled · table",
      "vue-unstyled · table + preset",
      "angular · angular-unstyled table",
      "angular · unstyled + preset",
    ]);
  });
});

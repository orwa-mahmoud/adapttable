import assert from "node:assert/strict";
import { join, dirname } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  checkTransitiveGraph,
  runFrameworkBoundaryCheck,
} from "./check-framework-boundary.mjs";
import { buildPkgDirByName } from "./module-graph.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEGATIVE = join(ROOT, "scripts", "boundary-fixtures", "negative");

describe("framework boundary checker", () => {
  it("passes on the real repository graph", () => {
    const { missing, sourceViolations, transitiveViolations } =
      runFrameworkBoundaryCheck();
    assert.equal(missing.length, 0, missing.join(", "));
    assert.equal(sourceViolations.length, 0);
    assert.equal(
      transitiveViolations.length,
      0,
      transitiveViolations.join("\n")
    );
  });

  it("rejects neutral → helper → React", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "neutral-via-helper.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "planted neutral-via-helper",
    });
    assert.ok(
      violations.some((v) => /react/.test(v)),
      violations.join("\n")
    );
  });

  it("rejects dynamic React imports", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "dynamic-react.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "planted dynamic-react",
    });
    assert.ok(
      violations.some((v) => /react/.test(v)),
      violations.join("\n")
    );
  });

  it("rejects React types in neutral declarations", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "react-type.d.ts")],
      pkgDirByName: buildPkgDirByName(),
      label: "planted react-type",
    });
    assert.ok(
      violations.some((v) => /React/.test(v)),
      violations.join("\n")
    );
  });

  it("flags unresolved @adapttable/core/adapter from a neutral graph", () => {
    const violations = checkTransitiveGraph({
      entryFiles: [join(NEGATIVE, "missing-entry.js")],
      pkgDirByName: buildPkgDirByName(),
      label: "missing entry",
    });
    assert.ok(
      violations.some((v) => /unresolved|adapter/.test(v)),
      violations.join("\n")
    );
  });
});

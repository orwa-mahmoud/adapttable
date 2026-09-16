import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  classifyForgottenExport,
  summarize,
  VALUE_BACKED,
} from "./api-warnings.mjs";

const CORE_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "core",
  "src"
);

const REACT_SRC = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "packages",
  "react",
  "src"
);

/** Every field the classifier reads, with the safe defaults a test overrides. */
const classify = (over) =>
  classifyForgottenExport({
    symbol: "Whatever",
    report: "core-features.api.md",
    isMainEntry: false,
    exports: new Set(),
    ...over,
  });

/**
 * v3 removed the main-entry aliases, and with them the class that deferred
 * the bundler's copies of them. A suffixed symbol in `core.api.md` is now a
 * finding like any other — which is the point: the deferral existed only
 * because two copies of one binding were in the rollup.
 */
describe("the alias deferral is gone", () => {
  it("treats a suffixed symbol in the main report as a finding", () => {
    assert.equal(
      classify({ symbol: "pinnedRowPart$1", report: "core.api.md" }).kind,
      "subpath"
    );
  });

  it("still calls it a front-door finding on the main entry", () => {
    assert.equal(
      classify({
        symbol: "pinnedRowPart$1",
        report: "core.api.md",
        isMainEntry: true,
      }).kind,
      "front-door"
    );
  });
});

describe("the published class", () => {
  it("defers a suffixed copy of a name the same entry exports", () => {
    const verdict = classify({
      symbol: "UseServerDataOptions$1",
      report: "adapter-shadcn.api.md",
      isMainEntry: true,
      exports: new Set(["UseServerDataOptions", "DataTable"]),
    });
    assert.deepEqual(verdict, {
      kind: "published",
      base: "UseServerDataOptions",
      suffix: "$1",
    });
  });

  it("does NOT defer one whose base the entry does not export", () => {
    assert.equal(
      classify({
        symbol: "UseServerDataOptions$1",
        report: "adapter-shadcn.api.md",
        isMainEntry: true,
        exports: new Set(["DataTable"]),
      }).kind,
      "front-door"
    );
  });

  it("does NOT defer an unsuffixed name just because the entry exports it", () => {
    assert.equal(
      classify({
        symbol: "ColumnDef",
        report: "core-pivot.api.md",
        exports: new Set(["ColumnDef"]),
      }).kind,
      "subpath"
    );
  });
});

describe("findings", () => {
  it("calls a forgotten export on a feature subpath a subpath finding", () => {
    assert.equal(
      classify({ symbol: "BulkActionContext", report: "core-features.api.md" })
        .kind,
      "subpath"
    );
  });

  it("calls a forgotten export on core/adapter a subpath finding, not an exemption", () => {
    assert.equal(
      classify({ symbol: "ConfirmRequest", report: "core-adapter.api.md" })
        .kind,
      "subpath"
    );
  });

  it("calls a forgotten export on a package's main entry a front door", () => {
    assert.equal(
      classify({
        symbol: "SavedViewsPanelChromeProps",
        report: "adapter-shadcn.api.md",
        isMainEntry: true,
      }).kind,
      "front-door"
    );
  });
});

describe("summarize", () => {
  it("names every class that occurred, with its count", () => {
    assert.equal(
      summarize({
        published: 1,
        subpath: 149,
        frontDoor: 0,
        unresolvedLink: 27,
        missingReleaseTag: 0,
        other: 0,
      }),
      "api-reports: 1 published-name copy(s), " +
        "149 on a subpath entry, 27 unresolved @link(s)."
    );
  });

  it("never says nothing while a class is held", () => {
    // The failure this replaced: a run reporting only forgotten exports while
    // 27 unresolved links sat outside every figure it printed.
    const line = summarize({ unresolvedLink: 27 });
    assert.match(line, /27 unresolved @link/);
    assert.notEqual(line, "api-reports: no warnings of any class.");
  });

  it("says so plainly when there is genuinely nothing", () => {
    assert.equal(summarize({}), "api-reports: no warnings of any class.");
  });
});

describe("the value-backed class", () => {
  it("defers only the exact report-and-symbol pairs listed", () => {
    for (const [report, symbol] of VALUE_BACKED) {
      assert.equal(
        classify({ symbol, report, isMainEntry: report === "core.api.md" })
          .kind,
        "value-backed",
        `${report} ${symbol}`
      );
    }
  });

  it("does NOT defer the same symbol on a report it is not listed for", () => {
    assert.equal(
      classify({ symbol: "FILTER_TYPES", report: "core-stream.api.md" }).kind,
      "subpath"
    );
  });

  it("does NOT defer a different symbol on a listed report", () => {
    assert.equal(
      classify({ symbol: "SomethingElse", report: "core-query.api.md" }).kind,
      "subpath"
    );
  });

  // The class claims each of these is a runtime value that a public type is
  // derived from. If that stops being true, the reason for the deferral is
  // gone and this fails rather than quietly carrying on.
  it("every listed symbol really is a value a public type is built from", () => {
    // The editable-cell controller moved to the React binding in v3; the
    // constants themselves stayed neutral.
    const sources = [
      join(CORE_SRC, "filters/filterDefs.ts"),
      join(CORE_SRC, "formula/evaluate.ts"),
      join(CORE_SRC, "editing/cellEditing.ts"),
      join(REACT_SRC, "editing/editableCellController.ts"),
    ].map((f) => readFileSync(f, "utf8"));
    const all = sources.join("\n");
    for (const symbol of new Set(VALUE_BACKED.map(([, s]) => s))) {
      const declaresValue = new RegExp(
        `^export (?:declare )?(?:const|function) ${symbol}\\b`,
        "m"
      ).test(all);
      assert.ok(declaresValue, `${symbol} is declared as a value`);
      assert.ok(
        all.includes(`typeof ${symbol}`) ||
          all.includes(`ReturnType<typeof ${symbol}>`),
        `${symbol} has a public type derived from it`
      );
    }
  });
});

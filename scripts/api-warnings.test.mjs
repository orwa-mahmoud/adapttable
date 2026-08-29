import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ALIAS_REPORT,
  aliasNames,
  classifyForgottenExport,
  summarize,
  withoutGeneratedNames,
} from "./api-warnings.mjs";

const ALIASES = aliasNames(
  [
    "export const pinnedRowPart = pinnedRowPartImpl;",
    "export type EditableCellSlots = EditableCellSlotsType;",
    "  export const notAtColumnZero = nope;",
  ].join("\n")
);

/** Every field the classifier reads, with the safe defaults a test overrides. */
const classify = (over) =>
  classifyForgottenExport({
    symbol: "Whatever",
    report: "core-features.api.md",
    isMainEntry: false,
    aliases: ALIASES,
    exports: new Set(),
    ...over,
  });

describe("aliasNames", () => {
  it("reads the const and type aliases the module re-exports", () => {
    assert.ok(ALIASES.has("pinnedRowPart"));
    assert.ok(ALIASES.has("EditableCellSlots"));
  });

  it("ignores an export that is not at column zero", () => {
    assert.ok(!ALIASES.has("notAtColumnZero"));
  });
});

describe("the alias class", () => {
  it("defers an alias artifact in the report the aliases roll into", () => {
    const verdict = classify({
      symbol: "pinnedRowPart$1",
      report: ALIAS_REPORT,
    });
    assert.deepEqual(verdict, {
      kind: "alias",
      base: "pinnedRowPart",
      suffix: "$1",
    });
  });

  it("takes the underscore suffix the same way", () => {
    assert.equal(
      classify({ symbol: "EditableCellSlots_2", report: ALIAS_REPORT }).kind,
      "alias"
    );
  });

  // The evidence is the whole point: an alias name reported from a report the
  // aliases do not roll into is a real finding wearing a familiar name.
  it("does NOT defer a known alias reported from the wrong report", () => {
    assert.equal(
      classify({ symbol: "pinnedRowPart$1", report: "core-pivot.api.md" }).kind,
      "subpath"
    );
  });

  it("does NOT defer an alias name with no bundler suffix", () => {
    assert.equal(
      classify({ symbol: "pinnedRowPart", report: ALIAS_REPORT }).kind,
      "subpath"
    );
  });

  it("does NOT defer an unrelated symbol that merely ends in a suffix", () => {
    assert.equal(
      classify({
        symbol: "UseServerDataOptions$1",
        report: ALIAS_REPORT,
      }).kind,
      "subpath"
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
        alias: 61,
        published: 1,
        subpath: 149,
        frontDoor: 0,
        unresolvedLink: 27,
        missingReleaseTag: 0,
        other: 0,
      }),
      "api-reports: 61 deprecated-alias artifact(s), 1 published-name copy(s), " +
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

describe("withoutGeneratedNames", () => {
  // The build does not settle on one spelling: the same source emits
  // `pinnedRowPart$1` on some runs and `pinnedRowPart_2` on others, because the
  // declaration bundler sometimes inlines a shared declaration and sometimes
  // hoists it. Byte-comparing reports therefore failed about half the time on a
  // change that altered nothing.
  it("folds both suffix spellings to the same text", () => {
    const dollar = "export const pinnedRowPart: typeof pinnedRowPart$1;";
    const underscore = "export const pinnedRowPart: typeof pinnedRowPart_2;";
    assert.equal(
      withoutGeneratedNames(dollar),
      withoutGeneratedNames(underscore)
    );
  });

  it("leaves the public name on the left untouched", () => {
    assert.match(
      withoutGeneratedNames(
        "export type EditableCellSlots = EditableCellSlots_2;"
      ),
      /^export type EditableCellSlots = /
    );
  });

  it("does not touch a name that merely ends in a digit", () => {
    const line = "export const useDataTable2: number;";
    assert.equal(withoutGeneratedNames(line), line);
  });

  // The surface itself is still compared exactly, by check-api-contract.mjs.
  it("still distinguishes two different public names", () => {
    assert.notEqual(
      withoutGeneratedNames("export const a: typeof a$1;"),
      withoutGeneratedNames("export const b: typeof b$1;")
    );
  });
});

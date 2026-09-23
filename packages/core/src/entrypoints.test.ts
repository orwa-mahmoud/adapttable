/**
 * Every published subpath is a promise about where a name lives.
 *
 * These modules hold no logic — they are the doors — so what has to be checked
 * is that each door opens and that the names behind it are the ones the export
 * map, the docs and the codemod send people to. A barrel that silently stops
 * forwarding a name breaks a consumer's import with no test failing anywhere
 * else, because every inner module still passes its own suite.
 */
import { describe, expect, it } from "vitest";

import * as binding from "./binding";
import * as bindingExports from "./bindingExports";
import * as formula from "./formula";
import * as pdf from "./pdf";
import * as pivot from "./pivot";
import * as query from "./query";
import * as stream from "./stream";
import * as main from "./index";
import * as xlsx from "./xlsx";

describe("@adapttable/core/formula", () => {
  it("opens the formula builder and its evaluator", () => {
    expect(typeof formula.buildFormulaColumns).toBe("function");
    expect(typeof formula.evaluateFormula).toBe("function");
  });
});

describe("@adapttable/core/pivot", () => {
  it("opens the pivot model and the aggregators it reads", () => {
    expect(typeof pivot.pivot).toBe("function");
    expect(typeof pivot.isPivotReady).toBe("function");
    expect(pivot.PIVOT_ZONES.length).toBeGreaterThan(0);
  });
});

describe("@adapttable/core/query", () => {
  it("opens the URL codecs a query-tier host serializes with", () => {
    expect(typeof query.parseFilterTree).toBe("function");
    expect(typeof query.serializeFilterTree).toBe("function");
    expect(typeof query.serializeFormulaColumns).toBe("function");
  });
});

describe("@adapttable/core/stream", () => {
  it("opens the wire parser and the socket opener, and no React hook", () => {
    expect(typeof stream.parseRowPatchFrame).toBe("function");
    expect(typeof stream.openRowPatchStream).toBe("function");
    expect(Object.keys(stream).some((name) => name.startsWith("use"))).toBe(
      false
    );
  });
});

describe("the export writers", () => {
  it("opens xlsx behind its own subpath", () => {
    expect(typeof xlsx.buildTableXlsx).toBe("function");
    expect(typeof xlsx.xlsxWriter).toBe("function");
  });

  it("opens pdf behind its own subpath", () => {
    expect(typeof pdf.buildTablePdf).toBe("function");
    expect(typeof pdf.pdfWriter).toBe("function");
  });
});

describe("the binding barrel", () => {
  it("forwards the engine machinery a binding assembles a table from", () => {
    expect(typeof bindingExports.resolveDisabledReason).toBe("function");
    expect(typeof bindingExports.contextMenuItems).toBe("function");
  });

  it("carries no React of its own", () => {
    for (const value of Object.values(bindingExports)) {
      expect(typeof value).not.toBe("symbol");
    }
    expect(Object.keys(bindingExports).length).toBeGreaterThan(0);
  });
});

describe("@adapttable/core/binding", () => {
  it("opens the adapter machinery the main entry marks for removal", () => {
    expect(typeof binding.columnGroupId).toBe("function");
    expect(typeof binding.insertExtraRows).toBe("function");
    expect(typeof binding.flattenColumnTree).toBe("function");
  });

  it("serves the same functions the main entry still serves", () => {
    expect(binding.columnGroupId).toBe(main.columnGroupId);
    expect(binding.insertExtraRows).toBe(main.insertExtraRows);
    expect(main.xlsxWriter).toBe(xlsx.xlsxWriter);
  });
});

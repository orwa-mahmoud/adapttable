/**
 * What the bridge does with values and addresses the engine did not shape.
 *
 * A cell can hold anything a host put in a row, a column can carry a rendered
 * header rather than a string, and a row reference can name a position that no
 * longer exists. Each of those has one right answer, and the protocol depends
 * on it: an agent receives JSON, so an unserializable value has to arrive as an
 * explicit marker rather than as an invented string or a thrown request.
 */
import { createNeutralTable, createTableEngine } from "@adapttable/core";
import { describe, expect, it } from "vitest";

import {
  agentColumnsFromNeutral,
  monotonicRevision,
  observationFromNeutral,
  pageMaxFromNeutral,
  readRowsFromNeutral,
  resolveRowFromNeutral,
  rowAddressScopeForNeutral,
  transportCellValue,
} from "./liveTable";

interface Row {
  id: string;
  name: string;
  team: string;
}

const ROWS: Row[] = [
  { id: "1", name: "Ada", team: "ops" },
  { id: "2", name: "Grace", team: "eng" },
  { id: "3", name: "Lin", team: "ops" },
];

const COLUMNS = [
  { key: "name", header: "Name", sortable: true },
  { key: "team", header: "Team" },
];

function neutral(rows: Row[] = ROWS) {
  const engine = createTableEngine({
    data: rows,
    columns: COLUMNS,
    rowKey: (row: Row) => row.id,
  });
  return createNeutralTable(engine, "demo", {
    visibleRows: () => rows,
    operations: () => ({ setPage: true }),
  });
}

describe("transportCellValue", () => {
  it("passes JSON-native values through untouched", () => {
    expect(transportCellValue(null)).toBeNull();
    expect(transportCellValue(undefined)).toBeUndefined();
    expect(transportCellValue("Ada")).toBe("Ada");
    expect(transportCellValue(7)).toBe(7);
    expect(transportCellValue(false)).toBe(false);
    const plain = { city: "Paris" };
    expect(transportCellValue(plain)).toBe(plain);
  });

  it("names what it cannot send, rather than inventing a string for it", () => {
    expect(transportCellValue(42n)).toBe("42");
    expect(transportCellValue(Symbol("secret"))).toBe("Symbol(secret)");
    expect(transportCellValue(new Date("2026-09-06T00:00:00.000Z"))).toBe(
      "2026-09-06T00:00:00.000Z"
    );
    function Chip() {
      return null;
    }
    expect(transportCellValue(Chip)).toEqual({
      __adapttable: "function",
      name: "Chip",
    });
    const circular: { self?: unknown } = {};
    circular.self = circular;
    expect(transportCellValue(circular)).toEqual({
      __adapttable: "unserializable",
      kind: "object",
    });
  });
});

describe("agentColumnsFromNeutral", () => {
  it("names a column by its key when the header is not text", () => {
    const engine = createTableEngine({
      data: ROWS,
      columns: [
        { key: "name", header: { rendered: true } },
        { key: "team", header: "" },
      ],
      rowKey: (row: Row) => row.id,
    });
    const table = createNeutralTable(engine, "rendered", {
      visibleRows: () => ROWS,
    });
    expect(agentColumnsFromNeutral(table).map((c) => c.label)).toEqual([
      "name",
      "team",
    ]);
  });

  it("infers each column's type from the first row it can see", () => {
    interface Mixed {
      id: string;
      count: number;
      active: boolean;
      huge: bigint;
      label: string;
      when: Date;
      missing: null;
      opaque: { deep: true };
    }
    const row: Mixed = {
      id: "1",
      count: 3,
      active: true,
      huge: 9n,
      label: "text",
      when: new Date("2026-01-01T00:00:00.000Z"),
      missing: null,
      opaque: { deep: true },
    };
    const keys = [
      "count",
      "active",
      "huge",
      "label",
      "when",
      "missing",
      "opaque",
    ] as const;
    const engine = createTableEngine({
      data: [row],
      columns: keys.map((key) => ({ key, header: key })),
      rowKey: (r: Mixed) => r.id,
    });
    const table = createNeutralTable(engine, "mixed", {
      visibleRows: () => [row],
    });
    expect(
      Object.fromEntries(
        agentColumnsFromNeutral(table).map((c) => [c.id, c.type])
      )
    ).toEqual({
      count: "number",
      active: "boolean",
      huge: "bigint",
      label: "string",
      when: "date",
      missing: "unknown",
      opaque: "unknown",
    });
  });

  it("reports every column as unknown when there is no row to sample", () => {
    const table = neutral([]);
    expect(agentColumnsFromNeutral(table).map((c) => c.type)).toEqual([
      "unknown",
      "unknown",
    ]);
  });
});

describe("readRowsFromNeutral", () => {
  it("returns only the columns the caller asked for", () => {
    const table = neutral();
    const columns = agentColumnsFromNeutral(table);
    const window = readRowsFromNeutral(
      table,
      columns,
      { offset: 0, limit: 2, columns: ["team"], scope: "visible" },
      50
    );
    expect(window.rows.map((r) => r.cells)).toEqual([
      { team: "ops" },
      { team: "eng" },
    ]);
  });
});

describe("resolveRowFromNeutral", () => {
  it("takes a key reference at its word, without walking the window", () => {
    const table = neutral();
    expect(resolveRowFromNeutral(table, { rowKey: "gone" })).toEqual({
      rowKey: "gone",
      scope: "visible",
    });
  });

  it("refuses a position past the end of the scope it names", () => {
    const table = neutral();
    expect(() =>
      resolveRowFromNeutral(table, {
        position: 9,
        scope: "visible",
        expectedRevision: 0,
      })
    ).toThrow(/no row at 1-based position 9/);
  });
});

describe("scope reporting", () => {
  it("lets a source of unknown length step one page forward", () => {
    const engine = createTableEngine({
      data: ROWS,
      columns: COLUMNS,
      rowKey: (row: Row) => row.id,
      defaults: { page: 1, limit: 2 },
    });
    const table = createNeutralTable(engine, "paged", {
      visibleRows: () => ROWS.slice(0, 2),
    });
    Object.defineProperty(table, "capabilities", {
      get: () => ({
        fullDataset: false,
        grouping: false,
        selectAcrossPages: false,
        exportScope: "page" as const,
        totalCount: "loaded" as const,
      }),
    });
    // Nothing here knows where the data ends, so the bound is one step past
    // where the reader is: walking forward is how the end gets found, and
    // refusing to move is the wrong answer to "we cannot prove there is more".
    expect(pageMaxFromNeutral(table, 2, 1)).toBe(2);
    expect(pageMaxFromNeutral(table, 2, 7)).toBe(8);
  });

  it("addresses rows by page when the page is a window onto more data", () => {
    const engine = createTableEngine({
      data: ROWS,
      columns: COLUMNS,
      rowKey: (row: Row) => row.id,
      defaults: { page: 1, limit: 2 },
    });
    const table = createNeutralTable(engine, "windowed", {
      visibleRows: () => engine.rows("page"),
    });
    expect(table.capabilities.fullDataset).toBe(true);
    // Three rows at two a page is two pages — a page count, never the row
    // count, which would let an agent report a move to a page that is not
    // there and the table would sit exactly where it was.
    expect(pageMaxFromNeutral(table, 2, 1)).toBe(2);
    expect(rowAddressScopeForNeutral(table)).toBe("page");
  });

  it("gives a table that fits on one page exactly one page", () => {
    const engine = createTableEngine({
      data: ROWS,
      columns: COLUMNS,
      rowKey: (row: Row) => row.id,
    });
    const table = createNeutralTable(engine, "single", {
      visibleRows: () => ROWS,
    });
    expect(pageMaxFromNeutral(table, 10, 1)).toBe(1);
  });

  it("falls back to visible when the two windows differ in length", () => {
    const engine = createTableEngine({
      data: ROWS,
      columns: COLUMNS,
      rowKey: (row: Row) => row.id,
    });
    const table = createNeutralTable(engine, "shorter", {
      visibleRows: () => ROWS.slice(0, 1),
    });
    expect(rowAddressScopeForNeutral(table)).toBe("visible");
  });
});

describe("observationFromNeutral", () => {
  it("reads the visible scope when the caller names none", () => {
    const table = neutral();
    const columns = agentColumnsFromNeutral(table);
    const window = readRowsFromNeutral(
      table,
      columns,
      { offset: 1, limit: 1 },
      50
    );
    expect(window.rows.map((r) => r.rowKey)).toEqual(["2"]);
  });

  it("offers saved views only when the feature and the handler are both there", () => {
    const table = neutral();
    const without = observationFromNeutral(table, { tableId: "demo" }, 1, {}, [
      "saved-views",
    ]);
    expect(without.hasSavedViews).toBe(false);
    const with_ = observationFromNeutral(
      table,
      { tableId: "demo" },
      1,
      { applyView: () => undefined },
      ["saved-views"]
    );
    expect(with_.hasSavedViews).toBe(true);
  });

  it("falls back to a usable page size when the table shows no rows", () => {
    const empty = neutral([]);
    const observation = observationFromNeutral(
      empty,
      { tableId: "demo" },
      1,
      {},
      []
    );
    expect(observation.limit).toBe(10);
    expect(observation.pageMax).toBe(1);
  });

  it("takes the query overlay over what the engine currently shows", () => {
    const table = neutral();
    const observation = observationFromNeutral(
      table,
      { tableId: "demo" },
      7,
      {},
      [],
      { page: 3, limit: 25, search: "ada", sortBy: "name", sortDir: "desc" }
    );
    expect(observation).toMatchObject({
      viewRevision: 7,
      page: 3,
      limit: 25,
      search: "ada",
      sortBy: "name",
      sortDir: "desc",
    });
  });
});

describe("monotonicRevision", () => {
  it("reports a bump only once it has something to compare against", () => {
    const table = neutral();
    const first = monotonicRevision(table.revisions, undefined);
    expect(first.bumped).toBe(false);
    expect(monotonicRevision(table.revisions, first.token).bumped).toBe(false);
    expect(monotonicRevision(table.revisions, "stale-token").bumped).toBe(true);
  });
});

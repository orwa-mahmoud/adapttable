/**
 * The lean assembly is what a table costs before a single optional feature is
 * composed: identity splicing, 1×1 cells, no resize handle. Every one of these
 * defaults exists so an omitted feature stays out of the bundle, so what has
 * to hold is that they behave — and that a composed feature's own
 * implementation replaces exactly the entry it supplies and nothing else.
 */
import { describe, expect, it } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import {
  bodyRowEntries,
  columnSelectLabel,
  filterDefForColumn,
  isExtraEntry,
  LEAN_ASSEMBLY,
  pinnedRowPart,
  resolveAssembly,
  rowFlashSignature,
  rowReorderDropStyle,
} from "./leanAssembly";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Grace" },
];

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", header: "Name" },
  { key: "team", header: "Team" },
];

const getRowId = (row: Row) => row.id;

describe("the lean body cells", () => {
  it("gives every column a 1×1 cell, keyed by row", () => {
    const cells = LEAN_ASSEMBLY.buildBodyCells({
      rows: ROWS,
      columns: COLUMNS,
      getRowId,
    } as never);
    expect([...cells.keys()]).toEqual(["r1", "r2"]);
    expect(cells.get("r1")).toEqual([
      { column: COLUMNS[0], columnIndex: 0, colSpan: 1, rowSpan: 1 },
      { column: COLUMNS[1], columnIndex: 1, colSpan: 1, rowSpan: 1 },
    ]);
  });

  it("renders only the windowed columns when virtualization asks for a slice", () => {
    const cells = LEAN_ASSEMBLY.buildBodyCells({
      rows: ROWS,
      columns: COLUMNS,
      getRowId,
      windowKeys: new Set(["team"]),
    } as never);
    expect(cells.get("r1")?.map((cell) => cell.column.key)).toEqual(["team"]);
  });

  it("inflates no row spans, because spanning is a feature", () => {
    const cells = LEAN_ASSEMBLY.buildBodyCells({
      rows: ROWS,
      columns: COLUMNS,
      getRowId,
    } as never);
    expect(LEAN_ASSEMBLY.inflateBodyCellRowSpans(cells, [], undefined)).toBe(
      cells
    );
  });
});

describe("the lean extra-row splicing", () => {
  it("returns the entries it was given", () => {
    const entries = [{ key: "r1" }, { key: "r2" }];
    expect(
      LEAN_ASSEMBLY.insertExtraRows(entries, undefined, () => undefined)
    ).toBe(entries);
  });

  it("keys rows without inserting anything between them", () => {
    expect(
      LEAN_ASSEMBLY.insertExtrasBeforeRows(ROWS, undefined, getRowId as never)
    ).toEqual([
      { key: "r1", row: ROWS[0] },
      { key: "r2", row: ROWS[1] },
    ]);
  });

  it("covers no table slots and offers no resize handle", () => {
    expect(
      LEAN_ASSEMBLY.extraCoveredTableSlots("r1", {
        visualIds: [],
        cellsByRow: new Map(),
        leadingCells: 0,
      })
    ).toEqual(new Set());
    expect(
      LEAN_ASSEMBLY.columnResizeHandleProps("name", () => undefined, "Resize")
    ).toBeUndefined();
  });
});

describe("resolveAssembly", () => {
  it("replaces only what a composed feature supplies", () => {
    const buildBodyCells = () => new Map();
    const resolved = resolveAssembly<Row>({ buildBodyCells });
    expect(resolved.buildBodyCells).toBe(buildBodyCells);
    expect(resolved.insertExtraRows).toBe(LEAN_ASSEMBLY.insertExtraRows);
  });

  it("is the lean set when nothing is composed", () => {
    expect(resolveAssembly()).toEqual(LEAN_ASSEMBLY);
  });
});

describe("filterDefForColumn", () => {
  it("matches a def by its column, falling back to its key", () => {
    const defs = [
      { key: "search", column: "name", type: "text" as const },
      { key: "team", type: "text" as const },
    ];
    expect(filterDefForColumn(defs, "name")?.key).toBe("search");
    expect(filterDefForColumn(defs, "team")?.key).toBe("team");
    expect(filterDefForColumn(defs, "salary")).toBeUndefined();
  });
});

describe("columnSelectLabel", () => {
  it("names the column, by header when it is text and by key otherwise", () => {
    expect(
      columnSelectLabel("Select column", { key: "name", header: "Name" })
    ).toBe("Select column: Name");
    expect(columnSelectLabel(undefined, { key: "notes" })).toBe(
      "Select column: notes"
    );
    expect(
      columnSelectLabel("Pick", { key: "cell", header: { rendered: true } })
    ).toBe("Pick: cell");
  });
});

describe("rowFlashSignature", () => {
  it("is empty when nothing is flashing at all", () => {
    expect(rowFlashSignature(undefined, "r1", COLUMNS)).toBe("");
  });

  it("names the flashing columns of that row, in column order", () => {
    const flashing = (rowId: string, key: string) =>
      rowId === "r1" && key !== "name";
    expect(rowFlashSignature(flashing, "r1", COLUMNS)).toBe("team");
    expect(rowFlashSignature(flashing, "r2", COLUMNS)).toBe("");
  });
});

describe("isExtraEntry", () => {
  it("recognises the two host-injected kinds and nothing else", () => {
    expect(isExtraEntry({ kind: "separator" })).toBe(true);
    expect(isExtraEntry({ kind: "fullWidth" })).toBe(true);
    expect(isExtraEntry({ kind: "row" })).toBe(false);
    expect(isExtraEntry({ key: "r1" })).toBe(false);
  });
});

describe("pinnedRowPart", () => {
  it("names the part only for a pinned row", () => {
    expect(pinnedRowPart("top")).toBe("pinned-top");
    expect(pinnedRowPart("bottom")).toBe("pinned-bottom");
    expect(pinnedRowPart(undefined)).toBeUndefined();
  });
});

describe("rowReorderDropStyle", () => {
  it("paints nothing when no drag is in progress", () => {
    expect(rowReorderDropStyle(undefined)).toEqual({});
  });

  it("lifts the row being dragged", () => {
    const opacity = rowReorderDropStyle({ "data-dragging": "" }).opacity;
    expect(typeof opacity).toBe("number");
    expect(opacity).toBeCloseTo(0.45, 5);
  });

  it("draws the drop edge the pointer is over", () => {
    expect(rowReorderDropStyle({ "data-drop": "before" }).boxShadow).toBe(
      "inset 0 2px 0 0 currentColor"
    );
    expect(rowReorderDropStyle({ "data-drop": "after" }).boxShadow).toBe(
      "inset 0 -2px 0 0 currentColor"
    );
    expect(rowReorderDropStyle({ "data-drop": "inside" }).boxShadow).toBe(
      "inset 0 0 0 2px currentColor"
    );
    expect(rowReorderDropStyle({})).toEqual({
      opacity: undefined,
      boxShadow: undefined,
    });
  });
});

describe("bodyRowEntries", () => {
  const flat = [
    { row: ROWS[0]!, index: 0, key: "r1", sourceIndex: 5 },
    { row: ROWS[1]!, index: 1, key: "r2" },
  ];

  it("renders the flat list when no tree is armed", () => {
    expect(bodyRowEntries(flat)).toEqual([
      { row: ROWS[0], index: 0, key: "r1", sourceIndex: 5 },
      { row: ROWS[1], index: 1, key: "r2", sourceIndex: undefined },
    ]);
  });

  it("renders the tree's own entries, renumbered by position", () => {
    const entries = [
      { row: ROWS[1]!, key: "r2", level: 0, hasChildren: false },
      { row: ROWS[0]!, key: "r1", level: 1, hasChildren: false },
    ];
    const out = bodyRowEntries(flat, { entries } as never);
    expect(out.map((entry) => entry.key)).toEqual(["r2", "r1"]);
    expect(out.map((entry) => entry.index)).toEqual([0, 1]);
    expect(out[1]?.treeEntry?.level).toBe(1);
  });
});

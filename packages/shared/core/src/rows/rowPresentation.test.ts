/**
 * Everything a row's own paint depends on: its height and style, the sticky
 * geometry when it is pinned, and the digests a virtualized row is memoized
 * against. The digests matter most — a row that keeps a stale one keeps a
 * stale paint, and the reader sees an edit, a conflict or a pin that is no
 * longer there.
 */
import { describe, expect, it, vi } from "vitest";

import type { BodyCell } from "./cellSpan";
import type { EditableCellEditing } from "./rowEditingDigest";
import {
  bodyCellsHaveRowSpan,
  cellsForRow,
  estimateFromRowHeight,
  extraHostFillStyle,
  partitionPinnedRows,
  pinnedRowCellStyle,
  pinnedRowSticky,
  pinnedRowStickyStyle,
  resolveRowHeight,
  resolveRowStyle,
  rowEditingSignature,
  rowIsDirty,
  rowPinSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "./rowPresentation";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "r1", name: "Ada" },
  { id: "r2", name: "Grace" },
  { id: "r3", name: "Lin" },
];

const getRowId = (row: Row) => row.id;

describe("resolveRowHeight", () => {
  it("takes a constant, a per-row function, or nothing", () => {
    expect(resolveRowHeight(undefined, ROWS[0]!, 0)).toBeUndefined();
    expect(resolveRowHeight(40, ROWS[0]!, 0)).toBe(40);
    expect(resolveRowHeight((_row, index) => 20 + index, ROWS[1]!, 1)).toBe(21);
  });
});

describe("resolveRowStyle", () => {
  it("is absent when the host asked for neither style nor height", () => {
    expect(resolveRowStyle(undefined, undefined, ROWS[0]!, 0)).toBeUndefined();
  });

  it("passes the host's style through when no height is set", () => {
    const style = { backgroundColor: "red" };
    expect(resolveRowStyle(() => style, undefined, ROWS[0]!, 0)).toBe(style);
  });

  it("merges the height onto the style", () => {
    expect(
      resolveRowStyle(() => ({ backgroundColor: "red" }), 40, ROWS[0]!, 0)
    ).toEqual({ backgroundColor: "red", height: 40 });
    expect(resolveRowStyle(undefined, 40, ROWS[0]!, 0)).toEqual({ height: 40 });
  });
});

describe("rowStyleSignature", () => {
  it("changes when the style does, and is empty when there is none", () => {
    expect(rowStyleSignature(undefined)).toBe("");
    expect(rowStyleSignature({ height: 40 })).not.toBe(
      rowStyleSignature({ height: 41 })
    );
  });
});

describe("estimateFromRowHeight", () => {
  const rowAt = (index: number) =>
    index < ROWS.length ? { row: ROWS[index]!, index } : undefined;

  it("uses the caller's fallback when no height is declared", () => {
    expect(estimateFromRowHeight(undefined, 32, rowAt)(0)).toBe(32);
  });

  it("uses a constant height for every row without looking one up", () => {
    const lookup = vi.fn(rowAt);
    expect(estimateFromRowHeight(40, 32, lookup)(9)).toBe(40);
    expect(lookup).not.toHaveBeenCalled();
  });

  it("measures the row at that index, falling back past the end", () => {
    const estimate = estimateFromRowHeight(
      (_row, index) => 20 + index,
      32,
      rowAt
    );
    expect(estimate(1)).toBe(21);
    expect(estimate(99)).toBe(32);
  });
});

describe("extraHostFillStyle", () => {
  const extras = [
    { key: "note", kind: "fullWidth" as const, beforeRowId: "r2" },
  ];

  it("is absent unless an extra sits before a row that is on screen", () => {
    const style = () => ({ backgroundColor: "red" });
    expect(
      extraHostFillStyle("note", undefined, ROWS, getRowId, style)
    ).toBeUndefined();
    expect(
      extraHostFillStyle("missing", extras, ROWS, getRowId, style)
    ).toBeUndefined();
    expect(
      extraHostFillStyle(
        "note",
        [{ key: "note", kind: "fullWidth" }],
        ROWS,
        getRowId,
        style
      )
    ).toBeUndefined();
    expect(
      extraHostFillStyle("note", extras, [ROWS[0]!], getRowId, style)
    ).toBeUndefined();
  });

  it("carries only the host row's fill, not its whole style", () => {
    expect(
      extraHostFillStyle("note", extras, ROWS, getRowId, () => ({
        backgroundColor: "red",
        height: 40,
      }))
    ).toEqual({ backgroundColor: "red" });
    expect(
      extraHostFillStyle("note", extras, ROWS, getRowId, () => ({
        background: "linear-gradient(red, blue)",
      }))
    ).toEqual({ background: "linear-gradient(red, blue)" });
  });

  it("is absent when the host row has no fill of its own", () => {
    expect(
      extraHostFillStyle("note", extras, ROWS, getRowId, () => ({ height: 40 }))
    ).toBeUndefined();
    expect(
      extraHostFillStyle("note", extras, ROWS, getRowId, undefined)
    ).toBeUndefined();
  });
});

describe("the cell-span helpers", () => {
  const cell = (key: string, colSpan = 1, rowSpan = 1): BodyCell<Row> => ({
    column: { key },
    columnIndex: 0,
    colSpan,
    rowSpan,
  });

  it("reports whether any origin cell is taller than one row", () => {
    expect(bodyCellsHaveRowSpan(new Map([["r1", [cell("a")]]]))).toBe(false);
    expect(bodyCellsHaveRowSpan(new Map([["r1", [cell("a", 1, 2)]]]))).toBe(
      true
    );
  });

  it("digests a row's spans so a change repaints it", () => {
    expect(rowSpanSignature(undefined)).toBe("");
    expect(rowSpanSignature([])).toBe("");
    expect(rowSpanSignature([cell("a", 2, 1), cell("b")])).toBe("a:2x1,b:1x1");
  });

  it("answers an unknown row with no cells rather than undefined", () => {
    const map = new Map([["r1", [cell("a")]]]);
    expect(cellsForRow(map, "r1")).toHaveLength(1);
    expect(cellsForRow(map, "r9")).toEqual([]);
    expect(cellsForRow(undefined, "r1")).toEqual([]);
  });
});

describe("the pinned-row geometry", () => {
  it("sticks a top pin under the header and a bottom pin to the floor", () => {
    expect(pinnedRowStickyStyle("top", 36)).toEqual({
      position: "sticky",
      top: 36,
      zIndex: 2,
    });
    expect(pinnedRowStickyStyle("bottom", 36)).toEqual({
      position: "sticky",
      bottom: 0,
      zIndex: 2,
    });
  });

  it("applies nothing unless the row is pinned and sticky is on", () => {
    expect(pinnedRowSticky(undefined, true, 36)).toBeUndefined();
    expect(pinnedRowSticky("top", false, 36)).toBeUndefined();
    expect(pinnedRowSticky("top", true, 36)?.top).toBe(36);
    expect(pinnedRowSticky("bottom", true, 36)?.bottom).toBe(0);
  });

  it("lifts a pinned cell inside a pinned row above its neighbours", () => {
    expect(pinnedRowCellStyle(undefined, 36, false)).toEqual({});
    expect(pinnedRowCellStyle("top", 36, false)).toEqual({
      position: "sticky",
      top: 36,
      zIndex: 2,
    });
    expect(pinnedRowCellStyle("bottom", 36, true)).toEqual({
      position: "sticky",
      bottom: 0,
      zIndex: 3,
    });
  });
});

describe("partitionPinnedRows", () => {
  it("splits the list in the pin order the host recorded", () => {
    const parts = partitionPinnedRows(
      ROWS,
      { top: ["r3", "gone"], bottom: ["r1"] },
      getRowId
    );
    expect(parts.top.map(getRowId)).toEqual(["r3"]);
    expect(parts.bottom.map(getRowId)).toEqual(["r1"]);
    expect(parts.scroll.map(getRowId)).toEqual(["r2"]);
  });

  it("leaves every row in the scroll window when nothing is pinned", () => {
    const parts = partitionPinnedRows(ROWS, { top: [], bottom: [] }, getRowId);
    expect(parts.scroll).toHaveLength(3);
  });
});

describe("rowPinSignature", () => {
  it("is null when pinning is not composed, and the side otherwise", () => {
    expect(rowPinSignature(undefined, "r1")).toBeNull();
    const pinning = {
      sideOf: (id: string) => (id === "r1" ? "top" : undefined),
    };
    expect(rowPinSignature(pinning as never, "r1")).toBe("top");
    expect(rowPinSignature(pinning as never, "r2")).toBe("");
  });
});

describe("the editing digests", () => {
  function editing(patch: Partial<EditableCellEditing<Row>> = {}) {
    return { state: {}, ...patch } as EditableCellEditing<Row>;
  }

  it("reports a row clean when editing is not composed", () => {
    expect(rowIsDirty(undefined, "r1")).toBe(false);
    expect(rowIsDirty(editing(), "r1")).toBe(false);
    expect(
      rowIsDirty(editing({ dirty: { isRowDirty: (id) => id === "r1" } }), "r1")
    ).toBe(true);
  });

  it("has no digest at all when editing is not composed", () => {
    expect(rowEditingSignature(undefined, "r1")).toBeNull();
  });

  it("carries the active cell, its draft, its error and its busy state", () => {
    const digest = rowEditingSignature(
      editing({
        state: { active: { rowId: "r1", columnKey: "name" }, draft: "Adah" },
        validation: {
          rowHasError: () => false,
          isValidating: () => true,
          errorFor: () => "Too short",
        },
      }),
      "r1"
    );
    expect(digest).toContain("name:Adah:Too short:1");
  });

  it("marks an invalid row that is not the one being edited", () => {
    const digest = rowEditingSignature(
      editing({
        state: { active: { rowId: "r2", columnKey: "name" } },
        validation: {
          rowHasError: (id) => id === "r1",
          isValidating: () => false,
          errorFor: () => undefined,
        },
      }),
      "r1"
    );
    expect(digest?.startsWith("invalid")).toBe(true);
  });

  it("keeps only the signatures that name this row", () => {
    const digest = rowEditingSignature(
      editing({
        state: {},
        saving: { signature: "r2 saving" },
        dirty: { isRowDirty: () => false, signature: "r1 dirty" },
        batch: { signature: "r1:a;r2:b" },
        rowEditing: { activeRowId: "r1", signature: "row-draft" },
      }),
      "r1"
    );
    expect(digest).toContain("r1 dirty");
    expect(digest).not.toContain("r2 saving");
    expect(digest).toContain("r1:a");
    expect(digest).toContain("row-draft");
  });

  it("changes when a conflict arrives on this row", () => {
    const withConflict = rowEditingSignature(
      editing({
        state: {},
        conflict: {
          current: { rowId: "r1", columnKey: "name", incomingValue: "Arrived" },
        },
      }),
      "r1"
    );
    expect(withConflict).toContain("conflict:name:Arrived");
    const otherRow = rowEditingSignature(
      editing({
        state: {},
        conflict: {
          current: { rowId: "r2", columnKey: "name", incomingValue: "Arrived" },
        },
      }),
      "r1"
    );
    expect(otherRow).not.toContain("conflict");
  });
});

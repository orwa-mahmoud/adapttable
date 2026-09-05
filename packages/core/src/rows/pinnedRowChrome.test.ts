import { describe, expect, it } from "vitest";

import { PIN_Z } from "../columns/columnLayoutModel";
import {
  orderedCardEntries,
  PINNED_BOTTOM_PART,
  PINNED_TOP_PART,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  pinnedRowStickyStyle,
} from "./pinnedRowChrome";

describe("pinnedRowPart", () => {
  it("names the pin side and stays undefined when the row is free", () => {
    expect(pinnedRowPart("top")).toBe(PINNED_TOP_PART);
    expect(pinnedRowPart("bottom")).toBe(PINNED_BOTTOM_PART);
    expect(pinnedRowPart(undefined)).toBeUndefined();
  });
});

describe("pinnedRowSticky", () => {
  it("is undefined unless the row is pinned and sticky", () => {
    expect(pinnedRowSticky(undefined, true, 48)).toBeUndefined();
    expect(pinnedRowSticky("top", false, 48)).toBeUndefined();
    expect(pinnedRowSticky("top", true, 48)).toEqual(
      pinnedRowStickyStyle("top", 48)
    );
    expect(pinnedRowSticky("bottom", true, 48)).toEqual(
      pinnedRowStickyStyle("bottom", 0)
    );
  });
});

describe("pinnedRowStickyStyle", () => {
  it("sticks top rows under the header and bottom rows to the floor", () => {
    expect(pinnedRowStickyStyle("top", 48)).toEqual({
      position: "sticky",
      top: 48,
      zIndex: PIN_Z.rowPinned,
    });
    expect(pinnedRowStickyStyle("bottom", 0)).toEqual({
      position: "sticky",
      bottom: 0,
      zIndex: PIN_Z.rowPinned,
    });
  });
});

describe("pinnedRowCellStyle", () => {
  it("is empty when the row is not pinned", () => {
    expect(pinnedRowCellStyle(undefined, 40, false)).toEqual({});
  });

  it("raises a pinned-column cell above a plain pinned row", () => {
    expect(pinnedRowCellStyle("top", 40, true)).toEqual({
      position: "sticky",
      top: 40,
      zIndex: PIN_Z.rowPinnedColumn,
    });
    expect(pinnedRowCellStyle("bottom", 0, false).zIndex).toBe(PIN_Z.rowPinned);
  });
});

describe("orderedCardEntries", () => {
  const rows = [
    { id: "a", name: "Ada" },
    { id: "b", name: "Grace" },
    { id: "c", name: "Alan" },
  ];
  const id = (row: (typeof rows)[number]) => row.id;

  it("returns the window unchanged when nothing is pinned", () => {
    expect(
      orderedCardEntries(rows, id, undefined, [], []).map((e) => e.key)
    ).toEqual(["a", "b", "c"]);
  });

  it("puts top pins first and bottom pins last, once", () => {
    const next = orderedCardEntries(
      rows,
      id,
      undefined,
      [rows[2]!],
      [rows[0]!]
    );
    expect(next.map((e) => e.key)).toEqual(["c", "b", "a"]);
    expect(next[0]?.sourceIndex).toBe(2);
  });

  it("wraps host summary objects outside lifted pins", () => {
    const totals = { id: "totals", name: "Totals" };
    const grand = { id: "grand", name: "Grand" };
    const next = orderedCardEntries(
      rows,
      id,
      undefined,
      [rows[2]!],
      [rows[0]!],
      [totals],
      [grand]
    );
    expect(next.map((e) => e.key)).toEqual([
      "adapttable:pinned-summary:top:0",
      "c",
      "b",
      "a",
      "adapttable:pinned-summary:bottom:0",
    ]);
  });
});

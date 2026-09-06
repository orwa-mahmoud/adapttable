/**
 * A pinned cell sticks to a LOGICAL edge, so the same state has to produce
 * `insetInlineStart` under `dir="ltr"` and the mirrored edge under `dir="rtl"`
 * without the adapter doing arithmetic. The leads are what keeps a pinned data
 * column clear of the selection checkbox and the actions column in front of it.
 */
import { describe, expect, it } from "vitest";

import { edgePinStyle, PIN_Z, pinnedCellStyle } from "./columnLayoutModel";

describe("pinnedCellStyle", () => {
  it("is absent for a column that is not pinned", () => {
    expect(pinnedCellStyle(undefined)).toBeUndefined();
  });

  it("sticks to the logical edge the pin names", () => {
    expect(pinnedCellStyle({ side: "start", inset: 120 })).toEqual({
      position: "sticky",
      insetInlineStart: 120,
      zIndex: 1,
    });
    expect(pinnedCellStyle({ side: "end", inset: 40 }, PIN_Z.header)).toEqual({
      position: "sticky",
      insetInlineEnd: 40,
      zIndex: PIN_Z.header,
    });
  });

  it("adds the width the chrome column in front of it already claimed", () => {
    expect(
      pinnedCellStyle({ side: "start", inset: 100 }, 1, { start: 48 })
    ).toMatchObject({ insetInlineStart: 148 });
    expect(
      pinnedCellStyle({ side: "start", inset: 100 }, 1, { end: 48 })
    ).toMatchObject({ insetInlineStart: 100 });
  });
});

describe("edgePinStyle", () => {
  it("is absent until the edge column is actually pinned", () => {
    expect(edgePinStyle("start", false)).toBeUndefined();
  });

  it("sticks the leading and trailing chrome columns to their own edges", () => {
    expect(edgePinStyle("start", true)).toEqual({
      position: "sticky",
      insetInlineStart: 0,
      zIndex: PIN_Z.body,
    });
    expect(edgePinStyle("end", true, PIN_Z.headerPinned)).toEqual({
      position: "sticky",
      insetInlineEnd: 0,
      zIndex: PIN_Z.headerPinned,
    });
  });
});

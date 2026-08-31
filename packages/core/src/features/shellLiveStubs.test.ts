import { describe, expect, it } from "vitest";

import { windowedTableAria } from "./shellLiveStubs";

describe("windowedTableAria", () => {
  it("states the dataset size when only a page of rows is in the DOM", () => {
    const aria = windowedTableAria({
      rowCount: 10,
      rowsLength: 2,
      columnsLength: 3,
      columnsWindowed: false,
      firstRowIndex: 4,
    });
    expect(aria.getGridProps()).toEqual({ "aria-rowcount": 10 });
    expect(aria.getRowPropsAt(0)).toEqual({ "aria-rowindex": 5 });
    expect(aria.getCellPropsAt(0, 1)).toEqual({});
    expect(aria.getColumnHeaderProps(1)).toEqual({});
  });

  it("states each column's absolute index when the horizontal axis is windowed", () => {
    const aria = windowedTableAria({
      rowCount: 3,
      rowsLength: 3,
      columnsLength: 40,
      columnsWindowed: true,
      firstRowIndex: 0,
    });
    expect(aria.getGridProps()).toEqual({ "aria-colcount": 40 });
    expect(aria.getCellPropsAt(0, 12)).toEqual({ "aria-colindex": 13 });
    expect(aria.getColumnHeaderProps(12)).toEqual({ "aria-colindex": 13 });
    expect(aria.getRowPropsAt(0)).toEqual({});
  });

  it("says nothing when every row and column is in the DOM", () => {
    const aria = windowedTableAria({
      rowCount: 3,
      rowsLength: 3,
      columnsLength: 2,
      columnsWindowed: false,
      firstRowIndex: 0,
    });
    expect(aria.getGridProps()).toEqual({});
    expect(aria.getRowPropsAt(0)).toEqual({});
    expect(aria.getCellPropsAt(0, 0)).toEqual({});
  });
});

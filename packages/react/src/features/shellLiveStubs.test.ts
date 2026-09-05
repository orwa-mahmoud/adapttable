import { describe, expect, it } from "vitest";

import {
  DISABLED_EXPORT,
  DISABLED_FIND,
  DISABLED_FULLSCREEN,
  disabledColumnWindow,
  disabledGridFocus,
  disabledHistory,
  windowedTableAria,
} from "./shellLiveStubs";

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

/**
 * The contract for a table that composed none of these features.
 *
 * An adapter asks the same questions either way — what are this cell's props,
 * can I undo, is this column selected — so every stand-in has to answer them
 * inertly rather than be absent. A stub that throws, or that quietly claims a
 * feature is on, breaks a lean table at render time.
 */
describe("the stand-ins a lean table hands its adapter", () => {
  it("answers every grid-focus question without claiming to navigate", () => {
    const focus = disabledGridFocus();

    expect(focus.enabled).toBe(false);
    expect(focus.active).toBeNull();
    expect(focus.range).toBeNull();
    expect(focus.columnCheckbox).toBe(false);
    expect(focus.isColumnSelected(0)).toBe(false);
    expect(focus.getGridProps()).toEqual({});
    expect(focus.getCellProps({ row: 0, col: 0 })).toEqual({});
    expect(focus.getRowProps(0)).toEqual({});
    expect(focus.getFillHandleProps()).toEqual({});

    // The writers are the ones a keyboard handler calls blind.
    expect(() => {
      focus.selectRange(null);
      focus.selectColumn(0);
      focus.toggleColumn(0);
      focus.focusCell({ row: 0, col: 0 });
      focus.copyCells();
    }).not.toThrow();
  });

  it("offers a history that can neither undo nor redo", () => {
    const history = disabledHistory();

    expect(history.enabled).toBe(false);
    expect(history.canUndo).toBe(false);
    expect(history.canRedo).toBe(false);
    expect(history.undo()).toBe(0);
    expect(history.redo()).toBe(0);
    expect(() => {
      history.clear();
      history.record([{ row: {}, columnKey: "a", value: 2 }]);
    }).not.toThrow();
  });

  it("keeps every column when nothing windows the horizontal axis", () => {
    const columns = [{ key: "a" }, { key: "b" }];
    expect(disabledColumnWindow(columns)).toEqual({
      enabled: false,
      columns,
      paddingStart: 0,
      paddingEnd: 0,
    });
  });

  it("holds find, export and fullscreen shut", () => {
    expect(DISABLED_FIND.open).toBe(false);
    expect(DISABLED_FIND.matches).toEqual([]);
    expect(() => {
      DISABLED_FIND.setOpen(true);
      DISABLED_FIND.setQuery("x");
      DISABLED_FIND.next();
      DISABLED_FIND.previous();
    }).not.toThrow();
    // Still shut: a stub that accepted the write would lie to the next reader.
    expect(DISABLED_FIND.open).toBe(false);
    expect(DISABLED_FIND.query).toBe("");

    expect(DISABLED_EXPORT.onExportCsv).toBeUndefined();
    expect(DISABLED_EXPORT.exportBusy).toBe(false);

    expect(DISABLED_FULLSCREEN.supported).toBe(false);
    expect(() => {
      DISABLED_FULLSCREEN.toggle();
      DISABLED_FULLSCREEN.exit();
    }).not.toThrow();
    expect(DISABLED_FULLSCREEN.active).toBe(false);
  });
});

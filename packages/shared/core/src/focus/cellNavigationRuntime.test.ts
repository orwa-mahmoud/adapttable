import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../contracts/columns";
import { createEditHistory } from "../editing/editHistory";
import type { CellEdit } from "./cellEdits";
import {
  cellNavigationChannels,
  cellRangeKey,
  reportedCellRange,
} from "./cellNavigationRuntime";

interface Row {
  id: string;
  a: string;
  b: string;
}

const rows: Row[] = [
  { id: "1", a: "x", b: "y" },
  { id: "2", a: "z", b: "w" },
];
const columns: ColumnMetadata<Row>[] = [{ key: "a" }, { key: "b" }];
const edit: CellEdit<Row> = { row: rows[0]!, columnKey: "a", value: "q" };

describe("cellNavigationChannels", () => {
  it("skips cells covered by a span, offset by the window start", () => {
    const channels = cellNavigationChannels<Row>({
      rows,
      columns,
      firstRowIndex: 10,
      host: {
        getCellSpan: ({ rowIndex, columnIndex }) =>
          rowIndex === 10 && columnIndex === 0 ? { colSpan: 2 } : undefined,
      },
      record: vi.fn(),
      undo: () => 0,
      redo: () => 0,
    });
    expect(channels.isCoveredCell?.({ row: 10, col: 1 })).toBe(true);
    expect(channels.isCoveredCell?.({ row: 10, col: 0 })).toBe(false);
    expect(channels.isCoveredCell?.({ row: 11, col: 1 })).toBe(false);
  });

  it("records a paste or fill as one gesture before the host applies it", () => {
    const order: string[] = [];
    const record = vi.fn(() => order.push("record"));
    const onCellPaste = vi.fn(() => order.push("paste"));
    const onCellFill = vi.fn(() => order.push("fill"));
    const undo = vi.fn(() => 2);
    const redo = vi.fn(() => 3);
    const channels = cellNavigationChannels<Row>({
      rows,
      columns,
      host: { onCellPaste, onCellFill },
      record,
      undo,
      redo,
    });
    channels.onPaste?.([edit]);
    channels.onFill?.([edit]);
    expect(order).toEqual(["record", "paste", "record", "fill"]);
    expect(record).toHaveBeenCalledWith([edit]);
    expect(channels.onUndo?.()).toBe(2);
    expect(channels.onRedo?.()).toBe(3);
  });

  it.each(["onPaste", "onFill"] as const)(
    "waits for async inline saves before recording %s",
    async (channel) => {
      let accept!: () => void;
      const saved = new Promise<void>((resolve) => {
        accept = resolve;
      });
      const onCellEdit = vi.fn(() => saved);
      const history = createEditHistory({ enabled: true, columns, onCellEdit });
      const channels = cellNavigationChannels<Row>({
        rows,
        columns,
        host: { onCellEdit },
        record: history.record,
        undo: history.undo,
        redo: history.redo,
      });
      const result = channels[channel]?.([edit]);
      expect(history.getSnapshot()).toEqual({ past: 0, future: 0 });
      accept();
      await result;
      expect(history.getSnapshot()).toEqual({ past: 1, future: 0 });
    }
  );

  it("falls back to the inline-edit channel, and to nothing without one", () => {
    const onCellEdit = vi.fn();
    const withEdit = cellNavigationChannels<Row>({
      rows,
      columns,
      host: { onCellEdit },
      record: vi.fn(),
      undo: () => 0,
      redo: () => 0,
    });
    withEdit.onPaste?.([edit]);
    expect(onCellEdit).toHaveBeenCalledWith(rows[0], "a", "q");

    const readOnly = cellNavigationChannels<Row>({
      rows,
      columns,
      host: {},
      record: vi.fn(),
      undo: () => 0,
      redo: () => 0,
    });
    expect(readOnly.onPaste).toBeUndefined();
    expect(readOnly.onFill).toBeUndefined();
  });
});

describe("range reporting", () => {
  it("reports no range for nothing or a lone focused cell", () => {
    expect(reportedCellRange(null)).toBeNull();
    expect(
      reportedCellRange({
        anchor: { row: 1, col: 1 },
        head: { row: 1, col: 1 },
      })
    ).toBeNull();
    const range = { anchor: { row: 1, col: 1 }, head: { row: 3, col: 0 } };
    expect(reportedCellRange(range)).toBe(range);
  });

  it("keys a rectangle by its corners", () => {
    expect(cellRangeKey(null)).toBe("");
    expect(
      cellRangeKey({ anchor: { row: 1, col: 2 }, head: { row: 3, col: 0 } })
    ).toBe("1:2-3:0");
  });
});

/**
 * Undo and redo, and the boundary that makes them safe.
 *
 * The table owns no data, so every one of these checks the same thing from a
 * different angle: an undo is a COMMIT of the old value through the host's own
 * channel, never a mutation the table performed itself.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import {
  asBatchGesture,
  asGesture,
  readCellValue,
  useEditHistory,
  useTableEditHistory,
} from "./editHistory";

interface Row {
  id: string;
  name: string;
  budget: number;
}
const ADA: Row = { id: "1", name: "Ada", budget: 10 };
const LINUS: Row = { id: "2", name: "Linus", budget: 30 };
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
  { key: "budget", header: "Budget", accessor: (row) => row.budget },
];

const setup = (options?: { enabled?: boolean; depth?: number }) => {
  const onCellEdit = vi.fn();
  const hook = renderHook(() =>
    useEditHistory<Row>({
      enabled: options?.enabled ?? true,
      depth: options?.depth,
      columns: COLUMNS,
      onCellEdit,
    })
  );
  return { hook, onCellEdit };
};

describe("useEditHistory", () => {
  it("commits the previous value back through the host's channel", () => {
    const { hook, onCellEdit } = setup();
    act(() => {
      hook.result.current.record([
        { row: ADA, columnKey: "name", value: "Ada Lovelace" },
      ]);
    });
    expect(hook.result.current.canUndo).toBe(true);
    act(() => {
      hook.result.current.undo();
    });
    // The value the row held BEFORE, not the one that was written.
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(ADA, "name", "Ada");
  });

  it("keeps a value's type — 10 comes back a number, not a string", () => {
    const { hook, onCellEdit } = setup();
    act(() => {
      hook.result.current.record([
        { row: ADA, columnKey: "budget", value: 99 },
      ]);
      hook.result.current.undo();
    });
    expect(onCellEdit.mock.calls[0]?.[2]).toBe(10);
  });

  it("treats a batch as one gesture", () => {
    // Pasting two hundred cells and pressing undo once puts all of them back.
    const { hook, onCellEdit } = setup();
    act(() => {
      hook.result.current.record([
        { row: ADA, columnKey: "name", value: "X" },
        { row: LINUS, columnKey: "name", value: "Y" },
      ]);
    });
    let restored = 0;
    act(() => {
      restored = hook.result.current.undo();
    });
    expect(restored).toBe(2);
    expect(onCellEdit).toHaveBeenCalledTimes(2);
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("redoes what it undid", () => {
    const { hook, onCellEdit } = setup();
    act(() => {
      hook.result.current.record([{ row: ADA, columnKey: "name", value: "X" }]);
      hook.result.current.undo();
    });
    expect(hook.result.current.canRedo).toBe(true);
    act(() => {
      hook.result.current.redo();
    });
    expect(onCellEdit).toHaveBeenLastCalledWith(ADA, "name", "X");
    expect(hook.result.current.canRedo).toBe(false);
  });

  it("drops the redo line when a new edit arrives", () => {
    // The future that was undone is no longer reachable from here.
    const { hook } = setup();
    act(() => {
      hook.result.current.record([{ row: ADA, columnKey: "name", value: "X" }]);
      hook.result.current.undo();
      hook.result.current.record([{ row: ADA, columnKey: "name", value: "Y" }]);
    });
    expect(hook.result.current.canRedo).toBe(false);
  });

  it("answers zero when there is nothing to undo or redo", () => {
    const { hook, onCellEdit } = setup();
    let undone = -1;
    let redone = -1;
    act(() => {
      undone = hook.result.current.undo();
      redone = hook.result.current.redo();
    });
    expect([undone, redone]).toEqual([0, 0]);
    expect(onCellEdit).not.toHaveBeenCalled();
  });

  it("forgets the oldest gesture past the depth", () => {
    const { hook } = setup({ depth: 2 });
    act(() => {
      for (const value of ["a", "b", "c"]) {
        hook.result.current.record([{ row: ADA, columnKey: "name", value }]);
      }
      hook.result.current.undo();
      hook.result.current.undo();
    });
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("records nothing at all when it is off", () => {
    const { hook } = setup({ enabled: false });
    act(() => {
      hook.result.current.record([{ row: ADA, columnKey: "name", value: "X" }]);
    });
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("forgets everything on clear — what a host calls on new data", () => {
    const { hook } = setup();
    act(() => {
      hook.result.current.record([{ row: ADA, columnKey: "name", value: "X" }]);
      hook.result.current.clear();
    });
    expect(hook.result.current.canUndo).toBe(false);
  });

  it("skips an edit naming a column the table does not have", () => {
    const { hook, onCellEdit } = setup();
    act(() => {
      hook.result.current.record([{ row: ADA, columnKey: "ghost", value: 1 }]);
      hook.result.current.undo();
    });
    expect(onCellEdit).not.toHaveBeenCalled();
  });
});

describe("readCellValue", () => {
  it("prefers an explicit editValue", () => {
    expect(
      readCellValue(ADA, { key: "name", header: "N", editValue: () => "seed" })
    ).toBe("seed");
  });

  it("then sortValue, then the key's path", () => {
    expect(
      readCellValue(ADA, { key: "name", header: "N", sortValue: () => 7 })
    ).toBe(7);
    expect(readCellValue(ADA, { key: "budget", header: "B" })).toBe(10);
  });
});

describe("asGesture", () => {
  it("records the batch before the handler can change the rows", () => {
    const order: string[] = [];
    const wrapped = asGesture<Row>(
      () => order.push("apply"),
      () => order.push("record")
    );
    wrapped?.([{ row: ADA, columnKey: "name", value: "X" }]);
    expect(order).toEqual(["record", "apply"]);
  });

  it("is nothing when there was nothing to wrap", () => {
    expect(asGesture<Row>(undefined, vi.fn())).toBeUndefined();
  });
});

describe("asBatchGesture", () => {
  it("records every patched cell before the host applies the batch", () => {
    const order: string[] = [];
    const wrapped = asBatchGesture<Row>(
      () => order.push("apply"),
      (edits) => {
        order.push("record");
        expect(edits).toEqual([
          { row: ADA, columnKey: "name", value: "X" },
          { row: ADA, columnKey: "budget", value: 20 },
        ]);
      }
    );
    wrapped?.([{ row: ADA, rowId: "ada", patch: { name: "X", budget: 20 } }]);
    expect(order).toEqual(["record", "apply"]);
  });

  it("is nothing when there was nothing to wrap", () => {
    expect(asBatchGesture<Row>(undefined, vi.fn())).toBeUndefined();
  });
});

describe("useTableEditHistory", () => {
  it("records an inline commit so undo restores the previous value", () => {
    const onCellEdit = vi.fn();
    const { result } = renderHook(() =>
      useTableEditHistory<Row>({
        editHistory: true,
        columns: COLUMNS,
        onCellEdit,
      })
    );
    act(() => {
      result.current.onCellEdit?.(ADA, "name", "Ada Lovelace");
    });
    expect(onCellEdit).toHaveBeenCalledExactlyOnceWith(
      ADA,
      "name",
      "Ada Lovelace"
    );
    expect(result.current.history.canUndo).toBe(true);
    act(() => {
      result.current.history.undo();
    });
    expect(onCellEdit).toHaveBeenLastCalledWith(ADA, "name", "Ada");
  });
});

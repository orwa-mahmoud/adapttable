/**
 * Reordering a row is a write the host owns. These prove the helper, the
 * dataset offset, and the grab keyboard — Space lifts, arrows move, Space
 * drops, Escape cancels.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  applyRowReorder,
  datasetIndex,
  ROW_REORDER_LIFTED_OPACITY,
  rowReorderDropStyle,
  rowReorderSignature,
  useRowReorder,
} from "./rowReorder";

interface Task {
  id: string;
  title: string;
}

const ROWS: Task[] = [
  { id: "a", title: "Ada" },
  { id: "b", title: "Grace" },
  { id: "c", title: "Alan" },
];

const LABELS = {
  reorderRow: "Reorder row",
  moveRowUp: "Move row up",
  moveRowDown: "Move row down",
  rowLifted: (position: number) => `Row ${String(position)} lifted`,
  rowMoved: (from: number, to: number) =>
    `Row moved from ${String(from)} to ${String(to)}`,
  rowReorderCancelled: "Reorder cancelled",
};

describe("applyRowReorder", () => {
  it("moves a row to a new index without mutating the source", () => {
    const next = applyRowReorder(ROWS, 0, 2);
    expect(next.map((row) => row.id)).toEqual(["b", "c", "a"]);
    expect(ROWS[0]?.id).toBe("a");
  });

  it("moves a later row earlier", () => {
    expect(applyRowReorder(ROWS, 2, 0).map((row) => row.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  it("is a copy when from and to are the same or out of range", () => {
    expect(applyRowReorder(ROWS, 1, 1)).toEqual(ROWS);
    expect(applyRowReorder(ROWS, -1, 0)).toEqual(ROWS);
    expect(applyRowReorder(ROWS, 0, 9)).toEqual(ROWS);
    const hole: (Task | undefined)[] = [undefined, ROWS[1], ROWS[2]];
    expect(applyRowReorder(hole, 0, 2)).toEqual(hole);
  });
});

describe("datasetIndex", () => {
  it("adds the page offset so a windowed table talks in dataset indices", () => {
    expect(datasetIndex(2, 10)).toBe(12);
    expect(datasetIndex(0, 0)).toBe(0);
  });
});

describe("rowReorderSignature", () => {
  it("is null when reorder is off, and fingerprints only this row", () => {
    expect(rowReorderSignature(undefined, "a", 0)).toBeNull();
  });

  it("changes for an untouched row when a lift starts and when it ends", () => {
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder: vi.fn(),
        labels: LABELS,
        rowAt: (index) => ROWS[index],
      })
    );
    const idle = rowReorderSignature(result.current, "b", 1);
    expect(idle).toBe("");
    act(() => {
      result.current.handleKeyDown(
        { key: " ", preventDefault: vi.fn() } as never,
        "a",
        0,
        ROWS[0]!,
        0,
        3
      );
    });
    const inFlight = rowReorderSignature(result.current, "b", 1);
    expect(inFlight).not.toBe(idle);
    expect(inFlight).toBe("L");
    act(() => {
      result.current.handleKeyDown(
        { key: "Escape", preventDefault: vi.fn() } as never,
        "a",
        0,
        ROWS[0]!,
        0,
        3
      );
    });
    expect(rowReorderSignature(result.current, "b", 1)).toBe("");
  });
});

describe("rowReorderDropStyle", () => {
  it("dims a lifted row and draws the insertion line on the target", () => {
    expect(rowReorderDropStyle(undefined)).toEqual({});
    expect(rowReorderDropStyle({ "data-dragging": "" }).opacity).toBe(
      ROW_REORDER_LIFTED_OPACITY
    );
    expect(rowReorderDropStyle({ "data-drop": "before" }).boxShadow).toContain(
      "2px"
    );
    expect(rowReorderDropStyle({ "data-drop": "after" }).boxShadow).toContain(
      "-2px"
    );
    expect(rowReorderDropStyle({ "data-drop": "inside" }).boxShadow).toContain(
      "0 0 0 2px"
    );
  });
});

describe("useRowReorder", () => {
  const arm = (onRowReorder?: (from: number, to: number, row: Task) => void) =>
    renderHook(() =>
      useRowReorder<Task>({
        enabled: onRowReorder !== undefined,
        onRowReorder,
        labels: LABELS,
        rowAt: (index) => ROWS[index],
      })
    );

  function press(key: string, extra: Record<string, unknown> = {}) {
    return { key, preventDefault: vi.fn(), ...extra } as never;
  }

  function fakeDataTransfer(initial: Record<string, string> = {}) {
    const store: Record<string, string> = { ...initial };
    return {
      effectAllowed: "",
      dropEffect: "",
      setData: (type: string, value: string) => {
        store[type] = value;
      },
      getData: (type: string) => store[type] ?? "",
    };
  }

  it("does nothing while the host has not opted in", () => {
    const { result } = arm();
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    expect(result.current.lifted).toBeNull();
  });

  it("lifts on Space, moves on arrows, drops on Space", () => {
    const onRowReorder = vi.fn();
    const { result } = arm(onRowReorder);
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 5, 3);
    });
    expect(result.current.lifted).toEqual({ rowId: "a", from: 0 });
    expect(result.current.announcement).toBe("Row 6 lifted");
    expect(rowReorderSignature(result.current, "a", 0)).toBe("Ldtbefore");
    expect(rowReorderSignature(result.current, "b", 1)).toBe("L");
    act(() => {
      result.current.handleKeyDown(press("ArrowDown"), "a", 0, ROWS[0]!, 5, 3);
    });
    expect(result.current.overIndex).toBe(1);
    expect(rowReorderSignature(result.current, "b", 1)).toBe("Ltafter");
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 5, 3);
    });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(5, 6, ROWS[0]);
    expect(result.current.lifted).toBeNull();
    expect(result.current.announcement).toBe("Row moved from 6 to 7");
  });

  it("cancels a lift on Escape without writing", () => {
    const onRowReorder = vi.fn();
    const { result } = arm(onRowReorder);
    act(() => {
      result.current.handleKeyDown(press(" "), "b", 1, ROWS[1]!, 0, 3);
    });
    act(() => {
      result.current.handleKeyDown(press("Escape"), "b", 1, ROWS[1]!, 0, 3);
    });
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(result.current.lifted).toBeNull();
    expect(result.current.announcement).toBe("Reorder cancelled");
  });

  it("moveBy swaps with a neighbour for a mobile card", () => {
    const onRowReorder = vi.fn();
    const { result } = arm(onRowReorder);
    act(() => {
      result.current.moveBy(1, -1, ROWS[1]!, 10, 3);
    });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(11, 10, ROWS[1]);
    act(() => {
      result.current.moveBy(0, -1, ROWS[0]!, 0, 3);
    });
    expect(onRowReorder).toHaveBeenCalledOnce();
  });

  it("routes a cross-group target through the host move callback", () => {
    const onRowMove = vi.fn();
    const request = {
      kind: "group" as const,
      row: ROWS[0]!,
      rowLabel: "Ada",
      fromGroup: {
        id: "group:a",
        label: "A",
        levels: [{ key: "team", value: "a", label: "A" }],
      },
      toGroup: {
        id: "group:b",
        label: "B",
        levels: [{ key: "team", value: "b", label: "B" }],
      },
      position: 1,
    };
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder: vi.fn(),
        movePolicy: "auto",
        onRowMove,
        resolveMove: () => ({ kind: "move", request }),
        labels: {
          ...LABELS,
          rowMovedToGroup: (group) => `Moved to ${group}`,
        },
        rowAt: (index) => ROWS[index],
      })
    );

    act(() => {
      result.current.moveBy(0, 1, ROWS[0]!, 0, ROWS.length);
    });

    expect(onRowMove).toHaveBeenCalledExactlyOnceWith(request);
    expect(result.current.announcement).toBe("Moved to B");
  });

  it("holds confirm-policy moves until the built-in confirmation resolves", () => {
    const onRowMove = vi.fn();
    const request = {
      kind: "tree" as const,
      row: ROWS[0]!,
      rowLabel: "Ada",
      fromParent: { id: null, row: null, label: "Top level" },
      toParent: { id: "b", row: ROWS[1]!, label: "Grace" },
      position: 0,
    };
    const { result } = renderHook(() =>
      useRowReorder<Task>({
        enabled: true,
        onRowReorder: vi.fn(),
        movePolicy: "confirm",
        onRowMove,
        resolveMove: () => ({ kind: "move", request }),
        labels: LABELS,
        rowAt: (index) => ROWS[index],
      })
    );

    act(() => {
      result.current.moveBy(0, 1, ROWS[0]!, 0, ROWS.length);
    });
    expect(result.current.pendingMove).toEqual(request);
    expect(onRowMove).not.toHaveBeenCalled();

    act(() => {
      result.current.confirmMove();
    });
    expect(onRowMove).toHaveBeenCalledExactlyOnceWith(request);
    expect(result.current.pendingMove).toBeNull();
  });

  it.each([
    ["approves", () => Promise.resolve(true), 1],
    ["declines", () => Promise.resolve(false), 0],
    ["handles rejection", () => Promise.reject(new Error("closed")), 0],
  ])(
    "%s a move through the host-owned promise confirmation",
    async (_case, confirmMove, writes) => {
      const onRowMove = vi.fn();
      const request = {
        kind: "group" as const,
        row: ROWS[0]!,
        rowLabel: "Ada",
        fromGroup: { id: "a", label: "A", levels: [] },
        toGroup: { id: "b", label: "B", levels: [] },
        position: 0,
      };
      const { result } = renderHook(() =>
        useRowReorder<Task>({
          enabled: true,
          onRowReorder: vi.fn(),
          movePolicy: "confirm",
          confirmMove,
          onRowMove,
          resolveMove: () => ({ kind: "move", request }),
          labels: LABELS,
          rowAt: (index) => ROWS[index],
        })
      );

      await act(async () => {
        result.current.moveBy(0, 1, ROWS[0]!, 0, ROWS.length);
        await Promise.resolve();
      });

      expect(onRowMove).toHaveBeenCalledTimes(writes);
      expect(result.current.pendingMove).toBeNull();
      if (writes === 0) {
        expect(result.current.announcement).toBe("Reorder cancelled");
      }
    }
  );

  it("marks the drop side after a later row", () => {
    const { result } = arm(vi.fn());
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    act(() => {
      result.current.handleKeyDown(press("ArrowDown"), "a", 0, ROWS[0]!, 0, 3);
    });
    expect(result.current.rowAttrs("b", 1)["data-drop"]).toBe("after");
    expect(result.current.rowAttrs("a", 0)["data-dragging"]).toBe("");
  });

  it("drops a pointer drag onto another row", () => {
    const onRowReorder = vi.fn();
    const { result } = arm(onRowReorder);
    const dt = fakeDataTransfer();
    act(() => {
      result.current.dragProps("a", 0).onDragStart({
        preventDefault: vi.fn(),
        dataTransfer: dt,
      } as never);
    });
    expect(result.current.lifted).toEqual({ rowId: "a", from: 0 });
    act(() => {
      result.current.dropProps(2, ROWS[2]!, 0).onDragOver({
        preventDefault: vi.fn(),
        dataTransfer: dt,
      } as never);
    });
    expect(result.current.overIndex).toBe(2);
    act(() => {
      result.current.dropProps(2, ROWS[2]!, 0).onDrop({
        preventDefault: vi.fn(),
        dataTransfer: dt,
      } as never);
    });
    expect(onRowReorder).toHaveBeenCalledExactlyOnceWith(0, 2, ROWS[0]);
  });

  it("cancels a disabled pointer drag and ignores a drop with no payload", () => {
    const { result } = arm();
    const preventDefault = vi.fn();
    act(() => {
      result.current.dragProps("a", 0).onDragStart({
        preventDefault,
        dataTransfer: fakeDataTransfer(),
      } as never);
    });
    expect(preventDefault).toHaveBeenCalled();
    expect(result.current.lifted).toBeNull();
    const armed = arm(vi.fn());
    act(() => {
      armed.result.current.dropProps(1, ROWS[1]!, 0).onDrop({
        preventDefault: vi.fn(),
        dataTransfer: fakeDataTransfer(),
      } as never);
    });
    expect(armed.result.current.lifted).toBeNull();
  });

  it("mirrors horizontal arrows in RTL and ignores unrelated keys", () => {
    const { result } = arm(vi.fn());
    const root = document.createElement("div");
    root.setAttribute("dir", "rtl");
    const grip = document.createElement("button");
    root.append(grip);
    document.body.append(root);
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    act(() => {
      result.current.handleKeyDown(
        press("ArrowLeft", { currentTarget: grip }),
        "a",
        0,
        ROWS[0]!,
        0,
        3
      );
    });
    expect(result.current.overIndex).toBe(1);
    act(() => {
      result.current.handleKeyDown(press("Tab"), "a", 0, ROWS[0]!, 0, 3);
    });
    expect(result.current.overIndex).toBe(1);
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    root.remove();
  });

  it("mirrors arrows through a Radix ScrollArea that stamps dir=ltr", () => {
    const { result } = arm(vi.fn());
    const table = document.createElement("div");
    table.setAttribute("dir", "rtl");
    const scroll = document.createElement("div");
    scroll.setAttribute("dir", "ltr");
    scroll.className = "rt-ScrollAreaViewport";
    const grip = document.createElement("button");
    scroll.append(grip);
    table.append(scroll);
    document.body.append(table);
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    act(() => {
      result.current.handleKeyDown(
        press("ArrowLeft", { currentTarget: grip }),
        "a",
        0,
        ROWS[0]!,
        0,
        3
      );
    });
    expect(result.current.overIndex).toBe(1);
    table.remove();
  });

  it("drops in place on a second Space without writing", () => {
    const onRowReorder = vi.fn();
    const { result } = arm(onRowReorder);
    act(() => {
      result.current.handleKeyDown(press("Spacebar"), "a", 0, ROWS[0]!, 0, 3);
    });
    act(() => {
      result.current.handleKeyDown(press(" "), "a", 0, ROWS[0]!, 0, 3);
    });
    expect(onRowReorder).not.toHaveBeenCalled();
    expect(result.current.lifted).toBeNull();
  });
});

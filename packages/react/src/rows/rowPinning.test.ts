import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import {
  applyRowPin,
  EMPTY_ROW_PIN_STATE,
  partitionPinnedRows,
  PIN_BOTTOM_ACTION_KEY,
  PIN_TOP_ACTION_KEY,
  rowPinSignature,
  UNPIN_ROW_ACTION_KEY,
  useRowPinning,
} from "./rowPinning";

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
  pinToTop: "Pin to top",
  pinToBottom: "Pin to bottom",
  unpinRow: "Unpin row",
};

describe("applyRowPin", () => {
  it("pins, moves, and unpins without mutating the source", () => {
    const start = EMPTY_ROW_PIN_STATE;
    const top = applyRowPin(start, "a", "top");
    expect(top).toEqual({ top: ["a"], bottom: [] });
    expect(start).toEqual(EMPTY_ROW_PIN_STATE);
    const moved = applyRowPin(top, "a", "bottom");
    expect(moved).toEqual({ top: [], bottom: ["a"] });
    expect(applyRowPin(moved, "a", undefined)).toEqual(EMPTY_ROW_PIN_STATE);
  });
});

describe("partitionPinnedRows", () => {
  it("pulls pinned ids out of the scroll list in declared order", () => {
    const next = partitionPinnedRows(
      ROWS,
      { top: ["c", "a"], bottom: ["b"] },
      (row) => row.id
    );
    expect(next.top.map((row) => row.id)).toEqual(["c", "a"]);
    expect(next.scroll).toEqual([]);
    expect(next.bottom.map((row) => row.id)).toEqual(["b"]);
  });

  it("drops ids that are not in the current rows", () => {
    const next = partitionPinnedRows(
      ROWS,
      { top: ["missing", "a"], bottom: ["gone"] },
      (row) => row.id
    );
    expect(next.top.map((row) => row.id)).toEqual(["a"]);
    expect(next.bottom).toEqual([]);
    expect(next.scroll.map((row) => row.id)).toEqual(["b", "c"]);
  });
});

describe("useRowPinning", () => {
  it("is inert until enabled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: false,
        onPinnedRowIdsChange: onChange,
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    expect(result.current.actions).toEqual([]);
    act(() => {
      result.current.pin("a", "top");
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("pins through the host when controlled", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: true,
        pinnedRowIds: EMPTY_ROW_PIN_STATE,
        onPinnedRowIdsChange: onChange,
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    act(() => {
      result.current.pin("a", "top");
    });
    expect(onChange).toHaveBeenCalledExactlyOnceWith({
      top: ["a"],
      bottom: [],
    });
  });

  it("holds an uncontrolled list and hides the matching action", () => {
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: true,
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    act(() => {
      result.current.pin("b", "bottom");
    });
    expect(result.current.sideOf("b")).toBe("bottom");
    expect(result.current.state.bottom).toEqual(["b"]);
    const hidden = result.current.actions.map((action) => ({
      key: action.key,
      hidden: action.isHidden?.(ROWS[1]!),
    }));
    expect(hidden).toEqual([
      { key: PIN_TOP_ACTION_KEY, hidden: false },
      { key: PIN_BOTTOM_ACTION_KEY, hidden: true },
      { key: UNPIN_ROW_ACTION_KEY, hidden: false },
    ]);
  });

  it("pins and unpins through the synthesized actions", () => {
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: true,
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    const byKey = (key: string) =>
      result.current.actions.find((action) => action.key === key);
    act(() => {
      byKey(PIN_TOP_ACTION_KEY)?.onClick(ROWS[0]!);
    });
    expect(result.current.sideOf("a")).toBe("top");
    act(() => {
      byKey(PIN_BOTTOM_ACTION_KEY)?.onClick(ROWS[0]!);
    });
    expect(result.current.sideOf("a")).toBe("bottom");
    act(() => {
      byKey(UNPIN_ROW_ACTION_KEY)?.onClick(ROWS[0]!);
    });
    expect(result.current.sideOf("a")).toBeUndefined();
    act(() => {
      result.current.unpin("a");
    });
    expect(result.current.state).toEqual(EMPTY_ROW_PIN_STATE);
  });

  it("does not notify when the pin is already on that edge", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: true,
        pinnedRowIds: { top: ["a"], bottom: [] },
        onPinnedRowIdsChange: onChange,
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    act(() => {
      result.current.pin("a", "top");
    });
    expect(onChange).not.toHaveBeenCalled();
  });
});

describe("rowPinSignature", () => {
  it("is null when pinning is off and the side letter when on", () => {
    expect(rowPinSignature(undefined, "a")).toBeNull();
    const { result } = renderHook(() =>
      useRowPinning<Task>({
        enabled: true,
        pinnedRowIds: { top: ["a"], bottom: ["b"] },
        getRowId: (row) => row.id,
        labels: LABELS,
      })
    );
    expect(rowPinSignature(result.current, "a")).toBe("top");
    expect(rowPinSignature(result.current, "b")).toBe("bottom");
    expect(rowPinSignature(result.current, "c")).toBe("");
  });
});

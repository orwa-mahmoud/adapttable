import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { useSelection } from "./useSelection";

interface Row {
  id: string;
}
const rows: Row[] = [{ id: "a" }, { id: "b" }, { id: "c" }];
const getId = (r: Row) => r.id;

describe("useSelection", () => {
  it("starts empty with headerState none", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.headerState).toBe("none");
  });

  it("toggles a single id on and off", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.headerState).toBe("some");
    act(() => result.current.toggle("a"));
    expect(result.current.isSelected("a")).toBe(false);
    expect(result.current.headerState).toBe("none");
  });

  it("toggleAll selects all visible, then clears on a second call", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.headerState).toBe("all");
    act(() => result.current.toggleAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it("toggleGroupLeaves selects then deselects the group's leaf ids", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    act(() => result.current.toggleGroupLeaves(["a", "b"]));
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.isSelected("b")).toBe(true);
    expect(result.current.isSelected("c")).toBe(false);
    expect(result.current.headerState).toBe("some");
    act(() => result.current.toggleGroupLeaves(["a", "b"]));
    expect(result.current.selectedCount).toBe(0);
  });

  it("clear empties the selection", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    act(() => result.current.toggle("a"));
    act(() => result.current.clear());
    expect(result.current.selectedCount).toBe(0);
  });

  it("clears the selection when resetKey changes (but not on mount)", () => {
    const { result, rerender } = renderHook(
      ({ k }) => useSelection({ rows, getId, resetKey: k }),
      { initialProps: { k: "page1" } }
    );
    act(() => result.current.toggle("a"));
    expect(result.current.selectedCount).toBe(1);
    rerender({ k: "page2" });
    expect(result.current.selectedCount).toBe(0);
  });

  it("does not thrash state when resetKey is unchanged and selection is empty", () => {
    const { result, rerender } = renderHook(
      ({ k }) => useSelection({ rows, getId, resetKey: k }),
      { initialProps: { k: "same" } }
    );
    const before = result.current.selectedIds;
    rerender({ k: "same" });
    expect(result.current.selectedIds).toBe(before);
  });

  it("a controlled preselection survives a StrictMode mount", () => {
    const onChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ k }) =>
        useSelection({
          rows,
          getId,
          resetKey: k,
          selectedIds: ["a"],
          onSelectionChange: onChange,
        }),
      { initialProps: { k: "page1" }, wrapper: StrictMode }
    );
    // StrictMode's doubled mount effect must NOT request a clear.
    expect(onChange).not.toHaveBeenCalled();
    expect(result.current.selectedCount).toBe(1);
    // A REAL reset-key change still requests one.
    rerender({ k: "page2" });
    expect(onChange).toHaveBeenCalledWith([]);
  });

  it("an uncontrolled selection made before a StrictMode re-render is kept", () => {
    const { result, rerender } = renderHook(
      ({ k }) => useSelection({ rows, getId, resetKey: k }),
      { initialProps: { k: "page1" }, wrapper: StrictMode }
    );
    act(() => result.current.toggle("a"));
    rerender({ k: "page1" });
    expect(result.current.selectedCount).toBe(1);
    rerender({ k: "page2" });
    expect(result.current.selectedCount).toBe(0);
  });
});

describe("controlled selection", () => {
  const rows = [{ id: "a" }, { id: "b" }];
  const getId = (r: { id: string }) => r.id;

  it("reads from the controlled value and routes changes to onChange", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSelection({
        rows,
        getId,
        selectedIds: ["a"],
        onSelectionChange: onChange,
      })
    );
    expect(result.current.isSelected("a")).toBe(true);
    expect(result.current.selectedCount).toBe(1);
    act(() => result.current.toggle("b"));
    // The hook does NOT mutate itself — it asks the parent.
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
    expect(result.current.isSelected("b")).toBe(false);
    act(() => result.current.toggle("a"));
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("toggleAll and clear go through onChange in controlled mode", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSelection({
        rows,
        getId,
        selectedIds: [],
        onSelectionChange: onChange,
      })
    );
    act(() => result.current.toggleAll());
    expect(onChange).toHaveBeenLastCalledWith(["a", "b"]);
    act(() => result.current.clear());
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("a resetKey change requests a clear from the parent", () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ resetKey }) =>
        useSelection({
          rows,
          getId,
          resetKey,
          selectedIds: ["a"],
          onSelectionChange: onChange,
        }),
      { initialProps: { resetKey: "k1" } }
    );
    rerender({ resetKey: "k2" });
    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it("a resetKey change with an already-empty selection asks nothing", () => {
    const onChange = vi.fn();
    const { rerender } = renderHook(
      ({ resetKey }) =>
        useSelection({
          rows,
          getId,
          resetKey,
          selectedIds: [],
          onSelectionChange: onChange,
        }),
      { initialProps: { resetKey: "k1" } }
    );
    rerender({ resetKey: "k2" });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("toggle identity is permanently stable and never computes from a stale set", () => {
    // A memoized row holds the FIRST render's toggle; with parent-applied
    // controlled updates, sequential toggles must accumulate, not drop.
    let applied: string[] = [];
    const onChange = (ids: string[]) => {
      applied = ids;
      rerender({ selectedIds: ids });
    };
    const { result, rerender } = renderHook(
      ({ selectedIds }) =>
        useSelection({ rows, getId, selectedIds, onSelectionChange: onChange }),
      { initialProps: { selectedIds: [] as string[] } }
    );
    const heldToggle = result.current.toggle;
    act(() => heldToggle("a"));
    expect(applied).toEqual(["a"]);
    // The held (first-render) toggle must see the updated set.
    act(() => heldToggle("b"));
    expect(applied).toEqual(["a", "b"]);
    expect(result.current.toggle).toBe(heldToggle);
  });

  it("selectAllMatching widens the scope; any mutation narrows it back", () => {
    const { result } = renderHook(() => useSelection({ rows, getId }));
    act(() => result.current.toggleAll());
    expect(result.current.allMatching).toBe(false);
    act(() => result.current.selectAllMatching());
    expect(result.current.allMatching).toBe(true);
    // Deselecting one row leaves a concrete id set — scope narrows.
    act(() => result.current.toggle("a"));
    expect(result.current.allMatching).toBe(false);
  });

  it("a resetKey change also drops the all-matching scope", () => {
    const { result, rerender } = renderHook(
      ({ resetKey }) => useSelection({ rows, getId, resetKey }),
      { initialProps: { resetKey: "k1" } }
    );
    act(() => result.current.toggleAll());
    act(() => result.current.selectAllMatching());
    rerender({ resetKey: "k2" });
    expect(result.current.allMatching).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });
});

describe("v1 `selected`/`onChange` aliases", () => {
  it("still drive the controlled mode (removed before release)", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() =>
      useSelection({ rows, getId, selected: ["a"], onChange })
    );
    expect(result.current.selectedCount).toBe(1);
    act(() => result.current.toggle("b"));
    expect(onChange).toHaveBeenCalledWith(["a", "b"]);
  });
});

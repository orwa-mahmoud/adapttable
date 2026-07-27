import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { defaultLabels } from "../labels";
import type { SelectionState } from "../selection/useSelection";
import { useBulkBarState } from "./useBulkBarState";

const labels = defaultLabels;

function makeSelection(over: Partial<SelectionState> = {}): SelectionState {
  return {
    selectedIds: new Set(["a", "b"]),
    selectedCount: 2,
    headerState: "some",
    isSelected: () => false,
    toggle: vi.fn(),
    toggleAll: vi.fn(),
    toggleGroupLeaves: vi.fn(),
    clear: vi.fn(),
    visibleIds: ["a", "b"],
    allMatching: false,
    selectAllMatching: vi.fn(),
    ...over,
  };
}

describe("useBulkBarState", () => {
  it("exposes the selected count, ids, and clear/run handlers", () => {
    const selection = makeSelection();
    const { result } = renderHook(() =>
      useBulkBarState({ selection, total: 30, confirm: vi.fn(), labels })
    );
    expect(result.current.selectedCount).toBe(2);
    expect(result.current.ids).toEqual(["a", "b"]);
    expect(result.current.pending).toBeNull();
    expect(typeof result.current.run).toBe("function");
    expect(typeof result.current.clear).toBe("function");
  });

  it("is not expandable when only part of the page is selected", () => {
    const { result } = renderHook(() =>
      useBulkBarState({
        selection: makeSelection({ headerState: "some" }),
        total: 30,
        confirm: vi.fn(),
        labels,
      })
    );
    expect(result.current.expandable).toBe(false);
    expect(result.current.scope).toBeUndefined();
    expect(result.current.banner.text).toBe(labels.pageSelected(2));
  });

  it("is expandable when a full page is selected and more rows match", () => {
    const selectAllMatching = vi.fn();
    const { result } = renderHook(() =>
      useBulkBarState({
        selection: makeSelection({
          headerState: "all",
          visibleIds: ["a", "b"],
          allMatching: false,
          selectAllMatching,
        }),
        total: 30,
        confirm: vi.fn(),
        labels,
      })
    );
    expect(result.current.expandable).toBe(true);
    expect(result.current.banner.action).toBe(labels.selectAllMatching(30));
    expect(result.current.banner.onClick).toBe(selectAllMatching);
  });

  it("switches the banner + scope to 'all matching' when active", () => {
    const clear = vi.fn();
    const { result } = renderHook(() =>
      useBulkBarState({
        selection: makeSelection({
          headerState: "all",
          allMatching: true,
          clear,
        }),
        total: 30,
        confirm: vi.fn(),
        labels,
      })
    );
    expect(result.current.scope).toEqual({ allMatching: true, total: 30 });
    expect(result.current.banner.text).toBe(labels.allMatchingSelected(30));
    expect(result.current.banner.onClick).toBe(clear);
  });

  it("runs a bulk action against the derived ids and scope", async () => {
    const onClick = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() =>
      useBulkBarState({
        selection: makeSelection({ allMatching: true, headerState: "all" }),
        total: 30,
        confirm: vi.fn(),
        labels,
      })
    );
    await act(async () => {
      result.current.run(
        { key: "x", label: "X", onClick },
        result.current.ids,
        result.current.scope
      );
      await Promise.resolve();
    });
    expect(onClick).toHaveBeenCalledWith(["a", "b"], {
      allMatching: true,
      total: 30,
    });
  });

  it("keeps the selection and exposes the message when a run fails", async () => {
    const selection = makeSelection({});
    const clear = selection.clear as ReturnType<typeof vi.fn>;
    const { result } = renderHook(() =>
      useBulkBarState({ selection, total: 2, confirm: vi.fn(), labels })
    );
    const failing = vi.fn().mockRejectedValue(new Error("nope"));
    await act(async () => {
      result.current.run(
        { key: "x", label: "X", onClick: failing },
        result.current.ids
      );
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(result.current.errorMessage).toBe("nope");
    expect(clear).not.toHaveBeenCalled();

    // A successful run clears the selection (and the error).
    const ok = vi.fn().mockResolvedValue(undefined);
    await act(async () => {
      result.current.run(
        { key: "y", label: "Y", onClick: ok },
        result.current.ids
      );
      await Promise.resolve();
    });
    expect(result.current.errorMessage).toBeNull();
    expect(clear).toHaveBeenCalled();
  });
});

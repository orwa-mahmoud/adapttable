/**
 * Which tree nodes are open.
 *
 * A tree starts folded, so this state is the set that is OPEN — the opposite
 * of group collapse, and the thing most likely to be got backwards. What these
 * cover is that inversion, and the controlled/uncontrolled split: controlled
 * means the table asks and changes nothing itself.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useTreeExpansion } from "./useTreeExpansion";

describe("useTreeExpansion", () => {
  it("starts folded", () => {
    const { result } = renderHook(() => useTreeExpansion());
    expect([...result.current.expandedIds]).toEqual([]);
    expect(result.current.isExpanded("src")).toBe(false);
  });

  it("opens and closes a node", () => {
    const { result } = renderHook(() => useTreeExpansion());
    act(() => {
      result.current.toggle("src");
    });
    expect(result.current.isExpanded("src")).toBe(true);
    act(() => {
      result.current.toggle("src");
    });
    expect(result.current.isExpanded("src")).toBe(false);
  });

  it("opens a specific node, and leaves an open one alone", () => {
    const { result } = renderHook(() => useTreeExpansion());
    act(() => {
      result.current.expand("src");
    });
    const first = result.current.expandedIds;
    act(() => {
      result.current.expand("src");
    });
    // Already open: no new set, so nothing downstream re-renders.
    expect(result.current.expandedIds).toBe(first);
    expect(result.current.isExpanded("src")).toBe(true);
  });

  it("opens every id it is handed, and folds the lot", () => {
    const { result } = renderHook(() => useTreeExpansion());
    act(() => {
      result.current.expandAll(["src", "lib"]);
    });
    expect(
      [...result.current.expandedIds].sort((a, b) => a.localeCompare(b))
    ).toEqual(["lib", "src"]);
    act(() => {
      result.current.collapseAll();
    });
    expect([...result.current.expandedIds]).toEqual([]);
  });

  it("asks the host when the host holds the set", () => {
    const onExpandedIdsChange = vi.fn();
    const { result } = renderHook(() =>
      useTreeExpansion({ expandedIds: ["src"], onExpandedIdsChange })
    );
    expect(result.current.isExpanded("src")).toBe(true);

    act(() => {
      result.current.toggle("lib");
    });
    expect(onExpandedIdsChange).toHaveBeenCalledExactlyOnceWith(["src", "lib"]);
    // Controlled: it asked, and changed nothing itself.
    expect([...result.current.expandedIds]).toEqual(["src"]);
  });

  it("keeps its actions stable while the open set holds", () => {
    // The options object arrives fresh on every render; a toggle that changed
    // with it would re-render every row on every keystroke.
    const { result, rerender } = renderHook(() =>
      useTreeExpansion({ onExpandedIdsChange: () => undefined })
    );
    const before = result.current.toggle;
    rerender();
    expect(result.current.toggle).toBe(before);
  });
});

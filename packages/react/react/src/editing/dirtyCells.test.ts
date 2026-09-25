/**
 * Which cells hold a change nobody has confirmed.
 *
 * A mark is a claim about what the server has agreed to, so the rules that
 * matter are about when it appears and — more importantly — when it does NOT
 * clear: never on its own, because a mark that fades on a timer says the change
 * is safe when nobody checked.
 */
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useDirtyCells } from "./dirtyCells";

describe("useDirtyCells", () => {
  it("marks nothing until the host asks for marks", () => {
    const { result } = renderHook(() => useDirtyCells());
    act(() => {
      result.current.mark("1", "name");
    });
    expect(result.current.isDirty("1", "name")).toBe(false);
    expect(result.current.count).toBe(0);
  });

  it("marks a cell, and its row with it", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    act(() => {
      result.current.mark("1", "name");
    });
    expect(result.current.isDirty("1", "name")).toBe(true);
    // A reader scanning a long table sees the row before the cell.
    expect(result.current.isRowDirty("1")).toBe(true);
    expect(result.current.isRowDirty("2")).toBe(false);
    expect(result.current.count).toBe(1);
  });

  it("marks the same cell once however many times it is edited", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    act(() => {
      result.current.mark("1", "name");
    });
    const first = result.current.signature;
    act(() => {
      result.current.mark("1", "name");
    });
    // No new set, so nothing downstream re-renders for a mark it already has.
    expect(result.current.signature).toBe(first);
    expect(result.current.count).toBe(1);
  });

  it("clears one cell without touching its neighbours", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    act(() => {
      result.current.mark("1", "name");
      result.current.mark("1", "team");
      result.current.mark("2", "name");
    });
    act(() => {
      result.current.confirm("1", "name");
    });
    expect(result.current.isDirty("1", "name")).toBe(false);
    expect(result.current.isDirty("1", "team")).toBe(true);
    expect(result.current.isRowDirty("1")).toBe(true);
    expect(result.current.count).toBe(2);
  });

  it("clears a whole row", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    act(() => {
      result.current.mark("1", "name");
      result.current.mark("1", "team");
      result.current.mark("2", "name");
    });
    act(() => {
      result.current.confirmRow("1");
    });
    expect(result.current.isRowDirty("1")).toBe(false);
    expect(result.current.isRowDirty("2")).toBe(true);
  });

  it("clears everything, which is what a fresh fetch means", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    act(() => {
      result.current.mark("1", "name");
      result.current.mark("2", "name");
    });
    act(() => {
      result.current.confirmAll();
    });
    expect(result.current.count).toBe(0);
  });

  it("does no work clearing what was never marked", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    const before = result.current.signature;
    act(() => {
      result.current.confirm("9", "name");
      result.current.confirmRow("9");
      result.current.confirmAll();
    });
    expect(result.current.signature).toBe(before);
  });

  it("changes its signature so a row repaints", () => {
    const { result } = renderHook(() => useDirtyCells({ enabled: true }));
    const before = result.current.signature;
    act(() => {
      result.current.mark("1", "name");
    });
    expect(result.current.signature).not.toBe(before);
  });
});

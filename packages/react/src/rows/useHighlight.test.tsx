/**
 * Highlighting a row, and the two things about it that are easy to get
 * wrong: what reduced motion should mean, and what happens when the same
 * row is flashed twice.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useHighlight } from "./useHighlight";

function prefersReducedMotion(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    }),
  });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  prefersReducedMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useHighlight", () => {
  it("marks a row and drops the mark on its own", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
    });

    expect(result.current.isRowHighlighted("r1")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isRowHighlighted("r1")).toBe(false);
  });

  it("marks one cell without marking its row", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashCell({ rowId: "r1", columnKey: "name" });
    });

    expect(result.current.isCellHighlighted("r1", "name")).toBe(true);
    expect(result.current.isCellHighlighted("r1", "city")).toBe(false);
    expect(result.current.isRowHighlighted("r1")).toBe(false);
  });

  it("drops a cell mark on its own too", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashCell({ rowId: "r1", columnKey: "name" });
    });
    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isCellHighlighted("r1", "name")).toBe(false);
  });

  it("restarts the clock when the same row flashes again", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    act(() => {
      result.current.flashRow("r1");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    // The first timer must not clear a mark the second one renewed.
    expect(result.current.isRowHighlighted("r1")).toBe(true);
  });

  it("keeps two rows on their own clocks", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
    });
    act(() => {
      vi.advanceTimersByTime(1000);
      result.current.flashRow("r2");
    });
    act(() => {
      vi.advanceTimersByTime(600);
    });

    expect(result.current.isRowHighlighted("r1")).toBe(false);
    expect(result.current.isRowHighlighted("r2")).toBe(true);
  });

  it("clears everything on demand", () => {
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
      result.current.flashCell({ rowId: "r2", columnKey: "name" });
      result.current.clear();
    });

    expect(result.current.isRowHighlighted("r1")).toBe(false);
    expect(result.current.isCellHighlighted("r2", "name")).toBe(false);
  });

  it("still marks under reduced motion, and holds it longer", () => {
    prefersReducedMotion(true);
    const { result } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
    });

    // A steady mark is easier to miss than one that moves, so it stays put
    // past the animated duration rather than being dropped altogether.
    expect(result.current.animated).toBe(false);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.isRowHighlighted("r1")).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current.isRowHighlighted("r1")).toBe(false);
  });

  it("says it will animate when motion is allowed", () => {
    const { result } = renderHook(() => useHighlight(true));

    expect(result.current.animated).toBe(true);
  });

  it("does nothing at all when it is not armed", () => {
    const { result } = renderHook(() => useHighlight(false));
    act(() => {
      result.current.flashRow("r1");
      result.current.flashCell({ rowId: "r1", columnKey: "name" });
    });

    expect(result.current.isRowHighlighted("r1")).toBe(false);
    expect(result.current.isCellHighlighted("r1", "name")).toBe(false);
    expect(result.current.animated).toBe(false);
  });

  it("drops its timers when it unmounts", () => {
    const { result, unmount } = renderHook(() => useHighlight(true));
    act(() => {
      result.current.flashRow("r1");
    });
    unmount();

    // Nothing should try to set state on an unmounted hook.
    expect(() => {
      act(() => {
        vi.advanceTimersByTime(2000);
      });
    }).not.toThrow();
  });
});

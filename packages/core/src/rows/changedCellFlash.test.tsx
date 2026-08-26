import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChangedCellFlash } from "./changedCellFlash";
import type { RowPatchEvent } from "./patch";

interface Row {
  id: string;
  name: string;
  budget: number;
}

/** Stub `matchMedia` so the reduced-motion preference can be set per test. */
function stubMotion(prefersReduced: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: prefersReduced,
      media: "",
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }))
  );
}

const updated = (id: string, prev: Row, next: Row): RowPatchEvent<unknown> => ({
  type: "update",
  id,
  prev,
  next,
  index: 0,
});

beforeEach(() => {
  vi.useFakeTimers();
  stubMotion(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useChangedCellFlash", () => {
  it("stays inert until a host turns it on", () => {
    const { result } = renderHook(() => useChangedCellFlash());
    act(() => {
      result.current.mark([
        updated(
          "a",
          { id: "a", name: "Ada", budget: 1 },
          { id: "a", name: "Ada", budget: 2 }
        ),
      ]);
    });
    expect(result.current.isFlashing("a", "budget")).toBe(false);
    expect(result.current.flashProps("a", "budget")).toEqual({});
  });

  it("marks only the fields that actually moved", () => {
    const { result } = renderHook(() => useChangedCellFlash({ enabled: true }));
    act(() => {
      result.current.mark([
        updated(
          "a",
          { id: "a", name: "Ada", budget: 1 },
          { id: "a", name: "Ada", budget: 2 }
        ),
      ]);
    });
    expect(result.current.isFlashing("a", "budget")).toBe(true);
    // `name` was in the row but did not change — lighting it would be a lie.
    expect(result.current.isFlashing("a", "name")).toBe(false);
    expect(result.current.isRowFlashing("a")).toBe(true);
    expect(result.current.flashProps("a", "budget")).toEqual({
      "data-flash": "",
    });
  });

  it("marks a whole inserted row, and nothing for a removed one", () => {
    const { result } = renderHook(() => useChangedCellFlash({ enabled: true }));
    const row = { id: "n", name: "New", budget: 0 };
    act(() => {
      result.current.mark([
        { type: "insert", id: "n", row, index: 0 },
        { type: "remove", id: "gone", row, index: 1 },
      ]);
    });
    expect(result.current.isFlashing("n", "anything")).toBe(true);
    expect(result.current.isRowFlashing("gone")).toBe(false);
  });

  it("lets go after the duration", () => {
    const { result } = renderHook(() =>
      useChangedCellFlash({ enabled: true, durationMs: 500 })
    );
    act(() => {
      result.current.mark([
        updated(
          "a",
          { id: "a", name: "Ada", budget: 1 },
          { id: "a", name: "Ada", budget: 2 }
        ),
      ]);
    });
    expect(result.current.isFlashing("a", "budget")).toBe(true);
    act(() => {
      vi.advanceTimersByTime(500);
    });
    expect(result.current.isFlashing("a", "budget")).toBe(false);
  });

  it("a row that keeps moving keeps its mark instead of flickering", () => {
    const { result } = renderHook(() =>
      useChangedCellFlash({ enabled: true, durationMs: 500 })
    );
    const mark = (budget: number) =>
      act(() => {
        result.current.mark([
          updated(
            "a",
            { id: "a", name: "Ada", budget: budget - 1 },
            { id: "a", name: "Ada", budget }
          ),
        ]);
      });
    mark(2);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    mark(3);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    // The second change restarted the clock rather than inheriting the first.
    expect(result.current.isFlashing("a", "budget")).toBe(true);
  });

  it("never flashes when the reader asked for reduced motion", () => {
    stubMotion(true);
    const { result } = renderHook(() => useChangedCellFlash({ enabled: true }));
    act(() => {
      result.current.mark([
        updated(
          "a",
          { id: "a", name: "Ada", budget: 1 },
          { id: "a", name: "Ada", budget: 2 }
        ),
      ]);
    });
    expect(result.current.isFlashing("a", "budget")).toBe(false);
    expect(result.current.isRowFlashing("a")).toBe(false);
  });

  it("clears on request — a refetch should not leave the screen lit", () => {
    const { result } = renderHook(() => useChangedCellFlash({ enabled: true }));
    act(() => {
      result.current.mark([
        updated(
          "a",
          { id: "a", name: "Ada", budget: 1 },
          { id: "a", name: "Ada", budget: 2 }
        ),
      ]);
    });
    act(() => {
      result.current.clear();
    });
    expect(result.current.isFlashing("a", "budget")).toBe(false);
  });

  it("ignores an empty batch", () => {
    const { result } = renderHook(() => useChangedCellFlash({ enabled: true }));
    act(() => {
      result.current.mark([]);
    });
    expect(result.current.isRowFlashing("a")).toBe(false);
  });
});

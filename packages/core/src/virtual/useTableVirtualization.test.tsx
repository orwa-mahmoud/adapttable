import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  resolveVirtualRows,
  useKeyedVirtualization,
  useTableVirtualization,
  virtualColumnSpan,
  windowGroupedEntries,
} from "./useTableVirtualization";

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: vi.fn(),
  useVirtualizer: vi.fn(),
}));

interface Row {
  id: string;
  name: string;
}

const rows: Row[] = Array.from({ length: 5 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
}));

const rowKey = (row: Row) => row.id;

describe("useTableVirtualization", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);
    vi.mocked(useVirtualizer).mockReturnValue({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      options: {},
    } as unknown as ReturnType<typeof useVirtualizer>);
  });

  it("feeds the virtualizer a size estimator and stable item keys", () => {
    renderHook(() =>
      useTableVirtualization({ rows, rowKey, enabled: true, estimateSize: 64 })
    );
    const options = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0];
    expect(options.estimateSize(0)).toBe(64);
    // Item keys come from rowKey; an out-of-range index degrades gracefully.
    expect(options.getItemKey!(1)).toBe("1");
    expect(options.getItemKey!(99)).toBe("99");
  });

  it("keeps getItemKey identity stable across unrelated re-renders", () => {
    // Callers routinely pass `rowKey` as an inline arrow (fresh identity
    // every render). The virtualizer memoises its measurements on
    // `getItemKey`, so a fresh identity per render meant a full O(n)
    // measurement rebuild per render at 10k rows.
    const { rerender } = renderHook(
      ({ data }: { data: Row[]; tick: number }) =>
        useTableVirtualization({
          rows: data,
          rowKey: (row: Row) => row.id,
          enabled: true,
        }),
      { initialProps: { data: rows, tick: 0 } }
    );
    const firstKey = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .getItemKey;
    rerender({ data: rows, tick: 1 });
    const secondKey = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .getItemKey;
    expect(secondKey).toBe(firstKey);

    // A DATA change re-keys, and the new extractor sees the new rows.
    const swapped = [{ id: "z", name: "Z" }, ...rows.slice(1)];
    rerender({ data: swapped, tick: 2 });
    const thirdKey = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .getItemKey;
    expect(thirdKey).not.toBe(firstKey);
    expect(thirdKey!(0)).toBe("z");
  });

  it("returns every row when virtualization is disabled", () => {
    const { result } = renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: false,
      })
    );

    expect(result.current.enabled).toBe(false);
    expect(result.current.rows.map((entry) => entry.row.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
    expect(result.current.paddingTop).toBe(0);
    expect(result.current.paddingBottom).toBe(0);
    expect(result.current.measureElement).toBeUndefined();
  });

  it("materializes only virtual rows and computes spacer padding", () => {
    const measureElement = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 1, key: "v-1", start: 40, end: 80 },
        { index: 2, key: "v-2", start: 80, end: 120 },
      ],
      getTotalSize: () => 240,
      measureElement,
      options: { scrollMargin: 10 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { result } = renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: true,
        estimateSize: 40,
        overscan: 3,
        scrollMargin: 10,
      })
    );

    expect(result.current.enabled).toBe(true);
    expect(result.current.rows.map((entry) => entry.row.id)).toEqual([
      "1",
      "2",
    ]);
    expect(result.current.rows.map((entry) => entry.index)).toEqual([1, 2]);
    expect(result.current.paddingTop).toBe(30);
    expect(result.current.paddingBottom).toBe(130);
    expect(result.current.measureElement).toBe(measureElement);
    expect(useWindowVirtualizer).toHaveBeenCalledWith(
      expect.objectContaining({
        count: rows.length,
        enabled: true,
        estimateSize: expect.any(Function),
        overscan: 3,
        scrollMargin: 10,
      })
    );
  });

  it("falls back to every row before the virtualizer has a measured window", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { result } = renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: true,
        estimateSize: 40,
      })
    );

    expect(result.current.enabled).toBe(false);
    expect(result.current.rows.map((entry) => entry.row.id)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("calls onEndReached when the virtual slice reaches the final row", () => {
    const onEndReached = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [{ index: 4, key: "v-4", start: 160, end: 200 }],
      getTotalSize: () => 200,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: true,
        estimateSize: 40,
        onEndReached,
      })
    );

    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("does not call onEndReached again on re-render while still at the end", () => {
    const onEndReached = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [{ index: 4, key: "v-4", start: 160, end: 200 }],
      getTotalSize: () => 200,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { rerender } = renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: true,
        estimateSize: 40,
        onEndReached,
      })
    );
    rerender();
    rerender();

    // The slice still sits on the final row and the row count is unchanged,
    // so the end-reached notification must not repeat.
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("resolves fallback render entries when no virtual entries are provided", () => {
    expect(resolveVirtualRows(rows, rowKey).map((entry) => entry.key)).toEqual([
      "0",
      "1",
      "2",
      "3",
      "4",
    ]);
  });

  it("uses provided virtual entries unchanged", () => {
    const entry = { row: rows[1]!, index: 1, key: "custom" };
    expect(resolveVirtualRows(rows, rowKey, [entry])).toEqual([entry]);
  });

  it("derives item keys from rowKey, falling back to the index when out of range", () => {
    renderHook(() => useTableVirtualization({ rows, rowKey, enabled: true }));
    const options = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)?.[0];
    const getItemKey = options?.getItemKey as (index: number) => string;
    // In range: keyed by the row's own id.
    expect(getItemKey(2)).toBe("2");
    // Past the end: no row exists, so it falls back to the stringified index.
    expect(getItemKey(99)).toBe("99");
  });

  it("skips virtual items whose index is out of the source range", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 0, key: "v-0", start: 0, end: 40 },
        // index 99 has no matching source row, so it is dropped from the slice.
        { index: 99, key: "v-99", start: 40, end: 80 },
      ],
      getTotalSize: () => 80,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { result } = renderHook(() =>
      useTableVirtualization({ rows, rowKey, enabled: true })
    );

    // Only the in-range item (index 0) survives; the out-of-range one is gone.
    expect(result.current.rows.map((entry) => entry.index)).toEqual([0]);
  });

  it("treats a missing scrollMargin option as zero when active", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [{ index: 1, key: "v-1", start: 40, end: 80 }],
      getTotalSize: () => 200,
      measureElement: vi.fn(),
      // No scrollMargin on options → the `?? 0` fallback is used.
      options: {},
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { result } = renderHook(() =>
      useTableVirtualization({ rows, rowKey, enabled: true })
    );

    expect(result.current.enabled).toBe(true);
    // paddingTop = first.start - 0 = 40; paddingBottom = 200 - (80 - 0) = 120.
    expect(result.current.paddingTop).toBe(40);
    expect(result.current.paddingBottom).toBe(120);
  });

  it("computes table spacer column spans", () => {
    expect(virtualColumnSpan(3, false, false)).toBe(3);
    expect(virtualColumnSpan(3, true, true)).toBe(5);
  });
});

describe("element-mode virtualization (maxHeight scroll boxes)", () => {
  it("window mode hands the disabled element virtualizer a null scroller", () => {
    renderHook(() =>
      useTableVirtualization({ rows, rowKey, enabled: true, estimateSize: 56 })
    );
    const elementOptions = vi.mocked(useVirtualizer).mock.calls.at(-1)![0];
    expect(elementOptions.enabled).toBe(false);
    expect(elementOptions.getScrollElement()).toBeNull();
  });

  it("getScrollElement switches to the element virtualizer", () => {
    const box = document.createElement("div");
    const items = [
      { index: 1, start: 56, end: 112, key: "1" },
      { index: 2, start: 112, end: 168, key: "2" },
    ];
    const measureElement = vi.fn();
    vi.mocked(useVirtualizer).mockReturnValue({
      getVirtualItems: () => items,
      getTotalSize: () => 280,
      measureElement,
      options: {},
    } as unknown as ReturnType<typeof useVirtualizer>);
    const { result } = renderHook(() =>
      useTableVirtualization({
        rows,
        rowKey,
        enabled: true,
        estimateSize: 56,
        getScrollElement: () => box,
      })
    );
    // The element virtualizer was enabled, the window one disabled.
    const elementOptions = vi.mocked(useVirtualizer).mock.calls.at(-1)![0];
    const windowOptions = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0];
    expect(elementOptions.enabled).toBe(true);
    expect(windowOptions.enabled).toBe(false);
    expect(elementOptions.getScrollElement()).toBe(box);
    expect(elementOptions.estimateSize(0)).toBe(56);
    expect(elementOptions.getItemKey!(1)).toBe("1");
    // Element mode has no scrollMargin: spacers come straight from starts.
    expect(result.current.enabled).toBe(true);
    expect(result.current.rows.map((entry) => entry.row.id)).toEqual([
      "1",
      "2",
    ]);
    expect(result.current.paddingTop).toBe(56);
    expect(result.current.paddingBottom).toBe(280 - 168);
    expect(result.current.measureElement).toBe(measureElement);
  });
});

describe("useKeyedVirtualization", () => {
  const keys = ["g-a", "r-1", "r-2", "g-b", "r-3"];

  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);
    vi.mocked(useVirtualizer).mockReturnValue({
      getVirtualItems: () => [],
      getTotalSize: () => 0,
      measureElement: vi.fn(),
      options: {},
    } as unknown as ReturnType<typeof useVirtualizer>);
  });

  it("returns every index when disabled", () => {
    const { result } = renderHook(() =>
      useKeyedVirtualization({ keys, enabled: false })
    );
    expect(result.current.enabled).toBe(false);
    expect(result.current.indices).toEqual([0, 1, 2, 3, 4]);
    expect(result.current.paddingTop).toBe(0);
    expect(result.current.paddingBottom).toBe(0);
    expect(result.current.measureElement).toBeUndefined();
  });

  it("windows indices and paddings when the virtualizer has items", () => {
    const measureElement = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 1, key: "r-1", start: 40, end: 80 },
        { index: 2, key: "r-2", start: 80, end: 120 },
      ],
      getTotalSize: () => 240,
      measureElement,
      options: { scrollMargin: 10 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { result } = renderHook(() =>
      useKeyedVirtualization({
        keys,
        enabled: true,
        estimateSize: 40,
        overscan: 2,
        scrollMargin: 10,
      })
    );

    expect(result.current.enabled).toBe(true);
    expect(result.current.indices).toEqual([1, 2]);
    expect(result.current.paddingTop).toBe(30);
    expect(result.current.paddingBottom).toBe(130);
    expect(result.current.measureElement).toBe(measureElement);
    const options = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0];
    expect(options.estimateSize(0)).toBe(40);
    expect(options.getItemKey!(1)).toBe("r-1");
    expect(options.getItemKey!(99)).toBe("99");
  });

  it("calls onEndReached once when the window reaches the last key", () => {
    const onEndReached = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [{ index: 4, key: "r-3", start: 160, end: 200 }],
      getTotalSize: () => 200,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { rerender } = renderHook(() =>
      useKeyedVirtualization({ keys, enabled: true, onEndReached })
    );
    expect(onEndReached).toHaveBeenCalledTimes(1);
    rerender();
    expect(onEndReached).toHaveBeenCalledTimes(1);
  });

  it("resets the end-reached latch when the window leaves the end", () => {
    const onEndReached = vi.fn();
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [{ index: 4, key: "r-3", start: 160, end: 200 }],
      getTotalSize: () => 200,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const { rerender } = renderHook(
      ({ atEnd }: { atEnd: boolean }) => {
        if (atEnd) {
          vi.mocked(useWindowVirtualizer).mockReturnValue({
            getVirtualItems: () => [
              { index: 4, key: "r-3", start: 160, end: 200 },
            ],
            getTotalSize: () => 200,
            measureElement: vi.fn(),
            options: { scrollMargin: 0 },
          } as unknown as ReturnType<typeof useWindowVirtualizer>);
        } else {
          vi.mocked(useWindowVirtualizer).mockReturnValue({
            getVirtualItems: () => [
              { index: 1, key: "r-1", start: 40, end: 80 },
            ],
            getTotalSize: () => 200,
            measureElement: vi.fn(),
            options: { scrollMargin: 0 },
          } as unknown as ReturnType<typeof useWindowVirtualizer>);
        }
        return useKeyedVirtualization({ keys, enabled: true, onEndReached });
      },
      { initialProps: { atEnd: true } }
    );
    expect(onEndReached).toHaveBeenCalledTimes(1);
    rerender({ atEnd: false });
    rerender({ atEnd: true });
    expect(onEndReached).toHaveBeenCalledTimes(2);
  });

  it("uses the element virtualizer when getScrollElement is provided", () => {
    const box = document.createElement("div");
    const measureElement = vi.fn();
    vi.mocked(useVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 0, key: "g-a", start: 0, end: 56 },
        { index: 1, key: "r-1", start: 56, end: 112 },
      ],
      getTotalSize: () => 280,
      measureElement,
      options: {},
    } as unknown as ReturnType<typeof useVirtualizer>);

    const { result } = renderHook(() =>
      useKeyedVirtualization({
        keys,
        enabled: true,
        getScrollElement: () => box,
      })
    );

    expect(vi.mocked(useVirtualizer).mock.calls.at(-1)![0].enabled).toBe(true);
    expect(vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0].enabled).toBe(
      false
    );
    expect(result.current.enabled).toBe(true);
    expect(result.current.indices).toEqual([0, 1]);
    expect(result.current.measureElement).toBe(measureElement);
  });

  it("passes a null-safe scroll accessor to the idle element virtualizer", () => {
    renderHook(() => useKeyedVirtualization({ keys, enabled: true }));
    const elementOptions = vi.mocked(useVirtualizer).mock.calls.at(-1)![0];
    expect(elementOptions.enabled).toBe(false);
    expect(elementOptions.getScrollElement()).toBeNull();
  });
});

describe("windowGroupedEntries", () => {
  const entries = ["a", "b", "c", "d"] as const;

  it("returns the same array when every index is in the window", () => {
    const windowed = windowGroupedEntries(entries, [0, 1, 2, 3]);
    expect(windowed).toBe(entries);
  });

  it("slices to the requested indices and skips holes", () => {
    expect(windowGroupedEntries(entries, [1, 3])).toEqual(["b", "d"]);
    expect(windowGroupedEntries(entries, [1, 99, 2])).toEqual(["b", "c"]);
  });
});

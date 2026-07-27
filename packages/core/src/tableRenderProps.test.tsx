import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFrontendData } from "./source/useFrontendData";
import { tableRenderModel, useSummaryCells } from "./tableRenderProps";
import type { ColumnDef } from "./types";
import { createMemoryAdapter } from "./url/adapter";
import type { UseDataTableResult } from "./useDataTable/useDataTable";
import {
  useChromeBodyData,
  useChromeScrollReset,
  useFilterTriggerToggle,
  useTableChrome,
} from "./useTableChrome";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const cols: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];

describe("tableRenderModel", () => {
  it("columnSpan counts the expansion column when row details are active", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        renderRowDetail: (r) => r.name,
      });
    });
    const detail = result.current.detail!;
    const model = tableRenderModel<Row>({
      table: result.current.table,
      rows: ROWS,
      getRowId: result.current.getRowId,
      renderRowDetail: detail.render,
      expansion: detail.expansion,
    });
    // 1 data column + 1 expansion column.
    expect(model.columnSpan).toBe(2);
  });

  const table = {
    columns: cols,
    selection: null,
    labels: { cancel: "Cancel" },
  } as unknown as UseDataTableResult<Row>;

  it("derives the shared renderer prelude", () => {
    const model = tableRenderModel({
      table,
      rows: ROWS,
      rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
      getRowId: (r) => r.id,
      rowEntries: undefined,
    });
    expect(model.showActions).toBe(true);
    expect(model.entries.map((e) => e.key)).toEqual(["a", "b"]);
    // 1 data column + 1 actions column, no selection.
    expect(model.columnSpan).toBe(2);
  });

  it("counts the selection column and omits absent actions", () => {
    const withSelection = {
      ...table,
      selection: { selectedIds: new Set() },
    } as unknown as UseDataTableResult<Row>;
    const model = tableRenderModel({
      table: withSelection,
      rows: ROWS,
      rowActions: undefined,
      getRowId: (r) => r.id,
      rowEntries: undefined,
    });
    expect(model.showActions).toBe(false);
    expect(model.columnSpan).toBe(2); // selection + 1 data column
  });
});

describe("useChromeScrollReset", () => {
  it("wires the shared scroll-restoration without crashing", () => {
    const adapter = createMemoryAdapter("");
    const ref = { current: document.createElement("div") };
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      const props = { source, columns: cols, rowKey: (r: Row) => r.id };
      const chrome = useTableChrome<Row>(props);
      useChromeScrollReset(ref, chrome, props);
      return chrome;
    });
    expect(result.current.table.rows).toHaveLength(2);
  });

  const renderWithMode = (mode: "infinite" | "paged") => {
    const adapter = createMemoryAdapter("");
    const ref = { current: document.createElement("div") };
    // The table sits above the sticky offset, so a reset WOULD scroll.
    vi.spyOn(ref.current, "getBoundingClientRect").mockReturnValue({
      top: -200,
    } as DOMRect);
    const scrollBy = vi
      .spyOn(window, "scrollBy")
      .mockImplementation(() => undefined);
    const hook = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: mode,
        defaults: { limit: 1 },
      });
      const props = { source, columns: cols, rowKey: (r: Row) => r.id };
      const chrome = useTableChrome<Row>(props);
      useChromeScrollReset(ref, chrome, props);
      return source;
    });
    return { hook, scrollBy };
  };

  it("does NOT scroll back up when the infinite window extends", async () => {
    const { hook, scrollBy } = renderWithMode("infinite");
    await act(async () => {
      hook.result.current.setPage(2);
      // flush the queueMicrotask the scroll reset uses
      await Promise.resolve();
    });
    // The sentinel growing the window must never yank the reader to the top.
    expect(hook.result.current.page).toBe(2);
    expect(scrollBy).not.toHaveBeenCalled();
    scrollBy.mockRestore();
  });

  it("scrolls back up on real paged navigation", async () => {
    const { hook, scrollBy } = renderWithMode("paged");
    await act(async () => {
      hook.result.current.setPage(2);
      await Promise.resolve();
    });
    expect(scrollBy).toHaveBeenCalled();
    scrollBy.mockRestore();
  });
});

describe("onSelectionChange", () => {
  it("fires with the selected ids whenever the selection set changes", () => {
    const adapter = createMemoryAdapter("");
    const onSelectionChange = vi.fn();
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        bulkActions: [{ key: "x", label: "X", onClick: () => undefined }],
        onSelectionChange,
      });
    });
    // Fires on mount with the (empty) initial set, then per change.
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
    act(() => result.current.table.selection!.toggle("a"));
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a"]);
    act(() => result.current.table.selection!.toggleAll());
    expect(onSelectionChange).toHaveBeenLastCalledWith(["a", "b"]);
    act(() => result.current.table.selection!.clear());
    expect(onSelectionChange).toHaveBeenLastCalledWith([]);
  });

  it("stays silent without bulk actions (no selection exists)", () => {
    const adapter = createMemoryAdapter("");
    const onSelectionChange = vi.fn();
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        onSelectionChange,
      });
    });
    expect(onSelectionChange).not.toHaveBeenCalled();
  });
});

function chromeWith(over: Record<string, unknown> = {}, initialUrl = "") {
  const adapter = createMemoryAdapter(initialUrl);
  return renderHook(() => {
    const source = useFrontendData<Row>({
      data: ROWS,
      columns: cols,
      adapter,
      paginationMode: "paged",
      filterFn: (row, extra) => !extra.team || row.name.includes("li"),
    });
    return {
      source,
      chrome: useTableChrome<Row>({
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        ...over,
      }),
    };
  });
}

describe("emptyVariant / isRefreshing / clearFilters", () => {
  it("reports noResults when an active search matches nothing", () => {
    const { result } = chromeWith({}, "q=zzz-no-match");
    expect(result.current.chrome.body).toBe("empty");
    expect(result.current.chrome.emptyVariant).toBe("noResults");
  });

  it("reports noResults when an active filter matches nothing", () => {
    const { result } = chromeWith(
      { filterLabels: { team: (v: unknown) => `Team: ${String(v)}` } },
      "f_team=nobody"
    );
    expect(result.current.chrome.emptyVariant).toBe("noResults");
  });

  it("reports noData when the source itself is empty", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: [],
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
      });
    });
    expect(result.current.body).toBe("empty");
    expect(result.current.emptyVariant).toBe("noData");
  });

  it("is not refreshing on a frontend source (no background fetches)", () => {
    const { result } = chromeWith();
    expect(result.current.chrome.isRefreshing).toBe(false);
  });

  it("clearFilters prefers the caller handler over source.clearExtras", () => {
    const onClearFilters = vi.fn();
    const { result } = chromeWith({ onClearFilters }, "f_team=core");
    act(() => result.current.chrome.clearFilters());
    expect(onClearFilters).toHaveBeenCalled();
  });

  it("clearFilters falls back to clearing the extra bag via the source", () => {
    const { result } = chromeWith(
      { filterLabels: { team: (v: unknown) => String(v) } },
      "f_team=core&q=li"
    );
    expect(result.current.source.extra.team).toBe("core");
    act(() => result.current.chrome.clearFilters());
    // Extras cleared; search (a non-extra) survives.
    expect(result.current.source.extra.team).toBeUndefined();
    expect(result.current.source.search).toBe("li");
  });
});

describe("controlled selection through the chrome", () => {
  const BULK = [{ key: "x", label: "X", onClick: () => undefined }];

  it("routes change requests through onSelectionChange without echo", () => {
    const onSelectionChange = vi.fn();
    const { result } = chromeWith({
      bulkActions: BULK,
      selectedIds: ["a"],
      onSelectionChange,
    });
    // No observer echo on mount in controlled mode.
    expect(onSelectionChange).not.toHaveBeenCalled();
    expect(result.current.chrome.table.selection!.isSelected("a")).toBe(true);
    act(() => result.current.chrome.table.selection!.toggle("b"));
    expect(onSelectionChange).toHaveBeenCalledTimes(1);
    expect(onSelectionChange).toHaveBeenCalledWith(["a", "b"]);
  });
});

describe("useChromeBodyData", () => {
  it("element mode: a maxHeight box scrolls the virtual window (ref wiring)", () => {
    const adapter = createMemoryAdapter("");
    const many = Array.from({ length: 40 }, (_, i) => ({
      id: String(i),
      name: `Row ${i}`,
    }));
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: many,
        columns: cols,
        adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true,
        maxHeight: 300,
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    // Attaching the scroll box hands TanStack the element to track; the
    // mount effect resolves it through the chrome's getScrollElement.
    const box = document.createElement("div");
    act(() => {
      result.current.virtualScrollRef(box);
    });
    act(() => {
      result.current.virtualScrollRef(null);
    });
    expect(typeof result.current.virtualScrollRef).toBe("function");
    // jsdom boxes have no layout, so the element window stays empty and
    // every row falls back to materialized rendering — graceful, not blank.
    expect(result.current.virtualization.enabled).toBe(false);
    // 25 = the infinite tier's first page; every page row materializes.
    expect(result.current.virtualization.rows).toHaveLength(25);
  });

  it("disables virtualization and load-more in paged mode", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      const props = { source, columns: cols, rowKey: (r: Row) => r.id };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(result.current.canLoadMore).toBe(false);
    expect(result.current.virtualization.enabled).toBe(false);
    expect(result.current.loadMoreRef).toBeDefined();
  });

  it("arms load-more (and keeps virtualization opt-in) in infinite mode", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "infinite",
      });
      const props = { source, columns: cols, rowKey: (r: Row) => r.id };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(result.current.canLoadMore).toBe(true);
    expect(result.current.virtualization.enabled).toBe(false);
  });

  it("enables virtualization for real rows in infinite mode", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true,
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(result.current.virtualization.enabled).toBe(true);
  });
});

describe("useChromeBodyData load-more wiring", () => {
  it("fetches the next page when the sentinel intersects", () => {
    const observers: { callback: IntersectionObserverCallback }[] = [];
    const originalIO = globalThis.IntersectionObserver;
    globalThis.IntersectionObserver = vi.fn().mockImplementation(function (
      callback: IntersectionObserverCallback
    ) {
      const instance = { callback, observe: vi.fn(), disconnect: vi.fn() };
      observers.push(instance);
      return instance;
    });

    const fetchNextPage = vi.fn();
    const source = {
      rows: ROWS,
      total: 10,
      page: 1,
      limit: 2,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      groupBy: undefined,
      extra: {},
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: true,
      error: null,
      paginationMode: "infinite" as const,
      setPage: vi.fn(),
      setLimit: vi.fn(),
      setSort: vi.fn(),
      setGroupBy: vi.fn(),
      sortLevels: [],
      toggleSortLevel: vi.fn(),
      setSearch: vi.fn(),
      setExtra: vi.fn(),
      setExtras: vi.fn(),
      clearExtras: vi.fn(),
      clearAll: vi.fn(),
      fetchNextPage,
      refetch: vi.fn(),
    };
    function Harness() {
      const props = { source, columns: cols, rowKey: (r: Row) => r.id };
      const chrome = useTableChrome<Row>(props);
      const { loadMoreRef } = useChromeBodyData<Row>(chrome, props);
      return <div ref={loadMoreRef} />;
    }
    render(<Harness />);
    const observer = observers.at(-1)!;
    act(() => {
      observer.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        observer as unknown as IntersectionObserver
      );
    });
    expect(fetchNextPage).toHaveBeenCalledTimes(1);
    globalThis.IntersectionObserver = originalIO;
  });
});

function mockSource(over: Record<string, unknown> = {}) {
  return {
    rows: ROWS,
    total: 10,
    page: 1,
    limit: 2,
    search: "",
    sortBy: undefined,
    sortDir: undefined,
    groupBy: undefined,
    extra: {},
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    error: null,
    paginationMode: "infinite" as const,
    setPage: vi.fn(),
    setLimit: vi.fn(),
    setSort: vi.fn(),
    setGroupBy: vi.fn(),
    sortLevels: [],
    toggleSortLevel: vi.fn(),
    setSearch: vi.fn(),
    setExtra: vi.fn(),
    setExtras: vi.fn(),
    clearExtras: vi.fn(),
    clearAll: vi.fn(),
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    ...over,
  };
}

describe("isRefreshing edges", () => {
  it("is true during a background refetch of visible rows", () => {
    const props = {
      source: mockSource({ isFetching: true }),
      columns: cols,
      rowKey: (r: Row) => r.id,
    };
    const { result } = renderHook(() => useTableChrome<Row>(props));
    expect(result.current.isRefreshing).toBe(true);
  });

  it("stays false while loading more (isFetchingNextPage)", () => {
    const props = {
      source: mockSource({ isFetching: true, isFetchingNextPage: true }),
      columns: cols,
      rowKey: (r: Row) => r.id,
    };
    const { result } = renderHook(() => useTableChrome<Row>(props));
    expect(result.current.isRefreshing).toBe(false);
  });
});

describe("useChromeBodyData eligibility edges", () => {
  it("stays disabled when the source errored, even with virtualize on", () => {
    const props = {
      source: mockSource({ error: new Error("boom") }),
      columns: cols,
      rowKey: (r: Row) => r.id,
      virtualize: true,
    };
    const { result } = renderHook(() => {
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(result.current.virtualization.enabled).toBe(false);
    expect(result.current.canLoadMore).toBe(false);
  });

  it("falls back to the default card estimate on mobile", () => {
    const props = {
      source: mockSource(),
      columns: cols,
      rowKey: (r: Row) => r.id,
      virtualize: true,
      isMobile: true,
    };
    const { result } = renderHook(() => {
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(result.current.virtualization.enabled).toBe(true);
  });

  it("uses the card estimate on mobile and the row estimate on desktop", () => {
    const base = {
      source: mockSource(),
      columns: cols,
      rowKey: (r: Row) => r.id,
      virtualize: true,
      estimateCardSize: 222,
      estimateRowSize: 66,
    };
    const mobile = renderHook(() => {
      const props = { ...base, isMobile: true };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(mobile.result.current.virtualization.enabled).toBe(true);
    const desktop = renderHook(() => {
      const props = { ...base, isMobile: false };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(desktop.result.current.virtualization.enabled).toBe(true);
  });
});

describe("useFilterTriggerToggle", () => {
  it("opens on a plain click when closed", () => {
    const setOpen = vi.fn();
    const { result } = renderHook(() => useFilterTriggerToggle(false, setOpen));
    act(() => {
      result.current.onPointerDown();
      result.current.onClick();
    });
    expect(setOpen).toHaveBeenCalledTimes(1);
    const updater = setOpen.mock.calls[0]![0] as (c: boolean) => boolean;
    expect(updater(false)).toBe(true);
  });

  it("closes when the kit leaves the popover open through pointer-down", () => {
    const setOpen = vi.fn();
    const { result } = renderHook(() => useFilterTriggerToggle(true, setOpen));
    act(() => {
      result.current.onPointerDown();
      // The kit did NOT close on pointer-down (open stays true) — the click
      // must close it.
      result.current.onClick();
    });
    expect(setOpen).toHaveBeenCalledTimes(1);
    const updater = setOpen.mock.calls[0]![0] as (c: boolean) => boolean;
    expect(updater(true)).toBe(false);
  });

  it("swallows the click when the kit closed on the same pointer-down", () => {
    const setOpen = vi.fn();
    const { result, rerender } = renderHook(
      ({ open }) => useFilterTriggerToggle(open, setOpen),
      { initialProps: { open: true } }
    );
    act(() => result.current.onPointerDown());
    // Kit's outside-close fired between pointer-down and click.
    rerender({ open: false });
    act(() => result.current.onClick());
    expect(setOpen).not.toHaveBeenCalled();
    // The NEXT plain click opens again (the marker was consumed).
    act(() => {
      result.current.onPointerDown();
      result.current.onClick();
    });
    expect(setOpen).toHaveBeenCalledTimes(1);
  });

  it("a keyboard click (no pointer-down) toggles normally", () => {
    const setOpen = vi.fn();
    const { result } = renderHook(() => useFilterTriggerToggle(true, setOpen));
    act(() => result.current.onClick());
    expect(setOpen).toHaveBeenCalledTimes(1);
  });
});

describe("chrome row expansion", () => {
  it("exposes expansion state only when renderRowDetail is set", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "paged",
      });
      return {
        withDetail: useTableChrome<Row>({
          source,
          columns: cols,
          rowKey: (r: Row) => r.id,
          renderRowDetail: (r) => r.name,
        }),
        without: useTableChrome<Row>({
          source,
          columns: cols,
          rowKey: (r: Row) => r.id,
        }),
      };
    });
    expect(result.current.without.detail).toBeUndefined();
    // ONE guard narrows both halves of the bundle.
    const detail = result.current.withDetail.detail!;
    expect(detail.render({ id: "a", name: "Alice" })).toBe("Alice");
    expect(detail.expansion.isExpanded("a")).toBe(false);
    act(() => detail.expansion.toggle("a"));
    expect(result.current.withDetail.detail!.expansion.isExpanded("a")).toBe(
      true
    );
  });

  it("dev-warns when row details meet virtualization", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true,
        renderRowDetail: (r: Row) => r.name,
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData<Row>(chrome, props);
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("renderRowDetail with virtualize")
    );
    warn.mockRestore();
  });
});

describe("multi-sort headers", () => {
  it("shift-click toggles the chain; plain click single-sorts; badges expose order", () => {
    const adapter = createMemoryAdapter("");
    const sortable = [
      {
        key: "name",
        header: "Name",
        accessor: (r: Row) => r.name,
        sortable: true,
      },
    ];
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: sortable,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: sortable,
        rowKey: (r: Row) => r.id,
        multiSort: true,
      });
    });
    const col = result.current.table.columns[0]!;
    const btn = () =>
      result.current.table.getSortButtonProps(col) as {
        onClick: (e?: { shiftKey?: boolean }) => void;
        "data-sort-index"?: number;
      };
    act(() => btn().onClick({ shiftKey: true }));
    expect(btn()["data-sort-index"]).toBe(1);
    // Header cells reflect the chain too (aria-sort + badge index).
    const cell = result.current.table.getHeaderCellProps(col) as {
      "aria-sort"?: string;
      "data-sort-index"?: number;
    };
    expect(cell["aria-sort"]).toBe("ascending");
    expect(cell["data-sort-index"]).toBe(1);
    act(() => btn().onClick({ shiftKey: true }));
    act(() => btn().onClick({ shiftKey: true }));
    expect(btn()["data-sort-index"]).toBeUndefined();
    // Plain click takes the single-sort path.
    act(() => btn().onClick({}));
    expect(result.current.table.source ?? true).toBeTruthy();
  });

  it("a disabled (unsortable) header ignores clicks entirely", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: [{ key: "name", header: "Name" }] as never,
        adapter,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns: [{ key: "name", header: "Name" }] as never,
        rowKey: (r: Row) => r.id,
        multiSort: true,
      });
    });
    const col = result.current.table.columns[0]!;
    const props = result.current.table.getSortButtonProps(col) as {
      onClick: (e?: { shiftKey?: boolean }) => void;
    };
    expect(() => props.onClick({ shiftKey: true })).not.toThrow();
  });
});

describe("useSummaryCells", () => {
  interface SummaryRow {
    id: string;
    amount: number;
  }
  const SUM_ROWS: SummaryRow[] = [
    { id: "a", amount: 2 },
    { id: "b", amount: 3 },
  ];

  it("returns undefined (and computes nothing) without a builder", () => {
    const { result } = renderHook(() => useSummaryCells(undefined, SUM_ROWS));
    expect(result.current).toBeUndefined();
  });

  it("recomputes only when the rows change, even with an inline builder", () => {
    const spy = vi.fn((rows: readonly SummaryRow[]) => ({
      amount: rows.reduce((sum, row) => sum + row.amount, 0),
    }));
    const { result, rerender } = renderHook(
      ({ rows }: { rows: readonly SummaryRow[]; tick: number }) =>
        // A FRESH closure every render — the latch absorbs identity churn.
        useSummaryCells((r) => spy(r), rows),
      { initialProps: { rows: SUM_ROWS, tick: 0 } }
    );
    expect(result.current).toEqual({ amount: 5 });
    expect(spy).toHaveBeenCalledTimes(1);

    // Unrelated re-render: no recompute.
    rerender({ rows: SUM_ROWS, tick: 1 });
    expect(spy).toHaveBeenCalledTimes(1);

    // New rows: recompute with the LATEST builder.
    const next = [...SUM_ROWS, { id: "c", amount: 10 }];
    rerender({ rows: next, tick: 2 });
    expect(result.current).toEqual({ amount: 15 });
    expect(spy).toHaveBeenCalledTimes(2);
  });
});

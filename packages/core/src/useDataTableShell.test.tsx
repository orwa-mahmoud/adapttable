import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { FilterDef } from "./filters/filterDefs";
import { useFrontendData } from "./source/useFrontendData";
import type { ColumnDef, RowAction } from "./types";
import { createMemoryAdapter } from "./url/adapter";
import { useDataTableShell } from "./useDataTableShell";
import type * as TableChromeModule from "./useTableChrome";
import { useChromeBodyData } from "./useTableChrome";
import { resetDevWarnings } from "./utils/devWarn";

// The body-data hook is mocked so the virtual-window / load-more branches can
// be driven directly (jsdom can't measure a real virtualizer).
vi.mock("./useTableChrome", async (importOriginal) => {
  const actual = await importOriginal<typeof TableChromeModule>();
  return { ...actual, useChromeBodyData: vi.fn(actual.useChromeBodyData) };
});

const actualChrome =
  await vi.importActual<typeof TableChromeModule>("./useTableChrome");

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name },
];
const rowKey = (r: Row) => r.id;
const noForm = () => null;

beforeEach(() => {
  vi.mocked(useChromeBodyData).mockImplementation(
    actualChrome.useChromeBodyData
  );
});

describe("useDataTableShell", () => {
  it("resolves the frontend tier and builds the prop bundles", () => {
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey }, noForm)
    );
    expect(result.current.source.rows).toHaveLength(2);
    expect(result.current.hasRowActions).toBe(false);
    expect(result.current.tableProps.setWidth).toBeUndefined();
    expect(result.current.tableProps.rowActions).toBeUndefined();
    expect(result.current.toolbarProps.hasFilters).toBe(false);
    expect(result.current.filtersNode).toBeUndefined();
  });

  it("renders the auto-form for declarative filters", () => {
    const filters: FilterDef<Row>[] = [
      { key: "name", type: "text", label: "Name" },
    ];
    const renderForm = vi.fn(() => <div>form</div>);
    const { result } = renderHook(() =>
      useDataTableShell(
        { data: ROWS, columns, rowKey, urlSync: false, filters },
        renderForm
      )
    );
    expect(renderForm).toHaveBeenCalled();
    expect(result.current.filtersNode).toBeDefined();
    expect(result.current.toolbarProps.hasFilters).toBe(true);
  });

  it("passes hand-drawn JSX filters through untouched", () => {
    const jsx = <div>custom</div>;
    const { result } = renderHook(() =>
      useDataTableShell(
        { data: ROWS, columns, rowKey, urlSync: false, filters: jsx },
        noForm
      )
    );
    expect(result.current.filtersNode).toBe(jsx);
  });

  it("exposes row actions and resizing when provided", () => {
    const rowActions: RowAction<Row>[] = [
      { key: "x", label: "X", onClick: vi.fn() },
    ];
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlSync: false,
          rowActions,
          resizableColumns: true,
        },
        noForm
      )
    );
    expect(result.current.hasRowActions).toBe(true);
    expect(result.current.tableProps.rowActions).toHaveLength(1);
    expect(result.current.tableProps.setWidth).toBeTypeOf("function");
  });

  it("forwards a virtual window into tableProps", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: true,
        rows: [{ row: ROWS[1]!, index: 1, key: "b" }],
        paddingTop: 8,
        paddingBottom: 8,
        measureElement: vi.fn(),
      },
      loadMoreRef: { current: null },
      canLoadMore: true,
      virtualScrollRef: () => undefined,
    });
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey, urlSync: false }, noForm)
    );
    expect(result.current.tableProps.rowEntries).toHaveLength(1);
    expect(result.current.tableProps.paddingTop).toBe(8);
    expect(result.current.toolbarProps.showRowsPerPage).toBe(true);
  });

  it("covers the server tier and the optional pass-through props", () => {
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlSync: false,
          onQueryChange: vi.fn(),
          total: 5,
          loading: false,
          locale: "en",
          urlKey: "t",
          stickyHeader: true,
          stickyTop: 12,
          maxHeight: 400,
          onRowClick: vi.fn(),
          rowClassName: () => "x",
          renderRowDetail: () => <div>detail</div>,
          summaryRow: () => ({}),
          sortByOptions: [],
          skeletonRows: 3,
          searchPlaceholder: "Search…",
        },
        noForm
      )
    );
    expect(result.current.source.total).toBe(5);
    expect(result.current.tableProps.stickyHeader).toBe(true);
    expect(result.current.toolbarProps.searchPlaceholder).toBe("Search…");
  });

  it("forwards mode and prefetch (previously dead surface)", () => {
    const onQueryChange = vi.fn();
    const prefetch = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          mode: "frontend",
          onQueryChange,
          prefetch,
          columns,
          rowKey,
          urlAdapter: adapter,
        },
        noForm
      )
    );
    // mode="frontend" reached useTableData: local processing kept, and
    // the notification did NOT fire on mount (server mode would have).
    expect(result.current.source.rows).toHaveLength(2);
    expect(onQueryChange).not.toHaveBeenCalled();
    // prefetch reaches the table renderer's prop bundle.
    expect(result.current.tableProps.prefetch).toBe(prefetch);
  });

  it("forwards defaults and paginationMode into the resolved source", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useDataTableShell(
        {
          data: ROWS,
          columns,
          rowKey,
          urlAdapter: adapter,
          defaults: { limit: 1, sortBy: "name" },
          paginationMode: "infinite",
        },
        noForm
      )
    );
    // defaults seeded the silent-URL state; the mode reached the source.
    expect(result.current.source.limit).toBe(1);
    expect(result.current.source.sortBy).toBe("name");
    expect(result.current.source.paginationMode).toBe("infinite");
    expect(result.current.source.rows).toHaveLength(1);
  });

  it("forwards searchDebounceMs into the table's search commit", () => {
    vi.useFakeTimers();
    try {
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() =>
        useDataTableShell(
          {
            data: ROWS,
            columns,
            rowKey,
            urlAdapter: adapter,
            searchDebounceMs: 50,
          },
          noForm
        )
      );
      act(() => result.current.table.setSearchValue("ali"));
      // Committed after the CUSTOM debounce, well before the 300ms default.
      act(() => vi.advanceTimersByTime(50));
      expect(result.current.source.search).toBe("ali");
    } finally {
      vi.useRealTimers();
    }
  });

  it("dev-warns when virtualize is inert on a paged table", () => {
    resetDevWarnings();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    try {
      const adapter = createMemoryAdapter("");
      renderHook(() =>
        useDataTableShell(
          {
            data: ROWS,
            columns,
            rowKey,
            urlAdapter: adapter,
            paginationMode: "paged",
            virtualize: true,
          },
          noForm
        )
      );
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('paginationMode="infinite"')
      );
    } finally {
      warn.mockRestore();
      resetDevWarnings();
    }
  });

  it("forwards error into the resolved source", () => {
    const boom = new Error("boom");
    const { result } = renderHook(() =>
      useDataTableShell(
        { data: ROWS, columns, rowKey, urlSync: false, error: boom },
        noForm
      )
    );
    expect(result.current.source.error).toBe(boom);
  });

  it("covers a prebuilt source and a live URL adapter", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData({ data: ROWS, columns });
      return useDataTableShell(
        { source, columns, rowKey, urlAdapter: adapter, urlKey: "p" },
        noForm
      );
    });
    expect(result.current.source.rows).toHaveLength(2);
  });

  it("suppresses the virtual window and load-more when off", () => {
    vi.mocked(useChromeBodyData).mockReturnValue({
      virtualization: {
        enabled: false,
        rows: [],
        paddingTop: 0,
        paddingBottom: 0,
      },
      loadMoreRef: { current: null },
      canLoadMore: false,
      virtualScrollRef: () => undefined,
    });
    const { result } = renderHook(() =>
      useDataTableShell({ data: ROWS, columns, rowKey, urlSync: false }, noForm)
    );
    expect(result.current.canLoadMore).toBe(false);
    expect(result.current.tableProps.rowEntries).toBeUndefined();
  });
});

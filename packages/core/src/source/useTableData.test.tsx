import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, expectTypeOf, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { resetDevWarnings } from "../utils/devWarn";
import { useFrontendData } from "./useFrontendData";
import { type TableQuery, useServerData } from "./useServerData";
import { type DataModeProps, useTableData } from "./useTableData";

interface Row {
  id: string;
  name: string;
  status: string;
  budget: number;
}

const ROWS: Row[] = [
  { id: "1", name: "Alice", status: "active", budget: 100 },
  { id: "2", name: "Bob", status: "blocked", budget: 900 },
  { id: "3", name: "Cara", status: "active", budget: 500 },
];

const columns: ColumnDef<Row>[] = [
  { key: "name" },
  { key: "status", filter: { type: "select" } },
];

beforeEach(() => resetDevWarnings());

describe("useTableData — frontend tier", () => {
  it("auto-filters rows from the declarative runtime (URL-restored)", () => {
    const adapter = createMemoryAdapter("f_status=active&f_budgetMin=300");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        columns,
        filters: [{ key: "budget", type: "numberRange" }],
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    // status=active AND budget>=300 → only Cara.
    expect(result.current.source.rows.map((r) => r.name)).toEqual(["Cara"]);
    // numberRange registered its keys, so the URL value parsed as a number.
    expect(result.current.source.extra.budgetMin).toBe(300);
  });

  it("AND-composes a user filterFn with the declarative predicate", () => {
    const adapter = createMemoryAdapter("f_status=active");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        columns,
        urlAdapter: adapter,
        paginationMode: "paged",
        filterFn: (row) => row.budget < 200,
      })
    );
    expect(result.current.source.rows.map((r) => r.name)).toEqual(["Alice"]);
  });

  it("exposes the merged runtime (defs, chips) for the adapters", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableData<Row>({ data: ROWS, columns, urlAdapter: adapter })
    );
    expect(result.current.runtime.defs.map((d) => d.key)).toEqual(["status"]);
    expect(result.current.runtime.filterLabels.status!("active")).toBe(
      "Status: active"
    );
  });
});

describe("useTableData — tier resolution", () => {
  it("a provided source wins, with a dev warning when data is also passed", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const external = {
      rows: ROWS,
      total: 3,
      page: 1,
      limit: 8,
      search: "",
      sortBy: undefined,
      sortDir: undefined,
      groupBy: undefined,
      extra: {},
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      error: null,
      paginationMode: "paged" as const,
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
    };
    const { result } = renderHook(() =>
      useTableData<Row>({ source: external, data: ROWS, columns })
    );
    expect(result.current.source).toBe(external);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("using `source`")
    );
    warn.mockRestore();
  });

  it("warns when source is combined with onQueryChange too", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const { source } = useTableData<Row>({
        data: ROWS,
        columns,
        urlAdapter: adapter,
      });
      return useTableData<Row>({
        source,
        onQueryChange: vi.fn(),
        columns,
        urlAdapter: adapter,
      });
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("using `source`")
    );
    warn.mockRestore();
  });

  it("warns when no tier is provided at all", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    renderHook(() =>
      useTableData<Row>({ columns, urlAdapter: createMemoryAdapter("") })
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("no data tier provided")
    );
    warn.mockRestore();
  });
});

describe("useTableData — explicit mode", () => {
  it("mode='frontend' keeps local processing and notifies without rerouting", async () => {
    const onQueryChange = vi.fn();
    // limit=2 → two real pages, so a page change actually commits.
    const adapter = createMemoryAdapter("limit=2");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        mode: "frontend",
        onQueryChange,
        columns,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    // The table still processes data itself (frontend tier)…
    expect(result.current.source.rows).toHaveLength(2);
    // …and the notification NEVER fires on mount.
    expect(onQueryChange).not.toHaveBeenCalled();

    // Sort commit → one notification with the consolidated query.
    act(() => result.current.source.setSort("name", "asc"));
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(1));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ sortBy: "name", sortDir: "asc" }),
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    // Rows are STILL locally sorted — the handler observed, not rerouted.
    expect(result.current.source.rows[0]?.name).toBe("Alice");

    // Filter, page and search commits each notify too.
    act(() => result.current.source.setExtra("status", "active"));
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(2));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ filters: { status: "active" } }),
      expect.anything()
    );
    act(() => result.current.source.setExtra("status", undefined));
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(3));
    act(() => result.current.source.setPage(2));
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(4));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    );
    act(() => result.current.source.setSearch("ali"));
    await waitFor(() => expect(onQueryChange).toHaveBeenCalledTimes(5));
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ search: "ali" }),
      expect.anything()
    );
  });

  it("mode='server' selects the server tier explicitly", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        total: 30,
        mode: "server",
        onQueryChange,
        columns,
        urlAdapter: adapter,
      })
    );
    // Server tier: rows pass through untouched, mount fire happens.
    expect(result.current.source.rows).toHaveLength(3);
    expect(result.current.source.total).toBe(30);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it("mode together with source dev-warns and source wins", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    resetDevWarnings();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const prebuilt = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns,
        paginationMode: "paged",
      });
      return useTableData<Row>({
        source: prebuilt,
        mode: "frontend",
        columns,
        urlAdapter: adapter,
      });
    });
    expect(result.current.source.rows).toHaveLength(3);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("`mode` is ignored when `source` is provided")
    );
    warn.mockRestore();
    resetDevWarnings();
  });

  it("mode='server' without onQueryChange does not compile", () => {
    // Compile-time contract: the union's server branch REQUIRES the
    // handler; the frontend branch forbids mode="server".
    expectTypeOf<{ mode: "server" }>().not.toExtend<DataModeProps<Row>>();
    expectTypeOf<{
      mode: "server";
      onQueryChange: (q: TableQuery, i: { signal: AbortSignal }) => void;
    }>().toExtend<DataModeProps<Row>>();
    expectTypeOf<{ mode: "frontend" }>().toExtend<DataModeProps<Row>>();
    expectTypeOf<object>().toExtend<DataModeProps<Row>>();
  });
});

describe("useTableData / useServerData — server tier", () => {
  it("server mode with no rows yet starts empty and URL-enabled", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useTableData<Row>({
        // No `data` yet (first fetch still out) — rows default to [].
        total: 0,
        loading: true,
        onQueryChange,
        columns,
        urlAdapter: adapter,
        urlSync: true,
      })
    );
    expect(result.current.source.rows).toEqual([]);
    expect(result.current.source.isLoading).toBe(true);
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it("emits the URL-restored query once on mount with an abort signal", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("q=ali&f_status=active&page=2");
    const { rerender } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        total: 40,
        loading: false,
        onQueryChange,
        columns,
        urlAdapter: adapter,
      })
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    const [query, info] = onQueryChange.mock.calls[0]!;
    expect(query).toMatchObject({
      page: 2,
      search: "ali",
      filters: { status: "active" },
    });
    expect(info.signal).toBeInstanceOf(AbortSignal);
    // Re-render with the identical query → no re-emit.
    rerender();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
  });

  it("clamps a stale out-of-range deep link to the last page", async () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("page=999");
    const { result } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 50, // 5 pages at the default limit of 25 → 2 pages
        loading: false,
        onQueryChange,
        urlAdapter: adapter,
      })
    );
    await waitFor(() => {
      expect(result.current.page).toBe(2);
    });
    // The URL self-heals too, and the corrected query is re-emitted.
    expect(adapter.getSearch()).toContain("page=2");
    expect(onQueryChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 2 }),
      expect.anything()
    );
    // While a request is in flight, no clamping happens (total may be stale).
    const loadingAdapter = createMemoryAdapter("page=999");
    const loadingView = renderHook(() =>
      useServerData<Row>({
        rows: [],
        total: 0,
        loading: true,
        onQueryChange: vi.fn(),
        urlAdapter: loadingAdapter,
      })
    );
    expect(loadingView.result.current.page).toBe(999);
  });

  it("aborts the superseded request when the query changes", () => {
    const seen: AbortSignal[] = [];
    const onQueryChange = vi.fn((_q, { signal }: { signal: AbortSignal }) => {
      seen.push(signal);
    });
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 40,
        onQueryChange,
        urlAdapter: adapter,
      })
    );
    act(() => result.current.setSearch("bo"));
    expect(seen).toHaveLength(2);
    expect(seen[0]!.aborted).toBe(true);
    expect(seen[1]!.aborted).toBe(false);
  });

  it("rows pass through untouched; pager math comes from total", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useServerData<Row>({ rows: ROWS, total: 40, urlAdapter: adapter })
    );
    expect(result.current.rows).toBe(ROWS);
    // Shared contract: append semantics are infinite-only — in paged mode
    // more data is reached through setPage, never fetchNextPage.
    expect(result.current.hasNextPage).toBe(false);
    expect(result.current.total).toBe(40);
    expect(result.current.paginationMode).toBe("paged");
  });

  it("distinguishes first load from background refresh", () => {
    const adapter = createMemoryAdapter("");
    const first = renderHook(() =>
      useServerData<Row>({
        rows: [],
        total: 0,
        loading: true,
        urlAdapter: adapter,
      })
    );
    expect(first.result.current.isLoading).toBe(true);
    const refresh = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 3,
        loading: true,
        urlAdapter: adapter,
      })
    );
    expect(refresh.result.current.isLoading).toBe(false);
    expect(refresh.result.current.isFetching).toBe(true);
  });

  it("refetch re-emits the same query; paged fetchNextPage no-ops", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 40,
        onQueryChange,
        urlAdapter: adapter,
      })
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    // `refetch` is optional on TableSource but useServerData always sets it.
    act(() => result.current.refetch!());
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange.mock.calls.at(-1)![0].page).toBe(1);
    // Shared contract: fetchNextPage appends in infinite mode only — in
    // paged mode it never advances the page (that is setPage's job).
    act(() => result.current.fetchNextPage());
    expect(onQueryChange).toHaveBeenCalledTimes(2);
  });

  it("aborts the in-flight request on unmount", () => {
    const seen: AbortSignal[] = [];
    const adapter = createMemoryAdapter("");
    const { unmount } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 3,
        onQueryChange: (_q, { signal }) => {
          seen.push(signal);
        },
        urlAdapter: adapter,
      })
    );
    unmount();
    expect(seen[0]!.aborted).toBe(true);
  });

  it("stays silent without an onQueryChange emitter", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useServerData<Row>({ rows: ROWS, total: 3, urlAdapter: adapter })
    );
    expect(result.current.rows).toBe(ROWS);
  });
});

describe("async filter options through useTableData", () => {
  it("chips re-label once the loader resolves — ONE fetch shared with the form", async () => {
    const loader = vi.fn(() =>
      Promise.resolve([{ value: "c1", label: "Acme Corp" }])
    );
    const adapter = createMemoryAdapter("f_companyId=c1");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        columns: [{ key: "name" }],
        filters: [
          {
            key: "companyId",
            type: "select",
            label: "Company",
            options: loader,
          },
        ],
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    // Pending: chips label with the raw value; the form would see the SAME
    // cached promise (def.options identity) — call it like the form does.
    expect(result.current.runtime.filterLabels.companyId!("c1")).toBe(
      "Company: c1"
    );
    const formSide = result.current.runtime.defs[0]!.options;
    expect(typeof formSide).toBe("function");
    await (formSide as () => Promise<unknown>)();
    await waitFor(() =>
      expect(result.current.runtime.filterLabels.companyId!("c1")).toBe(
        "Company: Acme Corp"
      )
    );
    // Chips + form shared one underlying fetch.
    expect(loader).toHaveBeenCalledTimes(1);
    // Once loaded the defs carry the ARRAY (instant form).
    expect(Array.isArray(result.current.runtime.defs[0]!.options)).toBe(true);
  });

  it("a rejecting loader leaves raw-value chips and never crashes", async () => {
    const loader = vi.fn(() => Promise.reject(new Error("nope")));
    const adapter = createMemoryAdapter("f_companyId=c1");
    const { result } = renderHook(() =>
      useTableData<Row>({
        data: ROWS,
        columns: [{ key: "name" }],
        filters: [
          {
            key: "companyId",
            type: "select",
            label: "Company",
            options: loader,
          },
        ],
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    await waitFor(() => expect(loader).toHaveBeenCalled());
    expect(result.current.runtime.filterLabels.companyId!("c1")).toBe(
      "Company: c1"
    );
  });

  it("re-renders while pending reuse the cached loader; unmount drops the late result", async () => {
    let resolve!: (v: readonly { value: string; label: string }[]) => void;
    const gate = new Promise<readonly { value: string; label: string }[]>(
      (r) => {
        resolve = r;
      }
    );
    const loader = vi.fn(() => gate);
    const adapter = createMemoryAdapter("");
    const filtersDef = [
      {
        key: "companyId",
        type: "select" as const,
        label: "Company",
        options: loader,
      },
    ];
    const { result, rerender, unmount } = renderHook(
      ({ data }) =>
        useTableData<Row>({
          data,
          columns: [{ key: "name" }],
          filters: filtersDef,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { initialProps: { data: ROWS } }
    );
    const firstFn = result.current.runtime.defs[0]!.options;
    // New data identity rebuilds the runtime while the load is pending —
    // the SAME cached loader must come back (no second fetch).
    rerender({ data: [...ROWS] });
    expect(result.current.runtime.defs[0]!.options).toBe(firstFn);
    expect(loader).toHaveBeenCalledTimes(1);
    unmount();
    resolve([{ value: "x", label: "X" }]);
    await gate;
    // Late resolution after unmount: nothing to assert beyond no crash —
    // the alive guard swallowed it.
    expect(loader).toHaveBeenCalledTimes(1);
  });
});

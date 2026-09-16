import {
  applyRowPatches,
  resetDevWarnings,
  rowPatchLog,
  updateRow,
} from "@adapttable/core";
import { act, renderHook } from "@testing-library/react";
import { useEffect, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { createMemoryAdapter } from "../url/adapter";
import {
  defaultFrontendRowId,
  defaultSearchText,
  useFrontendData,
  type UseFrontendDataOptions,
} from "./useFrontendData";

interface Row {
  id: string;
  name: string;
  count: number;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", count: 3 },
  { id: "b", name: "Bob", count: 7 },
  { id: "c", name: "Charlie", count: 1 },
];

const cols: ColumnDef<Row>[] = [
  { key: "count", header: "Count", sortable: true, sortValue: (r) => r.count },
];

function render(initial = "", opts: Partial<UseFrontendDataOptions<Row>> = {}) {
  const adapter = createMemoryAdapter(initial);
  return renderHook(() =>
    useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      paginationMode: "paged",
      ...opts,
    })
  );
}

describe("useFrontendData", () => {
  it("returns all rows with no search or sort", () => {
    const { result } = render();
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(result.current.total).toBe(3);
  });

  it("filters by the search term using the default projector", () => {
    const { result } = render("q=bob");
    expect(result.current.rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("filters with a custom getSearchText", () => {
    const { result } = render("q=3", {
      getSearchText: (r) => String(r.count),
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["a"]);
  });

  it("sorts via a column sortValue", () => {
    const { result } = render("sortBy=count&sortDir=asc", { columns: cols });
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
  });

  it("sorts via an explicit getSortValue overriding the column", () => {
    const { result } = render("sortBy=count&sortDir=desc", {
      columns: cols,
      getSortValue: (r) => r.name,
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("treats a sortable column with no extractor as equal (stable order)", () => {
    const { result } = render("sortBy=name&sortDir=asc", {
      columns: [{ key: "name", header: "Name", sortable: true }],
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the accessor when a sortable column has no sortValue", () => {
    const { result } = render("sortBy=name&sortDir=desc", {
      columns: [
        {
          key: "name",
          header: "Name",
          accessor: (r) => r.name,
          sortable: true,
        },
      ],
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["c", "b", "a"]);
  });

  it("lets a column's own null sort value stand instead of reading its accessor", () => {
    // A declared `sortValue` owns the whole column: `null` means this row has
    // no place in the order, so it groups at the end either way round. Reading
    // the accessor for those rows would order one column by two different
    // extractors at once — Bob by his name, everyone else by their count.
    const columns: ColumnDef<Row>[] = [
      {
        key: "count",
        header: "Count",
        accessor: (r) => r.name,
        sortValue: (r) => (r.name === "Bob" ? null : r.count),
        sortable: true,
      },
    ];
    const asc = render("sortBy=count&sortDir=asc", { columns });
    expect(asc.result.current.rows.map((r) => r.id)).toEqual(["c", "a", "b"]);
    const desc = render("sortBy=count&sortDir=desc", { columns });
    expect(desc.result.current.rows.map((r) => r.id)).toEqual(["a", "c", "b"]);
  });

  it("applies filterFn against the extra bag, after search", () => {
    const { result } = render("f_only=Bob", {
      filterFn: (row, extra) => extra.only == null || row.name === extra.only,
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["b"]);
  });

  it("ANDs the filter tree after filterFn", () => {
    const { result } = render(
      "ft=1." +
        JSON.stringify({
          combinator: "or",
          conditions: [{ key: "name", op: "eq", value: "Bob" }],
        }),
      {
        filterTreeFn: (row, tree) =>
          tree.conditions.some(
            (node) =>
              "key" in node && node.key === "name" && row.name === node.value
          ),
      }
    );
    expect(result.current.rows.map((r) => r.id)).toEqual(["b"]);
    expect(result.current.filterTree?.combinator).toBe("or");
  });

  it("filterFn with an empty extra bag keeps every row", () => {
    const { result } = render("", {
      filterFn: (row, extra) => extra.only == null || row.name === extra.only,
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("paged mode slices to the active page", () => {
    const { result } = render("page=2&limit=2");
    expect(result.current.rows.map((r) => r.id)).toEqual(["c"]);
  });

  it("clamps an out-of-range page", () => {
    const { result } = render("page=99&limit=2");
    expect(result.current.page).toBe(2);
  });

  it("infinite mode flattens cumulatively and advances via fetchNextPage", () => {
    const { result } = render("limit=2", { paginationMode: "infinite" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(result.current.hasNextPage).toBe(true);
    act(() => result.current.fetchNextPage());
    expect(result.current.page).toBe(2);
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("fetchNextPage is a no-op when there is no more data", () => {
    const { result } = render("limit=10", { paginationMode: "infinite" });
    expect(result.current.hasNextPage).toBe(false);
    act(() => result.current.fetchNextPage());
    expect(result.current.page).toBe(1);
  });

  it("resolves auto mode to paged on desktop and infinite on mobile", () => {
    const desktop = render("", { paginationMode: "auto", forceMobile: false });
    expect(desktop.result.current.paginationMode).toBe("paged");
    const mobile = render("", { paginationMode: "auto", forceMobile: true });
    expect(mobile.result.current.paginationMode).toBe("infinite");
  });

  it("forwards error / refetch / loading flags", () => {
    const refetch = vi.fn();
    const err = new Error("boom");
    const { result } = render("", {
      error: err,
      refetch,
      isFetching: true,
      isLoading: true,
    });
    expect(result.current.error).toBe(err);
    expect(result.current.refetch).toBe(refetch);
    expect(result.current.isFetching).toBe(true);
    expect(result.current.isLoading).toBe(true);
  });
});

describe("dev warnings for unresolvable sorts", () => {
  it("warns when sortBy matches no column (columns not passed)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render("sortBy=name&sortDir=asc");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('sortBy "name" matches no column')
    );
    resetDevWarnings();
    vi.restoreAllMocks();
  });

  it("warns when the column's accessor yields a non-primitive and no sortValue exists", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render("sortBy=name&sortDir=asc", {
      columns: [
        { key: "name", header: "Name", accessor: (r) => <b>{r.name}</b> },
      ],
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('column "name" has no sortable value')
    );
    resetDevWarnings();
    vi.restoreAllMocks();
  });

  it("stays silent when the sort resolves (sortValue present)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render("sortBy=count&sortDir=asc", { columns: cols });
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it("stays silent when an explicit getSortValue is supplied", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    render("sortBy=anything&sortDir=asc", {
      getSortValue: (r) => r.count,
    });
    expect(warn).not.toHaveBeenCalled();
    vi.restoreAllMocks();
  });
});

describe("defaultSearchText", () => {
  it("flattens object values and JSON-stringifies nested ones", () => {
    expect(defaultSearchText({ a: 1, b: { c: "x" }, d: null })).toContain(
      '{"c":"x"}'
    );
  });
  it("stringifies primitives directly", () => {
    expect(defaultSearchText("hello")).toBe("hello");
    expect(defaultSearchText(null)).toBe("");
  });
});

describe("multi-sort chain on the frontend tier", () => {
  interface TeamRow {
    id: string;
    name: string;
    team: string;
  }

  it("sorts by the URL chain, ties falling through", () => {
    const adapter = createMemoryAdapter("sort=team%3Aasc,name%3Adesc");
    const { result } = renderHook(() =>
      useFrontendData<TeamRow>({
        data: [
          { id: "1", name: "Ann", team: "b" },
          { id: "2", name: "Zoe", team: "a" },
          { id: "3", name: "Bob", team: "a" },
        ],
        columns: [
          { key: "name", header: "Name", accessor: (r) => r.name },
          { key: "team", header: "Team", accessor: (r) => r.team },
        ],
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.rows.map((r) => r.name)).toEqual([
      "Zoe",
      "Bob",
      "Ann",
    ]);
    expect(result.current.sortLevels).toHaveLength(2);
  });

  it("toggling the chain down to empty restores the unsorted order", () => {
    const adapter = createMemoryAdapter("sort=name%3Aasc");
    const { result } = renderHook(() =>
      useFrontendData<Pick<TeamRow, "id" | "name">>({
        data: [
          { id: "1", name: "Zoe" },
          { id: "2", name: "Ann" },
        ],
        columns: [{ key: "name", header: "Name", accessor: (r) => r.name }],
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.rows[0]!.name).toBe("Ann");
    act(() => result.current.toggleSortLevel("name")); // asc → desc
    expect(result.current.rows[0]!.name).toBe("Zoe");
    act(() => result.current.toggleSortLevel("name")); // desc → removed
    expect(result.current.rows[0]!.name).toBe("Zoe"); // original order
    expect(result.current.sortLevels).toEqual([]);
  });
});

describe("defaultFrontendRowId", () => {
  it("reads a string or number id, otherwise empty", () => {
    expect(defaultFrontendRowId({ id: "a" })).toBe("a");
    expect(defaultFrontendRowId({ id: 7 })).toBe("7");
    expect(defaultFrontendRowId("x")).toBe("x");
    expect(defaultFrontendRowId(3)).toBe("3");
    expect(defaultFrontendRowId({ name: "no-id" })).toBe("");
  });
});

describe("useFrontendData — incremental patches", () => {
  const byId = (row: Row) => row.id;
  // Typed readonly so a patched (readonly) result can be rerendered in.
  const INITIAL_ROWS: { data: readonly Row[] } = { data: ROWS };

  it("does not re-run filterFn on untouched rows when the patch log is kept", () => {
    const filterFn = vi.fn((row: Row) => row.count > 0);
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ data }: { data: readonly Row[] }) =>
        useFrontendData<Row>({
          data,
          filterFn,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { initialProps: INITIAL_ROWS }
    );
    const filtered = () => result.current.allFilteredRows ?? [];
    expect(filtered().map((row) => row.id)).toEqual(["a", "b", "c"]);
    filterFn.mockClear();

    const patched = applyRowPatches(ROWS, [updateRow("a", { count: 9 })], byId);
    expect(rowPatchLog(patched)).toBeDefined();
    rerender({ data: patched });

    expect(filterFn).toHaveBeenCalledTimes(1);
    expect(filterFn.mock.calls[0]?.[0]?.id).toBe("a");
    expect(filtered().find((row) => row.id === "a")?.count).toBe(9);
    expect(filtered().find((row) => row.id === "b")).toBe(ROWS[1]);
  });

  it("falls back to a full rebuild when the host spreads the patched array", () => {
    const filterFn = vi.fn((row: Row) => row.count > 0);
    const adapter = createMemoryAdapter("");
    const { rerender } = renderHook(
      ({ data }: { data: readonly Row[] }) =>
        useFrontendData<Row>({
          data,
          filterFn,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { initialProps: INITIAL_ROWS }
    );
    filterFn.mockClear();

    const spread = [
      ...applyRowPatches(ROWS, [updateRow("a", { count: 9 })], byId),
    ];
    expect(rowPatchLog(spread)).toBeUndefined();
    rerender({ data: spread });

    expect(filterFn).toHaveBeenCalledTimes(ROWS.length);
  });

  it("does not loop when extra, columns and filterFn are new identities each render", () => {
    const adapter = createMemoryAdapter("");
    let renders = 0;
    const { result, rerender } = renderHook(() => {
      renders += 1;
      const [, setTick] = useState(0);
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: [
          {
            key: "count",
            header: "Count",
            sortable: true,
            sortValue: (row) => row.count,
          },
        ],
        filterFn: (row, extra) => extra.only == null || row.name === extra.only,
        filterTreeFn: () => true,
        urlAdapter: adapter,
        paginationMode: "paged",
      });
      useEffect(() => {
        setTick((n) => n + 1);
      }, [source.rows]);
      return source;
    });
    const first = result.current.rows;
    rerender();
    rerender();
    expect(result.current.rows).toBe(first);
    expect(renders).toBeLessThan(10);
  });
});

/**
 * The hook returns rows AND exposes the engine that produced them. Anything
 * a consumer can read twice must read the same both ways.
 */
describe("useFrontendData — the source and its engine agree", () => {
  it("reports the same page, limit and window through both APIs", () => {
    const adapter = createMemoryAdapter("page=2&limit=1");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    const source = result.current;
    const snapshot = source.tableEngine!.snapshot();
    expect(source.page).toBe(snapshot.page);
    expect(source.limit).toBe(snapshot.limit);
    expect(source.total).toBe(snapshot.total);
    expect(source.rows).toEqual(source.tableEngine!.rows("page"));
    expect(source.rows.map((row) => row.id)).toEqual(["b"]);
  });

  it("follows a page change through both APIs", () => {
    const adapter = createMemoryAdapter("page=1&limit=1");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.rows.map((row) => row.id)).toEqual(["a"]);

    act(() => {
      result.current.setPage(3);
    });
    expect(result.current.page).toBe(3);
    expect(result.current.tableEngine!.snapshot().page).toBe(3);
    expect(result.current.rows.map((row) => row.id)).toEqual(["c"]);
    expect(
      result.current.tableEngine!.rows("page").map((row) => row.id)
    ).toEqual(["c"]);
  });

  it("follows a limit change without losing the page window", () => {
    const adapter = createMemoryAdapter("page=2&limit=1");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(result.current.rows.map((row) => row.id)).toEqual(["b"]);
    act(() => {
      result.current.setLimit(3);
    });
    const snapshot = result.current.tableEngine!.snapshot();
    expect(result.current.limit).toBe(snapshot.limit);
    expect(result.current.page).toBe(snapshot.page);
    expect(result.current.rows).toEqual(
      result.current.tableEngine!.rows("page")
    );
  });

  it("clamps both APIs to the same page when the data shrinks", () => {
    const adapter = createMemoryAdapter("page=3&limit=1");
    const { result, rerender } = renderHook(
      (props: { data: Row[] }) =>
        useFrontendData<Row>({
          data: props.data,
          columns: cols,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { initialProps: { data: ROWS } }
    );
    expect(result.current.page).toBe(3);
    expect(result.current.rows.map((row) => row.id)).toEqual(["c"]);

    rerender({ data: [ROWS[0]!] });
    const source = result.current;
    const snapshot = source.tableEngine!.snapshot();
    expect(source.total).toBe(1);
    expect(source.page).toBe(1);
    expect(snapshot.page).toBe(1);
    expect(snapshot.requestedPage).toBe(3);
    expect(source.rows.map((row) => row.id)).toEqual(["a"]);
    expect(source.rows).toEqual(source.tableEngine!.rows("page"));

    // Restoring the rows restores the requested page in both APIs.
    rerender({ data: ROWS });
    expect(result.current.page).toBe(3);
    expect(result.current.rows.map((row) => row.id)).toEqual(["c"]);
  });

  it("keeps one engine when the pagination strategy changes", () => {
    const adapter = createMemoryAdapter("page=2&limit=1");
    const { result, rerender } = renderHook(
      (props: { mobile: boolean }) =>
        useFrontendData<Row>({
          data: ROWS,
          columns: cols,
          urlAdapter: adapter,
          paginationMode: "auto",
          forceMobile: props.mobile,
        }),
      { initialProps: { mobile: false } }
    );
    const engine = result.current.tableEngine;
    expect(result.current.paginationMode).toBe("paged");
    expect(result.current.rows.map((row) => row.id)).toEqual(["b"]);

    rerender({ mobile: true });
    // Same committed engine — a strategy change reconfigures, never replaces.
    expect(result.current.tableEngine).toBe(engine);
    expect(result.current.paginationMode).toBe("infinite");
    // Infinite grows the window instead of slicing one page.
    expect(result.current.rows.map((row) => row.id)).toEqual(["a", "b"]);
    expect(result.current.rows).toEqual(
      result.current.tableEngine!.rows("page")
    );
  });

  it("serves two consumers of the same committed engine identically", () => {
    const adapter = createMemoryAdapter("page=1&limit=2");
    const { result } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    const engine = result.current.tableEngine!;
    // A second consumer — an agent session, a devtool — reads the engine
    // directly while the table reads the hook's return value.
    expect(engine.rows("page")).toEqual(result.current.rows);
    expect(engine.rows("full")).toEqual(result.current.allFilteredRows);
    expect(engine.snapshot().total).toBe(result.current.total);

    act(() => {
      result.current.setSearch("bob");
    });
    expect(engine.snapshot().search).toBe("bob");
    expect(engine.rows("page")).toEqual(result.current.rows);
    expect(result.current.rows.map((row) => row.id)).toEqual(["b"]);
  });
});

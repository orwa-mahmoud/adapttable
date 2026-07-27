import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { resetDevWarnings } from "../utils/devWarn";
import {
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

  it("applies filterFn against the extra bag, after search", () => {
    const { result } = render("f_only=Bob", {
      filterFn: (row, extra) => extra.only == null || row.name === extra.only,
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["b"]);
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

import { afterEach, describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { applyRowPatches, insertRow, updateRow } from "../rows/patch";
import { resetDevWarnings } from "../utils/devWarn";
import {
  createFrontendSource,
  defaultFrontendRowId,
  defaultSearchText,
  type FrontendSourceConfig,
  type FrontendSourceViewState,
  resolvePaginationMode,
} from "./frontendSource";

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

const COLUMNS: ColumnMetadata<Row>[] = [
  { key: "name", accessor: (row) => row.name },
  { key: "count", sortValue: (row) => row.count },
];

const VIEW: FrontendSourceViewState = {
  page: 1,
  limit: 25,
  search: "",
  sortBy: undefined,
  sortDir: undefined,
  sortLevels: [],
  groupBy: undefined,
  extra: {},
  filterTree: undefined,
};

function config(
  overrides: Partial<FrontendSourceConfig<Row>> = {}
): FrontendSourceConfig<Row> {
  return {
    data: ROWS,
    columns: COLUMNS,
    paginationMode: "paged",
    ...overrides,
  };
}

const ids = (rows: readonly Row[]) => rows.map((row) => row.id);

afterEach(() => {
  vi.restoreAllMocks();
  resetDevWarnings();
});

describe("resolvePaginationMode", () => {
  it("returns a non-auto mode unchanged", () => {
    expect(resolvePaginationMode("paged", true)).toBe("paged");
    expect(resolvePaginationMode("infinite", false)).toBe("infinite");
  });

  it("resolves auto to infinite on mobile and paged on desktop", () => {
    expect(resolvePaginationMode("auto", true)).toBe("infinite");
    expect(resolvePaginationMode("auto", false)).toBe("paged");
  });
});

describe("frontend row defaults", () => {
  it("reads a string or number id, or the row itself", () => {
    expect(defaultFrontendRowId({ id: "x" })).toBe("x");
    expect(defaultFrontendRowId({ id: 4 })).toBe("4");
    expect(defaultFrontendRowId("row")).toBe("row");
    expect(defaultFrontendRowId(9)).toBe("9");
    expect(defaultFrontendRowId({ id: {} })).toBe("");
    expect(defaultFrontendRowId(null)).toBe("");
  });

  it("flattens a row's own values into search text", () => {
    expect(defaultSearchText({ name: "Alice", count: 3 })).toContain("Alice");
  });
});

describe("createFrontendSource", () => {
  it("has no engine before its first update", () => {
    expect(() => createFrontendSource<Row>().engine).toThrow(/update\(\)/);
  });

  it("commits nothing before its first update", () => {
    expect(() => {
      createFrontendSource<Row>().commit();
    }).not.toThrow();
  });

  it("shows every row with no search, sort or filter", () => {
    const frame = createFrontendSource<Row>().update(config(), VIEW);
    expect(ids(frame.rows)).toEqual(["a", "b", "c"]);
    expect(frame.total).toBe(3);
    expect(frame.page).toBe(1);
    expect(frame.hasNextPage).toBe(false);
  });

  it("searches, sorts and pages from the view state", () => {
    const source = createFrontendSource<Row>();
    const searched = source.update(config(), { ...VIEW, search: "bob" });
    expect(ids(searched.rows)).toEqual(["b"]);
    source.commit();

    const sorted = source.update(config(), {
      ...VIEW,
      sortBy: "count",
      sortDir: "asc",
    });
    expect(ids(sorted.rows)).toEqual(["c", "a", "b"]);
    expect(ids(sorted.allFilteredRows)).toEqual(["c", "a", "b"]);
    source.commit();

    const paged = source.update(config(), { ...VIEW, page: 2, limit: 2 });
    expect(ids(paged.rows)).toEqual(["c"]);
    expect(paged.page).toBe(2);
  });

  it("reads each stage when several land before a commit", () => {
    const source = createFrontendSource<Row>();
    source.update(config(), VIEW);
    source.commit();
    source.update(config(), { ...VIEW, sortBy: "count", sortDir: "asc" });
    const paged = source.update(config(), { ...VIEW, page: 2, limit: 2 });
    expect(ids(paged.rows)).toEqual(["c"]);
    const patched = source.update(config({ data: ROWS.slice(0, 1) }), {
      ...VIEW,
      page: 2,
      limit: 2,
    });
    expect(ids(patched.rows)).toEqual(["a"]);
  });

  it("sorts by a multi-column chain", () => {
    const frame = createFrontendSource<Row>().update(config(), {
      ...VIEW,
      sortLevels: [{ key: "count", dir: "desc" }],
    });
    expect(ids(frame.rows)).toEqual(["b", "a", "c"]);
  });

  it("runs with no columns declared", () => {
    const frame = createFrontendSource<Row>().update(
      config({ columns: undefined }),
      { ...VIEW, search: "ali" }
    );
    expect(ids(frame.rows)).toEqual(["a"]);
  });

  it("clamps a page past the end to the last real one", () => {
    const frame = createFrontendSource<Row>().update(config(), {
      ...VIEW,
      page: 9,
      limit: 2,
    });
    expect(frame.page).toBe(2);
  });

  it("reports more rows beyond an infinite window", () => {
    const source = createFrontendSource<Row>();
    const first = source.update(config({ paginationMode: "infinite" }), {
      ...VIEW,
      limit: 2,
    });
    expect(first.hasNextPage).toBe(true);
    const grown = source.update(config({ paginationMode: "infinite" }), {
      ...VIEW,
      page: 2,
      limit: 2,
    });
    expect(ids(grown.rows)).toEqual(["a", "b", "c"]);
    expect(grown.hasNextPage).toBe(false);
  });

  it("never reports a next page when paged", () => {
    const frame = createFrontendSource<Row>().update(config(), {
      ...VIEW,
      limit: 1,
    });
    expect(frame.hasNextPage).toBe(false);
  });

  it("counts facets after search but before extra filters", () => {
    const frame = createFrontendSource<Row>().update(
      config({ filterFn: (row, extra) => row.name === extra.name }),
      { ...VIEW, search: "o", extra: { name: "Bob" } }
    );
    expect(ids(frame.rows)).toEqual(["b"]);
    expect(ids(frame.allSearchedRows)).toEqual(["b"]);
    const unsearched = createFrontendSource<Row>().update(
      config({ filterFn: (row, extra) => row.name === extra.name }),
      { ...VIEW, extra: { name: "Bob" } }
    );
    expect(unsearched.allSearchedRows).toBe(ROWS);
  });

  it("keeps the facet rows while data and search stay the same", () => {
    const source = createFrontendSource<Row>();
    const first = source.update(config(), { ...VIEW, search: "a" });
    const second = source.update(config(), { ...VIEW, search: "a" });
    expect(second.allSearchedRows).toBe(first.allSearchedRows);
  });

  it("applies the filter tree through filterTreeFn", () => {
    const frame = createFrontendSource<Row>().update(
      config({ filterTreeFn: (row) => row.count > 2 }),
      {
        ...VIEW,
        filterTree: { combinator: "and", conditions: [] },
      }
    );
    expect(ids(frame.rows)).toEqual(["a", "b"]);
  });

  it("keeps the page slice when only callback identities change", () => {
    const source = createFrontendSource<Row>();
    const first = source.update(
      config({ getSearchText: (row) => row.name, columns: [...COLUMNS] }),
      VIEW
    );
    const second = source.update(
      config({ getSearchText: (row) => row.name, columns: [...COLUMNS] }),
      VIEW
    );
    expect(second.rows).toBe(first.rows);
  });

  it("re-evaluates an explicit filter key on the same data and commits only the changed view", () => {
    const source = createFrontendSource<Row>();
    const first = source.update(
      config({ filterFn: (row) => row.count >= 3, filterKey: "high" }),
      VIEW
    );
    expect(ids(first.rows)).toEqual(["a", "b"]);
    source.commit();
    const before = source.engine.snapshot().revisions;
    const notified = vi.fn();
    source.engine.subscribe("all", notified);

    const next = source.update(
      config({ filterFn: (row) => row.count <= 3, filterKey: "low" }),
      VIEW
    );
    expect(ids(next.rows)).toEqual(["a", "c"]);
    expect(ids(source.engine.rows("page"))).toEqual(["a", "b"]);
    expect(source.engine.candidate.snapshot().revisions.data).toBe(before.data);
    expect(source.engine.candidate.snapshot().revisions.view).toBe(
      before.view + 1
    );
    expect(notified).not.toHaveBeenCalled();

    source.commit();
    expect(ids(source.engine.rows("page"))).toEqual(["a", "c"]);
    expect(source.engine.snapshot().revisions.data).toBe(before.data);
    expect(notified).toHaveBeenCalledTimes(1);

    const same = source.update(
      config({ filterFn: (row) => row.count <= 3, filterKey: "low" }),
      VIEW
    );
    expect(same.rows).toBe(next.rows);
    source.commit();
    expect(notified).toHaveBeenCalledTimes(1);
  });

  it("re-evaluates a changed filter tree predicate without changing its tree or data", () => {
    const source = createFrontendSource<Row>();
    const view: FrontendSourceViewState = {
      ...VIEW,
      filterTree: { combinator: "and", conditions: [] },
    };
    const first = source.update(
      config({ filterTreeFn: (row) => row.id === "a", filterKey: "first" }),
      view
    );
    expect(ids(first.rows)).toEqual(["a"]);
    source.commit();
    const next = source.update(
      config({ filterTreeFn: (row) => row.id === "b", filterKey: "second" }),
      view
    );
    expect(ids(next.rows)).toEqual(["b"]);
    expect(ids(source.engine.rows("page"))).toEqual(["a"]);
    source.commit();
    expect(ids(source.engine.rows("page"))).toEqual(["b"]);
  });

  it("distinguishes numeric and string filter keys and re-evaluates when a key is cleared", () => {
    const source = createFrontendSource<Row>();
    const first = source.update(
      config({ filterFn: (row) => row.id === "a", filterKey: 1 }),
      VIEW
    );
    expect(ids(first.rows)).toEqual(["a"]);
    source.commit();
    const second = source.update(
      config({ filterFn: (row) => row.id === "b", filterKey: "1" }),
      VIEW
    );
    expect(ids(second.rows)).toEqual(["b"]);
    source.commit();
    const cleared = source.update(
      config({ filterFn: (row) => row.id === "c" }),
      VIEW
    );
    expect(ids(cleared.rows)).toEqual(["c"]);
  });

  it("reads the newest callbacks without restaging", () => {
    const source = createFrontendSource<Row>();
    source.update(config({ getSearchText: () => "" }), VIEW);
    const frame = source.update(config({ getSearchText: (row) => row.name }), {
      ...VIEW,
      search: "char",
    });
    expect(ids(frame.rows)).toEqual(["c"]);
  });

  it("caches search text per row until the data changes", () => {
    const getSearchText = vi.fn((row: Row) => row.name);
    const source = createFrontendSource<Row>();
    source.update(config({ getSearchText }), { ...VIEW, search: "a" });
    const calls = getSearchText.mock.calls.length;
    source.update(config({ getSearchText }), { ...VIEW, search: "b" });
    expect(getSearchText.mock.calls).toHaveLength(calls);

    source.update(config({ getSearchText, data: [...ROWS] }), {
      ...VIEW,
      search: "b",
    });
    expect(getSearchText.mock.calls.length).toBeGreaterThan(calls);
  });

  it("forgets only the patched rows' search text on a row patch", () => {
    const getSearchText = vi.fn((row: Row) => row.name);
    const source = createFrontendSource<Row>();
    source.update(config({ getSearchText }), { ...VIEW, search: "a" });
    getSearchText.mockClear();

    const patched = applyRowPatches<Row>(
      ROWS,
      [updateRow("b", { name: "Bea" })],
      (row) => row.id
    );
    const frame = source.update(config({ getSearchText, data: patched }), {
      ...VIEW,
      search: "bea",
    });
    expect(ids(frame.rows)).toEqual(["b"]);
    expect(getSearchText.mock.calls.map(([row]) => row.id)).toEqual(["b"]);
  });

  it("keeps cached search text when a row patch only inserts", () => {
    const getSearchText = vi.fn((row: Row) => row.name);
    const source = createFrontendSource<Row>();
    source.update(config({ getSearchText }), { ...VIEW, search: "a" });
    getSearchText.mockClear();

    const patched = applyRowPatches<Row>(
      ROWS,
      [insertRow({ id: "d", name: "Dana", count: 2 })],
      (row) => row.id
    );
    const frame = source.update(config({ getSearchText, data: patched }), {
      ...VIEW,
      search: "a",
    });
    expect(ids(frame.rows)).toEqual(["a", "c", "d"]);
    expect(getSearchText.mock.calls.map(([row]) => row.id)).toEqual(["d"]);
  });

  it("refreshes every changed search value after two patches coalesce into one update", () => {
    const getSearchText = vi.fn((row: Row) => row.name);
    const source = createFrontendSource<Row>();
    source.update(config({ getSearchText }), { ...VIEW, search: "a" });
    source.commit();
    getSearchText.mockClear();

    const first = applyRowPatches<Row>(
      ROWS,
      [updateRow("a", { name: "Fresh Zoe" })],
      (row) => row.id
    );
    const second = applyRowPatches<Row>(
      first,
      [updateRow("b", { name: "Fresh Bea" })],
      (row) => row.id
    );
    const nextConfig = config({ getSearchText, data: second });
    const frame = source.update(nextConfig, { ...VIEW, search: "fresh" });
    expect(ids(frame.rows)).toEqual(["a", "b"]);
    expect(frame.rows).toEqual([second[0], second[1]]);
    expect(frame.allSearchedRows).toEqual([second[0], second[1]]);
    expect(getSearchText.mock.calls.map(([row]) => row.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
    source.commit();

    const zoe = source.update(nextConfig, { ...VIEW, search: "fresh zoe" });
    expect(zoe.rows).toEqual([second[0]]);
    const bea = source.update(nextConfig, { ...VIEW, search: "fresh bea" });
    expect(bea.rows).toEqual([second[1]]);
    const old = source.update(nextConfig, { ...VIEW, search: "alice" });
    expect(old.rows).toEqual([]);
    expect(ROWS[0]?.name).toBe("Alice");
    expect(ROWS[1]?.name).toBe("Bob");
  });

  it("keeps immediate patch optimization after a no-op on the patched array", () => {
    const filterFn = vi.fn((row: Row) => row.count > 0);
    const source = createFrontendSource<Row>();
    source.update(config({ filterFn }), VIEW);
    source.commit();
    filterFn.mockClear();
    const changed = applyRowPatches<Row>(
      ROWS,
      [updateRow("a", { count: 9 })],
      (row) => row.id
    );
    const noOp = applyRowPatches<Row>(
      changed,
      [updateRow("a", { count: 9 })],
      (row) => row.id
    );
    const frame = source.update(config({ filterFn, data: noOp }), VIEW);
    expect(frame.rows).toEqual(changed);
    expect(frame.rows[1]).toBe(ROWS[1]);
    expect(filterFn.mock.calls.map(([row]) => row.id)).toEqual(["a"]);
  });

  it("publishes the staged view only on commit", () => {
    const source = createFrontendSource<Row>();
    source.update(config(), VIEW);
    source.commit();
    const listener = vi.fn();
    source.engine.subscribe("all", listener);

    source.update(config(), { ...VIEW, search: "bob" });
    expect(source.engine.snapshot().total).toBe(3);
    expect(listener).not.toHaveBeenCalled();

    source.commit();
    expect(source.engine.snapshot().total).toBe(1);
    expect(listener).toHaveBeenCalled();
  });

  it("warns when the sort column is not declared", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createFrontendSource<Row>().update(config({ columns: [] }), {
      ...VIEW,
      sortBy: "missing",
      sortDir: "asc",
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('sortBy "missing" matches no column')
    );
  });

  it("warns when the sort column has no sortable value", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createFrontendSource<Row>().update(
      config({ columns: [{ key: "name", accessor: () => ({}) }] }),
      { ...VIEW, sortBy: "name", sortDir: "asc" }
    );
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('column "name" has no sortable value')
    );
  });

  it("does not warn when getSortValue resolves the sort", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createFrontendSource<Row>().update(
      config({ columns: [], getSortValue: (row) => row.name }),
      { ...VIEW, sortBy: "missing", sortDir: "asc" }
    );
    expect(warn).not.toHaveBeenCalled();
  });

  it("does not warn when the sort column resolves a primitive", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    createFrontendSource<Row>().update(config(), {
      ...VIEW,
      sortBy: "name",
      sortDir: "asc",
    });
    expect(warn).not.toHaveBeenCalled();
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useFrontendData } from "./useFrontendData";
import { useLocalFrontendData } from "./useLocalFrontendData";

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
const columns = [
  { key: "name", header: "Name", sortable: true, accessor: (r: Row) => r.name },
  {
    key: "count",
    header: "Count",
    sortable: true,
    sortValue: (r: Row) => r.count,
  },
];

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, "", "/");
});

describe("useLocalFrontendData", () => {
  it("returns the same rows as useFrontendData for the same data", () => {
    const local = renderHook(() =>
      useLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
      })
    );
    const url = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
        urlSync: false,
      })
    );
    expect(local.result.current.rows).toEqual(url.result.current.rows);
    expect(local.result.current.total).toBe(3);
  });

  it("searches, sorts and pages in memory and never writes the URL", () => {
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const { result } = renderHook(() =>
      useLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
      })
    );
    act(() => result.current.setSort("count", "desc"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
    act(() => result.current.setSearch("ali"));
    expect(result.current.rows.map((r) => r.id)).toEqual(["a"]);
    act(() => result.current.setSearch(""));
    act(() => result.current.setLimit(1));
    act(() => result.current.setPage(2));
    expect(result.current.rows.map((r) => r.id)).toEqual(["a"]);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
  });

  it("follows new data", () => {
    const { result, rerender } = renderHook(
      ({ data }: { data: readonly Row[] }) =>
        useLocalFrontendData<Row>({ data, columns, paginationMode: "paged" }),
      { initialProps: { data: ROWS } }
    );
    rerender({ data: [...ROWS, { id: "d", name: "Dee", count: 9 }] });
    expect(result.current.total).toBe(4);
  });
});

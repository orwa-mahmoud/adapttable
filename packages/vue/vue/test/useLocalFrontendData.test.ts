import { afterEach, describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, shallowRef } from "vue";

import { useFrontendData } from "../src/source/useFrontendData";
import { useLocalFrontendData } from "../src/source/useLocalFrontendData";

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
    const scope = effectScope();
    const [local, url] = scope.run(() => [
      useLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
      }),
      useFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
        urlSync: false,
      }),
    ])!;
    expect(local.value.rows).toEqual(url.value.rows);
    expect(local.value.total).toBe(3);
    scope.stop();
  });

  it("searches, sorts and pages in memory and never writes the URL", async () => {
    const push = vi.spyOn(window.history, "pushState");
    const replace = vi.spyOn(window.history, "replaceState");
    const scope = effectScope();
    const table = scope.run(() =>
      useLocalFrontendData<Row>({
        data: ROWS,
        columns,
        paginationMode: "paged",
      })
    )!;
    table.value.setSort("count", "desc");
    await nextTick();
    expect(table.value.rows.map((r) => r.id)).toEqual(["b", "a", "c"]);
    table.value.setSearch("ali");
    await nextTick();
    expect(table.value.rows.map((r) => r.id)).toEqual(["a"]);
    expect(push).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
    expect(window.location.search).toBe("");
    scope.stop();
  });

  it("follows new data", async () => {
    const data = shallowRef<readonly Row[]>(ROWS);
    const scope = effectScope();
    const table = scope.run(() =>
      useLocalFrontendData<Row>(() => ({
        data: data.value,
        columns,
        paginationMode: "paged",
      }))
    )!;
    data.value = [...ROWS, { id: "d", name: "Dee", count: 9 }];
    await nextTick();
    expect(table.value.total).toBe(4);
    scope.stop();
  });
});

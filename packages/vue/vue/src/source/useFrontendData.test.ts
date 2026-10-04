import { describe, expect, it, vi } from "vitest";
import {
  createApp,
  defineComponent,
  effectScope,
  h,
  isProxy,
  nextTick,
  shallowRef,
} from "vue";

import {
  useFrontendData,
  type UseFrontendDataOptions,
} from "./useFrontendData";

interface Row {
  id: string;
  name: string;
  score: number;
}
const rows: readonly Row[] = [
  { id: "a", name: "Ada", score: 3 },
  { id: "b", name: "Ben", score: 1 },
  { id: "c", name: "Cat", score: 2 },
];

describe("useFrontendData", () => {
  it("delegates filtering, sorting and pagination without proxying host rows", async () => {
    const scope = effectScope();
    const data = shallowRef(rows);
    const source = scope.run(() =>
      useFrontendData({
        data,
        urlSync: false,
        defaults: { limit: 2 },
        columns: [{ key: "score" }],
      })
    );
    if (!source) throw new Error("missing source");
    expect(source.value.rows).toEqual(rows.slice(0, 2));
    expect(source.value.rows[0]).toBe(rows[0]);
    expect(isProxy(source.value.rows[0])).toBe(false);
    const engine = source.value.tableEngine;
    const setSearch = source.value.setSearch;
    source.value.setSort("score", "asc");
    expect(source.value.rows.map((row) => row.score)).toEqual([1, 2]);
    source.value.setPage(2);
    expect(source.value.rows.map((row) => row.score)).toEqual([3]);
    setSearch("Ada");
    expect(source.value.total).toBe(1);
    expect(source.value.tableEngine).toBe(engine);
    expect(source.value.setSearch).toBe(setSearch);
    data.value = [{ id: "d", name: "Ada updated", score: 4 }];
    expect(source.value.rows).toEqual(data.value);
    await nextTick();
    scope.stop();
  });

  it("replaces columns, locale and semantic filter keys", () => {
    const scope = effectScope();
    let allowed = 2;
    const key = shallowRef(1);
    const columns = shallowRef([
      { key: "score", sortValue: (row: Row) => row.score },
    ]);
    const locale = shallowRef("en");
    const source = scope.run(() =>
      useFrontendData({
        data: rows,
        columns,
        locale,
        filterKey: key,
        urlSync: false,
        filterFn: (row) => row.score <= allowed,
        defaults: { sortBy: "score", sortDir: "asc" },
      })
    );
    expect(source?.value.rows.map((row) => row.score)).toEqual([1, 2]);
    allowed = 3;
    key.value = 2;
    expect(source?.value.total).toBe(3);
    columns.value = [{ key: "score", sortValue: (row: Row) => -row.score }];
    // Core intentionally ignores callback identity until an explicit semantic input changes.
    expect(source?.value.rows.map((row) => row.score)).toEqual([1, 2, 3]);
    key.value = 3;
    expect(source?.value.rows.map((row) => row.score)).toEqual([3, 2, 1]);
    locale.value = "ar";
    expect(source?.value.total).toBe(3);
    scope.stop();
  });

  it("never calls a callback as a getter and stable actions use current callback", () => {
    const scope = effectScope();
    const first = vi.fn();
    const second = vi.fn();
    const options = shallowRef<UseFrontendDataOptions<Row>>({
      data: [],
      refetch: first,
      urlSync: false,
    });
    const source = scope.run(() => useFrontendData(options));
    expect(first).not.toHaveBeenCalled();
    const refetch = source?.value.refetch;
    options.value = { data: rows, refetch: second, urlSync: false };
    expect(first).not.toHaveBeenCalled();
    expect(second).not.toHaveBeenCalled();
    expect(source?.value.refetch).toBe(refetch);
    refetch?.();
    expect(second).toHaveBeenCalledTimes(1);
    scope.stop();
    refetch?.();
    source?.value.fetchNextPage();
    expect(second).toHaveBeenCalledTimes(1);
  });

  it("appends the next frontend window through stable actions", () => {
    const scope = effectScope();
    const source = scope.run(() =>
      useFrontendData({
        data: rows,
        urlSync: false,
        forceMobile: true,
        defaults: { limit: 2 },
      })
    );
    expect(source?.value.paginationMode).toBe("infinite");
    expect(source?.value.hasNextPage).toBe(true);
    source?.value.fetchNextPage();
    expect(source?.value.rows).toHaveLength(3);
    source?.value.fetchNextPage();
    expect(source?.value.page).toBe(2);
    scope.stop();
  });

  it("tracks ordinary queued parent props and releases mounted effects", async () => {
    const data = shallowRef(rows);
    const Child = defineComponent({
      props: { rows: { type: Array<Row>, required: true } },
      setup(props) {
        const source = useFrontendData(() => ({
          data: props.rows,
          urlSync: false,
        }));
        return () => h("p", source.value.rows.map((row) => row.name).join(","));
      },
    });
    const app = createApp({
      setup: () => () => h(Child, { rows: [...data.value] }),
    });
    const root = document.createElement("div");
    app.mount(root);
    expect(root.textContent).toBe("Ada,Ben,Cat");
    data.value = [{ id: "z", name: "Zoe", score: 8 }];
    await nextTick();
    expect(root.textContent).toBe("Zoe");
    app.unmount();
  });
});

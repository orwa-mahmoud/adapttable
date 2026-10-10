import {
  type ColumnMetadata,
  type PaginatedResponse,
  type QueryExtensions,
  type TableQueryParams,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";
import { effectScope, nextTick, type ShallowRef, shallowRef } from "vue";

import {
  type InfiniteQueryState,
  useQuerySource,
  type UseQuerySourceOptions,
} from "./useQuerySource";

interface Row {
  id: string;
  score: number;
}
type Page = PaginatedResponse<Row>;
function queryState(): InfiniteQueryState<Page> {
  return {
    data: shallowRef({
      pages: [{ rows: [{ id: "a", score: 1 }], total: 3, page: 1, limit: 1 }],
      pageParams: [],
    }),
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: true,
    error: null,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
}

describe("useQuerySource", () => {
  it("invokes the factory once and tracks live params without treating methods as getters", async () => {
    const scope = effectScope();
    let params: Readonly<ShallowRef<Partial<TableQueryParams>>> | undefined;
    const query = queryState();
    const factory = vi.fn(
      (value: Readonly<ShallowRef<Partial<TableQueryParams>>>) => {
        params = value;
        return query;
      }
    );
    const source = scope.run(() =>
      useQuerySource<Row>({ query: factory, urlSync: false })
    );
    expect(factory).toHaveBeenCalledTimes(1);
    expect(query.refetch).not.toHaveBeenCalled();
    expect(query.fetchNextPage).not.toHaveBeenCalled();
    expect(params?.value.search).toBeUndefined();
    source?.value.setSearch("updated");
    expect(params?.value.search).toBe("updated");
    await nextTick();
    expect(factory).toHaveBeenCalledTimes(1);
    source?.value.refetch?.();
    expect(query.refetch).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("does not invoke retained query methods after scope disposal", () => {
    const scope = effectScope();
    const query = queryState();
    const source = scope.run(() =>
      useQuerySource<Row>({
        query: () => query,
        urlSync: false,
        paginationMode: "infinite",
      })
    );
    const refetch = source?.value.refetch;
    const fetchNextPage = source?.value.fetchNextPage;
    scope.stop();
    refetch?.();
    fetchNextPage?.();
    expect(query.refetch).not.toHaveBeenCalled();
    expect(query.fetchNextPage).not.toHaveBeenCalled();
  });

  it("reads query values as refs or getters and keeps row identity", async () => {
    const scope = effectScope();
    const row = { id: "a", score: 1 };
    const data = shallowRef({
      pages: [{ rows: [row], total: 3, page: 1, limit: 1 }],
      pageParams: [],
    });
    const loading = shallowRef(false);
    const query = { ...queryState(), data, isFetching: () => loading.value };
    const source = scope.run(() =>
      useQuerySource<Row>({
        query: () => query,
        urlSync: false,
        paginationMode: "infinite",
      })
    );
    expect(source?.value.rows[0]).toBe(row);
    loading.value = true;
    expect(source?.value.isFetching).toBe(true);
    loading.value = false;
    data.value = {
      pages: [
        ...data.value.pages,
        { rows: [{ id: "b", score: 2 }], total: 3, page: 1, limit: 1 },
      ],
      pageParams: [],
    };
    await nextTick();
    expect(source?.value.rows.map((row) => row.id)).toEqual(["a", "b"]);
    source?.value.fetchNextPage();
    expect(query.fetchNextPage).toHaveBeenCalledTimes(1);
    scope.stop();
  });

  it("reprojects selectorKey while leaving callback-only identity changes inert", () => {
    const scope = effectScope();
    const query = queryState();
    const options = shallowRef<UseQuerySourceOptions<Row>>({
      query: () => query,
      urlSync: false,
      selectorKey: 1,
      selectPage: (page) => ({ rows: page.rows ?? [] }),
    });
    const source = scope.run(() => useQuerySource(options));
    expect(source?.value.rows[0]?.score).toBe(1);
    options.value = {
      ...options.value,
      selectPage: (page) => ({
        rows: (page.rows ?? []).map((row) => ({ ...row, score: 10 })),
      }),
    };
    expect(source?.value.rows[0]?.score).toBe(1);
    options.value = { ...options.value, selectorKey: 2 };
    expect(source?.value.rows[0]?.score).toBe(10);
    scope.stop();
  });

  it("gates aggregates against source support and current columns", () => {
    const scope = effectScope();
    let params:
      | Readonly<ShallowRef<Partial<TableQueryParams & QueryExtensions>>>
      | undefined;
    const supports = shallowRef({ grouping: true, aggregates: true });
    const columns = shallowRef<readonly ColumnMetadata<Row>[]>([
      { key: "score", aggregatable: false },
    ]);
    const source = scope.run(() =>
      useQuerySource<Row, TableQueryParams & QueryExtensions>({
        query: (value) => {
          params = value;
          return queryState();
        },
        urlSync: false,
        supports,
        columns,
      })
    );
    source?.value.setGroupAggregateOverrides?.({ score: "sum" });
    expect(params?.value.aggregates).toBeUndefined();
    columns.value = [{ key: "score", aggregatable: { operations: ["sum"] } }];
    expect(params?.value.aggregates).toEqual([{ key: "score", fn: "sum" }]);
    supports.value = { grouping: true, aggregates: false };
    expect(params?.value.aggregates).toBeUndefined();
    scope.stop();
  });

  it("keeps table state authoritative over base params and uses the current sanitizer", () => {
    const scope = effectScope();
    let params: Readonly<ShallowRef<Partial<TableQueryParams>>> | undefined;
    const options = shallowRef<UseQuerySourceOptions<Row>>({
      query: (value) => {
        params = value;
        return queryState();
      },
      urlSync: false,
      defaults: { search: "table" },
      baseParams: { search: "base", page: 99 },
    });
    const source = scope.run(() => useQuerySource(options));
    expect(params?.value.search).toBe("table");
    expect(params?.value.page).toBe(1);
    options.value = {
      ...options.value,
      sanitizeParams: (value) => ({
        ...value,
        search: value.search?.toUpperCase(),
      }),
    };
    source?.value.setSearch("new");
    expect(params?.value.search).toBe("NEW");
    scope.stop();
  });
});

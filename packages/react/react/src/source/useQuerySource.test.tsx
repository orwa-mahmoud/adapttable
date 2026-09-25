import type { PaginatedResponse, TableQueryParams } from "@adapttable/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import { type InfiniteQueryLike, useQuerySource } from "./useQuerySource";

interface Row {
  id: string;
  name: string;
}
interface Page {
  items: Row[];
  pagination: { total: number };
  facets?: { team: { value: string; label: string; count: number }[] };
}
interface ListParams extends TableQueryParams {
  status?: string[];
  scopeId?: string;
  facets?: readonly string[];
}

const page = (items: Row[], total: number): Page => ({
  items,
  pagination: { total },
});
const selectPage = (p: Page) => ({ rows: p.items, total: p.pagination.total });

function stableQuery(
  data: InfiniteQueryLike<Page>["data"]
): () => InfiniteQueryLike<Page> {
  return () => ({
    data,
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
    error: null,
  });
}

function selectWithSuffix(suffix: string) {
  return (p: Page) => ({
    rows: p.items.map((row) => ({ ...row, name: `${row.name}${suffix}` })),
    total: p.pagination.total,
  });
}

function makeQuery(opts?: {
  pages?: Page[];
  isLoading?: boolean;
  isFetching?: boolean;
  hasNextPage?: boolean;
  error?: Error | null;
}) {
  const calls: Partial<ListParams>[] = [];
  const fetchNextPage = vi.fn();
  const refetch = vi.fn().mockResolvedValue(undefined);
  const usePaginatedQuery = (
    params: Partial<ListParams>
  ): InfiniteQueryLike<Page> => {
    calls.push(params);
    return {
      data: opts?.pages
        ? { pages: opts.pages, pageParams: opts.pages.map((_, i) => i) }
        : undefined,
      isLoading: opts?.isLoading ?? false,
      isFetching: opts?.isFetching ?? false,
      isFetchingNextPage: false,
      hasNextPage: opts?.hasNextPage ?? false,
      fetchNextPage,
      refetch,
      error: opts?.error ?? null,
    };
  };
  return { usePaginatedQuery, calls, fetchNextPage, refetch };
}

const last = <T,>(arr: T[]): T => {
  const v = arr[arr.length - 1];
  if (v === undefined) throw new Error("empty");
  return v;
};

/**
 * Mount `useQuerySource` with a STABLE memory adapter created once
 * outside the render callback. (Creating the adapter inside the render
 * function would rebuild it every render and reset URL state.)
 */
function mount<TPage = Page>(
  query: {
    usePaginatedQuery: (p: Partial<ListParams>) => InfiniteQueryLike<TPage>;
  },
  opts: Omit<
    Parameters<typeof useQuerySource<Row, ListParams, TPage>>[0],
    "usePaginatedQuery"
  > & { initial?: string }
) {
  const { initial = "", ...rest } = opts;
  const adapter = createMemoryAdapter(initial);
  return renderHook(() =>
    useQuerySource<Row, ListParams, TPage>({
      usePaginatedQuery: query.usePaginatedQuery,
      urlAdapter: adapter,
      ...rest,
    })
  );
}

describe("useQuerySource", () => {
  it("the default selector reads the rows envelope field", () => {
    const query = makeQuery({
      pages: [
        {
          rows: [{ id: "a", name: "A" }],
          total: 1,
          page: 1,
          limit: 25,
          hasNextPage: false,
        } as unknown as Page,
      ],
    });
    const view = mount(query, {});
    expect(view.result.current.rows).toHaveLength(1);
  });

  it("does not re-project when an unmemoized selectPage identity changes", () => {
    const usePaginatedQuery = stableQuery({
      pages: [page([{ id: "a", name: "A" }], 1)],
      pageParams: [0],
    });
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuerySource<Row, ListParams, Page>({
          usePaginatedQuery,
          urlAdapter: adapter,
          selectPage: selectWithSuffix(suffix),
        }),
      { initialProps: { suffix: "-v1" } }
    );
    expect(result.current.rows[0]?.name).toBe("A-v1");
    rerender({ suffix: "-v2" });
    expect(result.current.rows[0]?.name).toBe("A-v1");
  });

  it("does not re-project infinite pages when only selectPage identity changes", () => {
    const usePaginatedQuery = stableQuery({
      pages: [
        page([{ id: "a", name: "A" }], 2),
        page([{ id: "b", name: "B" }], 2),
      ],
      pageParams: [0, 1],
    });
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuerySource<Row, ListParams, Page>({
          usePaginatedQuery,
          urlAdapter: adapter,
          paginationMode: "infinite",
          selectPage: selectWithSuffix(suffix),
        }),
      { initialProps: { suffix: "-v1" } }
    );
    expect(result.current.rows.map((row) => row.name)).toEqual([
      "A-v1",
      "B-v1",
    ]);
    rerender({ suffix: "-v2" });
    expect(result.current.rows.map((row) => row.name)).toEqual([
      "A-v1",
      "B-v1",
    ]);
  });

  it("re-projects unchanged pages when selectorKey changes", () => {
    const usePaginatedQuery = stableQuery({
      pages: [page([{ id: "a", name: "A" }], 1)],
      pageParams: [0],
    });
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuerySource<Row, ListParams, Page>({
          usePaginatedQuery,
          urlAdapter: adapter,
          selectPage: selectWithSuffix(suffix),
          selectorKey: suffix,
        }),
      { initialProps: { suffix: "-v1" } }
    );
    expect(result.current.rows[0]?.name).toBe("A-v1");
    const first = result.current;
    rerender({ suffix: "-v2" });
    expect(result.current.rows[0]?.name).toBe("A-v2");
    expect(result.current).not.toBe(first);
  });

  it("re-projects infinite pages when selectorKey changes", () => {
    const usePaginatedQuery = stableQuery({
      pages: [
        page([{ id: "a", name: "A" }], 2),
        page([{ id: "b", name: "B" }], 2),
      ],
      pageParams: [0, 1],
    });
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuerySource<Row, ListParams, Page>({
          usePaginatedQuery,
          urlAdapter: adapter,
          paginationMode: "infinite",
          selectPage: selectWithSuffix(suffix),
          selectorKey: suffix,
        }),
      { initialProps: { suffix: "-v1" } }
    );
    expect(result.current.rows.map((row) => row.name)).toEqual([
      "A-v1",
      "B-v1",
    ]);
    rerender({ suffix: "-v2" });
    expect(result.current.rows.map((row) => row.name)).toEqual([
      "A-v2",
      "B-v2",
    ]);
  });

  it("keeps row and source identity when selectorKey is unchanged", () => {
    const q = makeQuery({ pages: [page([{ id: "a", name: "A" }], 1)] });
    const view = mount(q, { selectPage, selectorKey: "stable" });
    const first = view.result.current;
    const firstRows = first.rows;
    view.rerender();
    view.rerender();
    expect(view.result.current).toBe(first);
    expect(view.result.current.rows).toBe(firstRows);
  });

  it("uses the latest selectPage once query data changes", () => {
    const first = {
      pages: [page([{ id: "a", name: "A" }], 1)],
      pageParams: [0],
    };
    const second = {
      pages: [page([{ id: "b", name: "B" }], 1)],
      pageParams: [0],
    };
    let data = first;
    const usePaginatedQuery = () => stableQuery(data)();
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(
      ({ suffix }: { suffix: string }) =>
        useQuerySource<Row, ListParams, Page>({
          usePaginatedQuery,
          urlAdapter: adapter,
          selectPage: selectWithSuffix(suffix),
        }),
      { initialProps: { suffix: "-v1" } }
    );
    expect(result.current.rows[0]?.name).toBe("A-v1");
    data = second;
    rerender({ suffix: "-v2" });
    expect(result.current.rows[0]?.name).toBe("B-v2");
  });

  it("keeps the source identity stable across unrelated re-renders", () => {
    const q = makeQuery({ pages: [page([{ id: "a", name: "A" }], 1)] });
    const view = mount(q, { selectPage });
    const first = view.result.current;
    view.rerender();
    view.rerender();
    expect(view.result.current).toBe(first);
    // A real state change produces a NEW source object.
    act(() => view.result.current.setSearch("term"));
    expect(view.result.current).not.toBe(first);
  });

  it("flattens rows across infinite pages and keeps the latest total", () => {
    const q = makeQuery({
      pages: [
        page([{ id: "a", name: "A" }], 3),
        page(
          [
            { id: "b", name: "B" },
            { id: "c", name: "C" },
          ],
          3
        ),
      ],
    });
    const { result } = mount(q, { selectPage, paginationMode: "infinite" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(result.current.total).toBe(3);
  });

  it("falls back to the row count when an infinite source reports no total", () => {
    const q = makeQuery({
      pages: [
        page([{ id: "a", name: "A" }], 0),
        page([{ id: "b", name: "B" }], 0),
      ],
    });
    const { result } = mount(q, {
      selectPage: (p) => ({ rows: p.items }),
      paginationMode: "infinite",
    });
    expect(result.current.rows).toHaveLength(2);
    expect(result.current.total).toBe(2);
  });

  it("paged mode returns only the last fetched page", () => {
    const q = makeQuery({
      pages: [
        page([{ id: "a", name: "A" }], 4),
        page([{ id: "b", name: "B" }], 4),
      ],
    });
    const { result } = mount(q, { selectPage, paginationMode: "paged" });
    expect(result.current.rows.map((r) => r.id)).toEqual(["b"]);
    expect(result.current.total).toBe(4);
  });

  it("falls back to the row count when a paged response omits total", () => {
    const q = makeQuery({
      pages: [
        page(
          [
            { id: "a", name: "A" },
            { id: "b", name: "B" },
          ],
          0
        ),
      ],
    });
    const { result } = mount(q, {
      selectPage: (p) => ({ rows: p.items }),
      paginationMode: "paged",
    });
    expect(result.current.total).toBe(2);
  });

  it("overlays URL group aggregation choices on server requests", () => {
    const query = makeQuery({
      pages: [page([{ id: "a", name: "A" }], 1)],
    });
    const { result } = mount(query, {
      initial: "groupBy=team&groupAgg=name%3Anone%2Cscore%3Aavg",
      selectPage,
      supports: { grouping: true, aggregates: true },
      aggregates: [
        { key: "name", fn: "count" },
        { key: "budget", fn: "sum" },
      ],
    });

    const emitted = last(query.calls) as Partial<ListParams> & {
      aggregates?: readonly { key: string; fn: string }[];
    };
    expect(emitted.aggregates).toEqual([
      { key: "budget", fn: "sum" },
      { key: "score", fn: "avg" },
    ]);
    expect(result.current.groupAggregateOverrides).toEqual({
      name: "none",
      score: "avg",
    });
  });

  it("uses the default selector for a PaginatedResponse page shape", () => {
    const usePaginatedQuery = (): InfiniteQueryLike<
      PaginatedResponse<Row>
    > => ({
      data: {
        pages: [
          {
            rows: [{ id: "a", name: "A" }],
            total: 1,
            page: 1,
            limit: 25,
          },
        ],
        pageParams: [0],
      },
      isLoading: false,
      isFetching: false,
      isFetchingNextPage: false,
      hasNextPage: false,
      fetchNextPage: vi.fn(),
      refetch: vi.fn(),
      error: null,
    });
    const { result } = mount<PaginatedResponse<Row>>({ usePaginatedQuery }, {});
    expect(result.current.rows).toHaveLength(1);
    expect(result.current.total).toBe(1);
  });

  it("returns empty rows when there are no pages yet", () => {
    const q = makeQuery({ isLoading: true });
    const { result } = mount(q, { selectPage });
    expect(result.current.rows).toEqual([]);
    expect(result.current.total).toBe(0);
    expect(result.current.isLoading).toBe(true);
  });

  it("hydrates query params from URL state + baseParams", () => {
    const q = makeQuery({ pages: [page([], 0)] });
    mount(q, {
      selectPage,
      arrayExtraKeys: ["status"],
      baseParams: { scopeId: "s-1" },
      initial:
        "page=2&limit=50&q=alpha&sortBy=name&sortDir=desc&f_status=Active,Planned",
    });
    const l = last(q.calls);
    expect(l.page).toBe(2);
    expect(l.limit).toBe(50);
    expect(l.search).toBe("alpha");
    expect(l.sortBy).toBe("name");
    expect(l.sortDir).toBe("desc");
    // Filter values travel under their own namespace, never at top level.
    expect(l.filters).toEqual({ status: ["Active", "Planned"] });
    expect(l.scopeId).toBe("s-1");
  });

  it("keeps a user filter named like a state param intact under `filters`", () => {
    const q = makeQuery({ pages: [page([], 0)] });
    mount(q, {
      selectPage,
      initial: "sortBy=name&sortDir=asc&f_sortBy=priority&f_search=urgent",
    });
    const l = last(q.calls);
    // The state params and the same-named filters coexist untouched.
    expect(l.sortBy).toBe("name");
    expect(l.filters).toEqual({ sortBy: "priority", search: "urgent" });
    expect(l.search).toBeUndefined();
  });

  it("never lets baseParams beat the live table state", () => {
    const q = makeQuery({ pages: [page([], 0)] });
    mount(q, {
      selectPage,
      baseParams: { scopeId: "s-1", sortBy: "createdAt", page: 99 },
      initial: "page=3&sortBy=name&sortDir=desc",
    });
    const l = last(q.calls);
    expect(l.scopeId).toBe("s-1");
    expect(l.page).toBe(3);
    expect(l.sortBy).toBe("name");
  });

  it("applies sanitizeParams as the final scrubber", () => {
    const q = makeQuery({ pages: [page([], 0)] });
    mount(q, {
      selectPage,
      sanitizeParams: (p) => ({ ...p, search: "scrubbed" }),
      initial: "q=raw",
    });
    expect(last(q.calls).search).toBe("scrubbed");
  });

  it("clamps an out-of-range page once total is known", async () => {
    const q = makeQuery({ pages: [page([{ id: "a", name: "A" }], 10)] });
    const { result } = mount(q, {
      selectPage,
      paginationMode: "paged",
      defaults: { limit: 25 },
      initial: "page=4",
    });
    await waitFor(() => expect(result.current.page).toBe(1));
  });

  it("fetchNextPage triggers the query only when a next page exists", () => {
    const withNext = makeQuery({
      pages: [page([{ id: "a", name: "A" }], 5)],
      hasNextPage: true,
    });
    const { result } = mount(withNext, {
      selectPage,
      paginationMode: "infinite",
    });
    act(() => result.current.fetchNextPage());
    expect(withNext.fetchNextPage).toHaveBeenCalledTimes(1);

    const noNext = makeQuery({
      pages: [page([{ id: "a", name: "A" }], 1)],
      hasNextPage: false,
    });
    const { result: r2 } = mount(noNext, { selectPage });
    act(() => r2.current.fetchNextPage());
    expect(noNext.fetchNextPage).not.toHaveBeenCalled();
  });

  it("refetch delegates to the query and error passes through", () => {
    const q = makeQuery({ pages: [page([], 0)], error: new Error("nope") });
    const { result } = mount(q, { selectPage });
    expect(result.current.error?.message).toBe("nope");
    act(() => void result.current.refetch?.());
    expect(q.refetch).toHaveBeenCalledTimes(1);
  });
});

/**
 * Cursor pagination on the query-library tier.
 *
 * The point of a cursor is that it names a position in the result rather than a
 * distance into it: rows inserted or deleted mid-read shift every offset after
 * them, which is how an offset pager duplicates or skips rows. So these check
 * the token round-trip and, above all, that the trail is thrown away the moment
 * the query means something different.
 */
describe("useQuerySource — cursor pagination", () => {
  const cursorPage = (items: Row[], next: string | null): Page =>
    ({ items, pagination: { total: 0 }, next }) as Page & {
      next: string | null;
    };
  const nextCursor = (p: Page) => (p as Page & { next: string | null }).next;

  it("sends no cursor until the capability is declared", () => {
    const query = makeQuery({
      pages: [cursorPage([{ id: "a", name: "A" }], "t1")],
    });
    mount(query, { selectPage, nextCursor });
    expect(last(query.calls).cursor).toBeUndefined();
  });

  it("sends nothing for page 1 — the first page needs no token", () => {
    const query = makeQuery({
      pages: [cursorPage([{ id: "a", name: "A" }], "t1")],
    });
    mount(query, { selectPage, nextCursor, supports: { cursor: true } });
    expect(last(query.calls).cursor).toBeUndefined();
  });

  it("sends the token the previous page returned when the user pages forward", async () => {
    const query = makeQuery({
      pages: [cursorPage([{ id: "a", name: "A" }], "t1")],
    });
    const { result } = mount(query, {
      selectPage,
      nextCursor,
      supports: { cursor: true },
    });
    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(last(query.calls).cursor).toBe("t1");
    });
  });

  it("keeps a trail, so paging back replays the user's own cursors", async () => {
    const query = makeQuery({
      pages: [cursorPage([{ id: "a", name: "A" }], "t1")],
    });
    const { result } = mount(query, {
      selectPage,
      nextCursor,
      supports: { cursor: true },
    });
    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });
    await waitFor(() => expect(last(query.calls).cursor).toBe("t1"));
    await act(async () => {
      result.current.setPage(1);
      await Promise.resolve();
    });
    // Back to the start: page 1 is reachable without a token, and the token for
    // page 2 is still held rather than refetched.
    expect(last(query.calls).cursor).toBeUndefined();
  });

  it("throws the trail away when the query means something else", async () => {
    const query = makeQuery({
      pages: [cursorPage([{ id: "a", name: "A" }], "t1")],
    });
    const { result } = mount(query, {
      selectPage,
      nextCursor,
      supports: { cursor: true },
    });
    await act(async () => {
      result.current.setPage(2);
      await Promise.resolve();
    });
    await waitFor(() => expect(last(query.calls).cursor).toBe("t1"));
    // A new search makes every held token point into a result that no longer
    // exists. Paging into one would show rows from the previous query.
    await act(async () => {
      result.current.setSearch("ada");
      await Promise.resolve();
    });
    await waitFor(() => {
      expect(last(query.calls).cursor).toBeUndefined();
    });
  });
});

describe("useQuerySource — facets", () => {
  it("sends query.facets when the source declares the capability", () => {
    const query = makeQuery({ pages: [page([{ id: "1", name: "A" }], 1)] });
    mount(query, {
      selectPage,
      supports: { facets: true },
      facetKeys: ["team"],
    });
    expect(last(query.calls).facets).toEqual(["team"]);
  });

  it("surfaces page facets on the source", () => {
    const facets = {
      team: [{ value: "Core", label: "Core", count: 2 }],
    };
    const query = makeQuery({
      pages: [
        {
          items: [{ id: "1", name: "A" }],
          pagination: { total: 1 },
          facets,
        },
      ],
    });
    const { result } = mount(query, {
      selectPage: (p) => ({
        rows: p.items,
        total: p.pagination.total,
        facets: p.facets,
      }),
      supports: { facets: true },
      facetKeys: ["team"],
    });
    expect(result.current.facets).toEqual(facets);
  });
});

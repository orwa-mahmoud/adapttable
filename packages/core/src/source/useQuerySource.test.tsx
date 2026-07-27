import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import type { PaginatedResponse, TableQueryParams } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { type InfiniteQueryLike, useQuerySource } from "./useQuerySource";

interface Row {
  id: string;
  name: string;
}
interface Page {
  items: Row[];
  pagination: { total: number };
}
interface ListParams extends TableQueryParams {
  status?: string[];
  scopeId?: string;
}

const page = (items: Row[], total: number): Page => ({
  items,
  pagination: { total },
});
const selectPage = (p: Page) => ({ items: p.items, total: p.pagination.total });

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
      selectPage: (p) => ({ items: p.items }),
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
      selectPage: (p) => ({ items: p.items }),
      paginationMode: "paged",
    });
    expect(result.current.total).toBe(2);
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

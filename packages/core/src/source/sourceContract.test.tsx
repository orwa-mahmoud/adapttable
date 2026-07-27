import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import type { PaginatedResponse } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import type { TableSource } from "./TableSource";
import { useFrontendData } from "./useFrontendData";
import { type InfiniteQueryLike, useQuerySource } from "./useQuerySource";
import { useServerData } from "./useServerData";

interface Row {
  id: string;
  n: number;
}

const LIMIT = 2;
const ALL: Row[] = Array.from({ length: 6 }, (_, i) => ({
  id: String(i + 1),
  n: i + 1,
}));
/** A FRESH array per call — response identity changes like a real fetch. */
const pageOf = (page: number): Row[] =>
  ALL.slice((page - 1) * LIMIT, page * LIMIT);

type Mode = "paged" | "infinite";

/**
 * One tier mounted for the shared contract. `deliver()` completes the
 * in-flight "fetch" (no-op on the synchronous frontend tier); `fetches`
 * counts underlying fetch invocations (query emissions / query-hook calls
 * / forwarded refetch).
 */
interface Mounted {
  source: () => TableSource<Row>;
  deliver: () => void;
  startRefresh: (opts?: { emptyRows?: boolean }) => void;
  fetches: () => number;
  /** Whether this tier's fetches are asynchronous (have in-flight windows). */
  async: boolean;
}

function mountServer(mode: Mode): Mounted {
  const adapter = createMemoryAdapter("");
  const queries: { page: number }[] = [];
  interface Resp {
    rows: readonly Row[];
    total: number;
    loading: boolean;
  }
  let set!: (next: Partial<Resp>) => void;
  const { result } = renderHook(() => {
    const [resp, setResp] = useState<Resp>({
      rows: [],
      total: 0,
      loading: true,
    });
    set = (next) => setResp((prev) => ({ ...prev, ...next }));
    return useServerData<Row>({
      rows: resp.rows,
      total: resp.total,
      loading: resp.loading,
      paginationMode: mode,
      forceMobile: false,
      urlAdapter: adapter,
      defaults: { limit: LIMIT },
      onQueryChange: (query) => {
        queries.push({ page: query.page });
      },
    });
  });
  return {
    source: () => result.current,
    deliver: () =>
      act(() =>
        set({
          rows: pageOf(queries.at(-1)?.page ?? 1),
          total: ALL.length,
          loading: false,
        })
      ),
    startRefresh: (opts) =>
      act(() =>
        set(opts?.emptyRows ? { loading: true, rows: [] } : { loading: true })
      ),
    fetches: () => queries.length,
    async: true,
  };
}

function mountQuery(mode: Mode): Mounted {
  const adapter = createMemoryAdapter("");
  let fetches = 0;
  let bump!: () => void;
  type Q = InfiniteQueryLike<PaginatedResponse<Row>>;
  function respond(patch: Partial<Q>): void {
    fake = { ...fake, ...patch };
    act(() => bump());
  }
  let fake: Q = {
    data: undefined,
    isLoading: true,
    isFetching: true,
    isFetchingNextPage: false,
    hasNextPage: false,
    error: null,
    fetchNextPage: () => {
      fetches += 1;
      respond({ isFetching: true, isFetchingNextPage: true });
    },
    refetch: () => {
      fetches += 1;
      respond({ isFetching: true });
    },
  };
  // The initial mount is itself a fetch, like useInfiniteQuery's.
  fetches += 1;
  const { result } = renderHook(() => {
    // Version state re-renders the hook under test so it re-reads `fake` —
    // exactly how a query library hands back a fresh result object.
    const [, setVersion] = useState(0);
    bump = () => setVersion((v) => v + 1);
    return useQuerySource<Row>({
      usePaginatedQuery: () => fake,
      paginationMode: mode,
      forceMobile: false,
      urlAdapter: adapter,
      defaults: { limit: LIMIT },
    });
  });
  return {
    source: () => result.current,
    deliver: () => {
      const pages = fake.data?.pages ?? [];
      const nextIndex = fake.isFetchingNextPage ? pages.length + 1 : 1;
      const pageAt = (index: number): PaginatedResponse<Row> => ({
        rows: pageOf(index),
        total: ALL.length,
        page: index,
        limit: LIMIT,
      });
      const nextPages = fake.isFetchingNextPage
        ? [...pages, pageAt(nextIndex)]
        : [pageAt(1)];
      respond({
        data: { pages: nextPages, pageParams: nextPages.map((_, i) => i + 1) },
        isLoading: false,
        isFetching: false,
        isFetchingNextPage: false,
        hasNextPage: nextPages.length * LIMIT < ALL.length,
      });
    },
    startRefresh: (opts) => {
      if (opts?.emptyRows) {
        respond({ isFetching: true, data: { pages: [], pageParams: [] } });
      } else {
        respond({ isFetching: true });
      }
    },
    fetches: () => fetches,
    async: true,
  };
}

function mountFrontend(mode: Mode): Mounted {
  const adapter = createMemoryAdapter("");
  const refetch = vi.fn();
  interface Flags {
    data: readonly Row[];
    isLoading: boolean;
    isFetching: boolean;
  }
  const initial: Flags = { data: [], isLoading: true, isFetching: true };
  const { result, rerender } = renderHook(
    ({ flags }: { flags: Flags }) =>
      useFrontendData<Row>({
        data: flags.data,
        isLoading: flags.isLoading,
        isFetching: flags.isFetching,
        refetch,
        paginationMode: mode,
        forceMobile: false,
        urlAdapter: adapter,
        defaults: { limit: LIMIT },
      }),
    { initialProps: { flags: initial } }
  );
  return {
    source: () => result.current,
    deliver: () =>
      rerender({ flags: { data: ALL, isLoading: false, isFetching: false } }),
    startRefresh: (opts) =>
      rerender({
        flags: {
          data: opts?.emptyRows ? [] : ALL,
          isLoading: false,
          isFetching: true,
        },
      }),
    fetches: () => refetch.mock.calls.length,
    async: false,
  };
}

const TIERS: readonly [string, (mode: Mode) => Mounted][] = [
  ["useFrontendData", mountFrontend],
  ["useServerData", mountServer],
  ["useQuerySource", mountQuery],
];

describe.each(TIERS)("source contract — %s", (_name, mount) => {
  it("raises isLoading + isFetching for the first load only", () => {
    const tier = mount("paged");
    expect(tier.source().isLoading).toBe(true);
    expect(tier.source().isFetching).toBe(true);
    expect(tier.source().rows).toHaveLength(0);

    tier.deliver();
    expect(tier.source().isLoading).toBe(false);
    expect(tier.source().isFetching).toBe(false);
    expect(tier.source().rows).toEqual(pageOf(1));
    expect(tier.source().total).toBe(ALL.length);
  });

  it("keeps isLoading down for background refreshes — even row-emptying ones", () => {
    const tier = mount("paged");
    tier.deliver();

    tier.startRefresh();
    expect(tier.source().isFetching).toBe(true);
    expect(tier.source().isLoading).toBe(false);

    tier.startRefresh({ emptyRows: true });
    expect(tier.source().isFetching).toBe(true);
    expect(tier.source().isLoading).toBe(false);
  });

  it("paged mode: no append surface — hasNextPage false, fetchNextPage a no-op", () => {
    const tier = mount("paged");
    tier.deliver();
    expect(tier.source().hasNextPage).toBe(false);
    expect(tier.source().isFetchingNextPage).toBe(false);

    const fetchesBefore = tier.fetches();
    const rowsBefore = tier.source().rows;
    act(() => tier.source().fetchNextPage());
    expect(tier.fetches()).toBe(fetchesBefore);
    expect(tier.source().rows).toEqual(rowsBefore);
    expect(tier.source().page).toBe(1);
  });

  it("infinite mode: fetchNextPage APPENDS until the data is exhausted", () => {
    const tier = mount("infinite");
    tier.deliver();
    expect(tier.source().rows).toEqual(pageOf(1));
    expect(tier.source().hasNextPage).toBe(true);

    act(() => tier.source().fetchNextPage());
    if (tier.async) {
      // The rows already on screen stay put while the append is in flight.
      expect(tier.source().isFetchingNextPage).toBe(true);
      expect(tier.source().rows).toEqual(pageOf(1));
      tier.deliver();
    }
    expect(tier.source().isFetchingNextPage).toBe(false);
    expect(tier.source().rows).toEqual([...pageOf(1), ...pageOf(2)]);
    expect(tier.source().hasNextPage).toBe(true);

    act(() => tier.source().fetchNextPage());
    if (tier.async) tier.deliver();
    expect(tier.source().rows).toEqual(ALL);
    expect(tier.source().hasNextPage).toBe(false);

    // Exhausted: one more call fetches nothing and changes nothing.
    const fetchesBefore = tier.fetches();
    act(() => tier.source().fetchNextPage());
    expect(tier.fetches()).toBe(fetchesBefore);
    expect(tier.source().rows).toEqual(ALL);
  });

  it("refetch re-runs the underlying fetch", () => {
    const tier = mount("paged");
    tier.deliver();
    const fetchesBefore = tier.fetches();
    act(() => tier.source().refetch?.());
    expect(tier.fetches()).toBe(fetchesBefore + 1);
  });
});

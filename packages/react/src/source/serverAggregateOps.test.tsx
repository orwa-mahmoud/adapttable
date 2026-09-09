/**
 * What the server was asked for, and when the table may say so.
 *
 * A column formatting a group's subtotal is told which operation produced it.
 * On a server tier that is not a guess: the request carries it. The one thing
 * it must not do is describe the numbers on screen with the operation of a
 * request that has not answered yet.
 */
import {
  type QueryAggregate,
  queryAggregateOps,
  type TableQueryParams,
} from "@adapttable/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import { useQuerySource } from "./useQuerySource";
import { useServerData } from "./useServerData";
import { useTableData } from "./useTableData";

interface Row {
  id: string;
  team: string;
  budget: number;
}
const ROWS: Row[] = [{ id: "1", team: "Core", budget: 10 }];
const LATER: Row[] = [{ id: "2", team: "Core", budget: 20 }];

describe("queryAggregateOps", () => {
  it("reads the operation each aggregate was asked for", () => {
    expect(
      queryAggregateOps([
        { key: "budget", fn: "sum" },
        { key: "load", fn: "avg" },
        { key: "team", fn: "count" },
      ])
    ).toEqual({ budget: "sum", load: "avg", team: "count" });
  });

  it("says nothing about an aggregate only the server understands", () => {
    // A custom function name is the server's own; the table does not pretend
    // to know what it means.
    expect(
      queryAggregateOps([{ key: "budget", fn: "median" }])
    ).toBeUndefined();
  });

  it("says nothing when a request carries no aggregates at all", () => {
    expect(queryAggregateOps(undefined)).toBeUndefined();
    expect(queryAggregateOps([])).toBeUndefined();
  });
});

describe("what useServerData publishes about a server's aggregates", () => {
  const mount = (aggregates: readonly QueryAggregate[]) =>
    renderHook(
      (props: { rows: readonly Row[]; loading: boolean }) =>
        useServerData<Row>({
          rows: props.rows,
          total: props.rows.length,
          loading: props.loading,
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates,
        }),
      { initialProps: { rows: ROWS, loading: false } }
    );

  it("names what the HOST declared, before any reader touches it", () => {
    const { result } = mount([
      { key: "budget", fn: "count" },
      { key: "load", fn: "sum" },
    ]);
    expect(result.current.groupAggregations).toEqual({
      budget: "count",
      load: "sum",
    });
  });

  it("follows a reader's override, and drops a column set to none", async () => {
    const view = renderHook(
      (props: { rows: readonly Row[]; loading: boolean }) =>
        useServerData<Row>({
          rows: props.rows,
          total: props.rows.length,
          loading: props.loading,
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
        }),
      { initialProps: { rows: ROWS, loading: false } }
    );
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // Each override is a new request, and each answer is the host going
    // fetching and coming back — which is what makes the new operation the
    // one the numbers on screen were computed with.
    const answer = async (
      override: "avg" | "none" | "reset",
      expected: Record<string, string> | undefined
    ) => {
      const retained = view.result.current.groupAggregations;
      act(() => {
        view.result.current.setGroupAggregateOverrides?.(
          override === "reset" ? {} : { budget: override }
        );
        view.rerender({ rows: ROWS, loading: true });
      });
      expect(view.result.current.groupAggregations).toEqual(retained);
      view.rerender({ rows: LATER, loading: false });
      await waitFor(() =>
        expect(view.result.current.groupAggregations).toEqual(expected)
      );
      view.rerender({ rows: ROWS, loading: false });
    };

    await answer("avg", { budget: "avg" });
    // "none" removes the aggregate from the request, so there is no cell to
    // describe and nothing to say about it.
    await answer("none", undefined);
    // Back to Default: the host's own declaration is what stands again.
    await answer("reset", { budget: "sum" });
  });

  it("describes the rows on screen, not the request in flight", async () => {
    const view = renderHook(
      (props: { rows: readonly Row[]; loading: boolean }) =>
        useServerData<Row>({
          rows: props.rows,
          total: props.rows.length,
          loading: props.loading,
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
        }),
      { initialProps: { rows: ROWS, loading: false } }
    );
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The reader asks for an average and the host goes fetching, as it does
    // the moment it sees the new query. The rows underneath are still the
    // ones the sum answered, so that is what they are still described as.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ rows: ROWS, loading: true });
    });
    expect(view.result.current.isFetching).toBe(true);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The answer lands; now they are the average's.
    view.rerender({ rows: LATER, loading: false });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });
});

describe("which request the rows on a controlled tier answer", () => {
  interface Props {
    rows: readonly Row[];
    loading: boolean;
    error: Error | null;
    responseKey?: string;
  }
  const mount = (initialProps: Props, keys: string[]) =>
    renderHook(
      (props: Props) =>
        useServerData<Row>({
          rows: props.rows,
          total: props.rows.length,
          loading: props.loading,
          error: props.error,
          responseKey: props.responseKey,
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
          onQueryChange: (_query, info) => {
            keys.push(info.key);
          },
        }),
      { initialProps }
    );
  const base: Props = { rows: ROWS, loading: false, error: null };

  it("keeps the operations behind retained rows when the request fails", async () => {
    const keys: string[] = [];
    const view = mount(base, keys);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ ...base, loading: true });
    });
    // The average never arrives. The rows underneath are the sum's, and a
    // cleared loading flag is not an answer.
    view.rerender({ ...base, loading: false, error: new Error("502") });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("keeps them through a cancelled request the host reports by key", async () => {
    const keys: string[] = [];
    const view = mount(base, keys);
    const first = keys.at(-1)!;
    view.rerender({ ...base, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // The average is asked for and aborted: loading falls, no error is
    // raised, the rows never change, and the key still names the sum.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ ...base, loading: true, responseKey: first });
    });
    expect(keys.at(-1)).not.toBe(first);
    view.rerender({ ...base, loading: false, responseKey: first });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("waits for a host that reports loading a tick late", async () => {
    const keys: string[] = [];
    const view = mount(base, keys);

    // The reader switches to an average; this render still carries the
    // host's previous, idle state. Nothing has answered.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    await waitFor(() => expect(keys.length).toBeGreaterThan(1));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    view.rerender({ ...base, loading: true });
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    view.rerender({ rows: LATER, loading: false, error: null });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });

  it("describes the response the host names, not the newest request", async () => {
    const keys: string[] = [];
    const view = mount(base, keys);
    const first = keys.at(-1)!;
    view.rerender({ ...base, responseKey: first });

    // Two overrides in quick succession. The host is still answering the
    // first request, and says so.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "min" });
    });
    view.rerender({ ...base, loading: true, responseKey: first });
    await waitFor(() => expect(keys.length).toBeGreaterThan(2));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The superseded answer is discarded and the latest one lands.
    const latest = keys.at(-1)!;
    view.rerender({
      rows: LATER,
      loading: false,
      error: null,
      responseKey: latest,
    });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "min" })
    );
  });
});

interface Page {
  items: Row[];
  pagination: { total: number };
}
const PAGE: Page = { items: ROWS, pagination: { total: 1 } };

describe("which response the rows on a query tier answer", () => {
  interface Props {
    pages: Page[] | undefined;
    fetching: boolean;
    error: Error | null;
    dataUpdatedAt: number;
  }
  const mount = (initialProps: Props) =>
    renderHook(
      (props: Props) =>
        useQuerySource<Row, TableQueryParams, Page>({
          usePaginatedQuery: () => ({
            data: props.pages
              ? { pages: props.pages, pageParams: props.pages.map((_, i) => i) }
              : undefined,
            isLoading: props.pages === undefined && props.fetching,
            isFetching: props.fetching,
            isFetchingNextPage: false,
            hasNextPage: false,
            fetchNextPage: vi.fn(),
            refetch: vi.fn(),
            error: props.error,
            dataUpdatedAt: props.dataUpdatedAt,
          }),
          selectPage: (p) => ({ rows: p.items, total: p.pagination.total }),
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
        }),
      { initialProps }
    );
  const base: Props = {
    pages: [PAGE],
    fetching: false,
    error: null,
    dataUpdatedAt: 1_000,
  };

  it("keeps the operations behind retained pages when a fetch fails", async () => {
    const view = mount(base);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ ...base, fetching: true });
    });
    // The failure leaves the cached pages up, and their timestamp where it
    // was — so they are still the sum's.
    view.rerender({ ...base, fetching: false, error: new Error("502") });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("keeps them while the next answer is still travelling", async () => {
    const view = mount(base);
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    // No flag has moved yet — an unchanged timestamp is the whole answer.
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );
    view.rerender({ ...base, fetching: true });
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("reads a cached answer that arrives without a fetch", async () => {
    const view = mount(base);
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    // TanStack serves this query from cache: pages are there at once, with
    // the timestamp of when they were first fetched. Older than the sum's,
    // and still the average's.
    view.rerender({ ...base, dataUpdatedAt: 400 });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });

  it("skips a superseded request and lands on the answer that arrives", async () => {
    const view = mount(base);
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "min" });
    });
    view.rerender({ ...base, fetching: true });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    view.rerender({ ...base, fetching: false, dataUpdatedAt: 2_000 });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "min" })
    );
  });
});

describe("the response key a `<DataTable>` host echoes back", () => {
  it("reaches the data tier through the component's own props", async () => {
    const keys: string[] = [];
    const adapter = createMemoryAdapter("");
    const view = renderHook(
      (props: { responseKey?: string }) =>
        useTableData<Row>({
          mode: "server",
          data: ROWS,
          total: ROWS.length,
          columns: [{ key: "budget", header: "Budget" }],
          urlAdapter: adapter,
          supports: { grouping: true, aggregates: true },
          responseKey: props.responseKey,
          onQueryChange: (_query, info) => {
            keys.push(info.key);
          },
        }),
      { initialProps: {} }
    );
    const first = keys.at(-1)!;
    view.rerender({ responseKey: first });
    // Nothing is aggregated yet, so there is nothing to say about a cell.
    await waitFor(() =>
      expect(view.result.current.source.groupAggregations).toBeUndefined()
    );

    // The reader asks for a count. A request that has not answered cannot
    // redescribe the rows it left on screen.
    act(() => {
      view.result.current.source.setGroupAggregateOverrides?.({
        budget: "count",
      });
    });
    await waitFor(() => expect(keys.length).toBeGreaterThan(1));
    expect(view.result.current.source.groupAggregations).toBeUndefined();

    // The host names the request these rows answer, and the count is theirs.
    view.rerender({ responseKey: keys.at(-1) });
    await waitFor(() =>
      expect(view.result.current.source.groupAggregations).toEqual({
        budget: "count",
      })
    );
  });
});

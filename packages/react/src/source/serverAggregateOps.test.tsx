/**
 * What the server was asked for, and when the table may say so.
 *
 * A column formatting a group's subtotal is told which operation produced it.
 * On a server tier that is not a guess: the request carries it. The one thing
 * it must not do is describe the numbers on screen with the operation of a
 * request that has not answered — and where the tier cannot tell, it says
 * nothing rather than the wrong thing.
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

  it("keeps a host operation id so formatAggregate is told the same request", () => {
    expect(queryAggregateOps([{ key: "budget", fn: "median" }])).toEqual({
      budget: "median",
    });
  });

  it("says nothing when a request carries no aggregates at all", () => {
    expect(queryAggregateOps(undefined)).toBeUndefined();
    expect(queryAggregateOps([])).toBeUndefined();
  });
});

interface ServerProps {
  rows: readonly Row[];
  loading: boolean;
  error?: Error | null;
  responseKey?: string;
}

/** A controlled tier whose host names every request it is handed. */
function mountServer(
  aggregates: readonly QueryAggregate[],
  keys: string[],
  initial?: Partial<ServerProps>
) {
  return renderHook(
    (props: ServerProps) =>
      useServerData<Row>({
        rows: props.rows,
        total: 1000,
        loading: props.loading,
        error: props.error ?? null,
        responseKey: props.responseKey,
        urlSync: false,
        supports: { grouping: true, aggregates: true },
        aggregates,
        onQueryChange: (_query, info) => {
          keys.push(info.key);
        },
      }),
    {
      initialProps: {
        rows: ROWS,
        loading: false,
        ...initial,
      },
    }
  );
}

describe("what useServerData publishes about a server's aggregates", () => {
  it("names what the HOST declared, before any reader touches it", () => {
    const { result } = mountServer(
      [
        { key: "budget", fn: "count" },
        { key: "load", fn: "sum" },
      ],
      []
    );
    expect(result.current.groupAggregations).toEqual({
      budget: "count",
      load: "sum",
    });
  });

  it("follows a reader's override, and drops a column set to none", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // Each override is a new request, and the host names the one its rows
    // answer — which is what makes the new operation theirs.
    const answer = async (
      override: "avg" | "none" | "reset",
      expected: Record<string, string> | undefined
    ) => {
      const retained = view.result.current.groupAggregations;
      const asked = keys.length;
      act(() => {
        view.result.current.setGroupAggregateOverrides?.(
          override === "reset" ? {} : { budget: override }
        );
      });
      await waitFor(() => expect(keys.length).toBeGreaterThan(asked));
      view.rerender({
        rows: ROWS,
        loading: true,
        responseKey: view.result.current.groupAggregations && undefined,
      });
      expect(view.result.current.groupAggregations).toEqual(retained);
      view.rerender({
        rows: LATER,
        loading: false,
        responseKey: keys.at(-1),
      });
      await waitFor(() =>
        expect(view.result.current.groupAggregations).toEqual(expected)
      );
    };

    await answer("avg", { budget: "avg" });
    // "none" removes the aggregate from the request, so there is no cell to
    // describe and nothing to say about it.
    await answer("none", undefined);
    // Back to Default: the host's own declaration is what stands again.
    await answer("reset", { budget: "sum" });
  });

  it("describes the rows on screen, not the request in flight", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // The reader asks for an average and the host goes fetching. The rows
    // underneath are still the ones the sum answered.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ rows: ROWS, loading: true, responseKey: first });
    });
    expect(view.result.current.isFetching).toBe(true);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The answer lands, named; now they are the average's.
    view.rerender({ rows: LATER, loading: false, responseKey: keys.at(-1) });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });
});

describe("which request the rows on a controlled tier answer", () => {
  it("keeps the operations behind retained rows when the request fails", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ rows: ROWS, loading: true });
    });
    // The average never arrives. The rows underneath are the sum's, and a
    // cleared loading flag is not an answer.
    view.rerender({ rows: ROWS, loading: false, error: new Error("502") });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("keeps them through a cancelled request the host reports by key", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // The average is asked for and aborted: loading falls, no error is
    // raised, the rows never change, and the key still names the sum.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ rows: ROWS, loading: true, responseKey: first });
    });
    expect(keys.at(-1)).not.toBe(first);
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("says nothing about a cancelled request no key can place", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // Exactly what an abort looks like to a host that reports no key: the
    // request went out, loading rose and fell, no error was raised, and the
    // rows are the ones that were already there. Nothing here says the
    // average ran, so the table does not claim it did — and it does not
    // claim the sum describes rows a newer request may have replaced.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ rows: ROWS, loading: true });
    });
    view.rerender({ rows: ROWS, loading: false });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toBeUndefined()
    );
  });

  it("waits for a host that reports loading a tick late", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // The reader switches to an average; this render still carries the host's
    // previous, idle state. Nothing has answered.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    await waitFor(() => expect(keys.length).toBeGreaterThan(1));
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    view.rerender({ rows: ROWS, loading: true, responseKey: first });
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    view.rerender({ rows: LATER, loading: false, responseKey: keys.at(-1) });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });

  it("describes the response the host names, not the newest request", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });

    // Two overrides in quick succession. The host is still answering the
    // first request, and says so.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "min" });
    });
    view.rerender({ rows: ROWS, loading: true, responseKey: first });
    await waitFor(() => expect(keys.length).toBeGreaterThan(2));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The superseded answer is discarded and the latest one lands.
    view.rerender({ rows: LATER, loading: false, responseKey: keys.at(-1) });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "min" })
    );
  });

  it("says nothing about a response whose request it no longer remembers", async () => {
    const keys: string[] = [];
    const view = mountServer([{ key: "budget", fn: "sum" }], keys);
    const first = keys.at(-1)!;
    view.rerender({ rows: ROWS, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "sum" })
    );

    // Enough later requests to push the first one out of the table's memory,
    // each one answered as it lands.
    for (let page = 2; page <= 11; page += 1) {
      act(() => {
        view.result.current.setPage(page);
      });
      view.rerender({
        rows: ROWS,
        loading: false,
        responseKey: keys.at(-1),
      });
    }
    await waitFor(() => expect(keys.length).toBeGreaterThan(9));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // The very first answer finally lands. Its operations are gone, and no
    // other response's stand in for them.
    view.rerender({ rows: LATER, loading: false, responseKey: first });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toBeUndefined()
    );
  });
});

interface Page {
  items: Row[];
  pagination: { total: number };
}
/** The params a query tier receives, including the aggregates it was sent. */
interface AggregateParams extends TableQueryParams {
  aggregates?: readonly QueryAggregate[];
}
const PAGE: Page = { items: ROWS, pagination: { total: 1 } };

describe("which response the rows on a query tier answer", () => {
  interface Props {
    /**
     * When each query answered, by the operation it asked for — a stand-in
     * for the query cache. A query with no entry has no answer of its own,
     * which TanStack reports as `dataUpdatedAt: 0` while it shows the
     * previous one's pages; two cached entries may share a stamp.
     */
    answered: Record<string, number>;
    fetching: boolean;
    error: Error | null;
  }
  const mount = (initialProps: Props) =>
    renderHook(
      (props: Props) =>
        useQuerySource<Row, AggregateParams, Page>({
          usePaginatedQuery: (params) => {
            const asked = params.aggregates?.[0]?.fn ?? "";
            const at = props.answered[asked] ?? 0;
            // Pages stay on screen while a query without its own answer
            // fetches, exactly as `placeholderData` keeps them.
            return {
              data: { pages: [PAGE], pageParams: [0] },
              isLoading: false,
              isFetching: props.fetching,
              isFetchingNextPage: false,
              hasNextPage: false,
              fetchNextPage: vi.fn(),
              refetch: vi.fn(),
              error: props.error,
              dataUpdatedAt: at,
            };
          },
          selectPage: (p) => ({ rows: p.items, total: p.pagination.total }),
          urlSync: false,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
        }),
      { initialProps }
    );
  const base: Props = {
    answered: { sum: 1_000 },
    fetching: false,
    error: null,
  };

  it("keeps the operations behind retained pages when a fetch fails", async () => {
    const view = mount(base);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
      view.rerender({ ...base, fetching: true });
    });
    // The failure leaves the previous pages up, and the average's query
    // without an answer of its own — so they are still the sum's.
    view.rerender({ ...base, fetching: false, error: new Error("502") });
    await waitFor(() => expect(view.result.current.isFetching).toBe(false));
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });
  });

  it("keeps them while the next answer is still travelling", async () => {
    const view = mount(base);
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
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
    // Served from cache: pages are there at once, stamped when they were
    // first fetched. Older than the sum's, and still the average's.
    view.rerender({ ...base, answered: { sum: 1_000, avg: 400 } });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "avg" })
    );
  });

  it("tells two cached answers apart when they carry the same stamp", async () => {
    const view = mount(base);
    expect(view.result.current.groupAggregations).toEqual({ budget: "sum" });

    // Both results were written in the same millisecond, so the stamp alone
    // says nothing. The request they belong to does.
    act(() => {
      view.result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    view.rerender({ ...base, answered: { sum: 1_000, avg: 1_000 } });
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

    view.rerender({
      ...base,
      fetching: false,
      answered: { sum: 1_000, min: 2_000 },
    });
    await waitFor(() =>
      expect(view.result.current.groupAggregations).toEqual({ budget: "min" })
    );
  });
});

describe("the server props a `<DataTable>` host writes", () => {
  it("carries its own aggregates and response key into the data tier", async () => {
    const keys: string[] = [];
    const asked: (readonly QueryAggregate[] | undefined)[] = [];
    const adapter = createMemoryAdapter("");
    const view = renderHook(
      (props: { responseKey?: string }) =>
        useTableData<Row>({
          mode: "server",
          data: ROWS,
          total: ROWS.length,
          columns: [
            {
              key: "budget",
              header: "Budget",
              aggregatable: {
                default: "sum",
                operations: ["sum", "count"],
              },
            },
          ],
          urlAdapter: adapter,
          supports: { grouping: true, aggregates: true },
          aggregates: [{ key: "budget", fn: "sum" }],
          responseKey: props.responseKey,
          onQueryChange: (query, info) => {
            keys.push(info.key);
            asked.push(query.aggregates);
          },
        }),
      { initialProps: {} }
    );
    // The component's own `aggregates` reach the request and describe its rows.
    expect(asked[0]).toEqual([{ key: "budget", fn: "sum" }]);
    const first = keys.at(-1)!;
    view.rerender({ responseKey: first });
    await waitFor(() =>
      expect(view.result.current.source.groupAggregations).toEqual({
        budget: "sum",
      })
    );

    // A request that has not answered cannot redescribe the rows it left up.
    act(() => {
      view.result.current.source.setGroupAggregateOverrides?.({
        budget: "count",
      });
    });
    await waitFor(() => expect(keys.length).toBeGreaterThan(1));
    expect(asked.at(-1)).toEqual([{ key: "budget", fn: "count" }]);
    expect(view.result.current.source.groupAggregations).toEqual({
      budget: "sum",
    });

    // The host names the request these rows answer, and the count is theirs.
    view.rerender({ responseKey: keys.at(-1) });
    await waitFor(() =>
      expect(view.result.current.source.groupAggregations).toEqual({
        budget: "count",
      })
    );
  });
});

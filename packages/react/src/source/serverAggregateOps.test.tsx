/**
 * What the server was asked for, and when the table may say so.
 *
 * A column formatting a group's subtotal is told which operation produced it.
 * On a server tier that is not a guess: the request carries it. The one thing
 * it must not do is describe the numbers on screen with the operation of a
 * request that has not answered yet.
 */
import { type QueryAggregate, queryAggregateOps } from "@adapttable/core";
import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useServerData } from "./useServerData";

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
    const { result } = mount([{ key: "budget", fn: "sum" }]);
    expect(result.current.groupAggregations).toEqual({ budget: "sum" });

    act(() => {
      result.current.setGroupAggregateOverrides?.({ budget: "avg" });
    });
    await waitFor(() =>
      expect(result.current.groupAggregations).toEqual({ budget: "avg" })
    );

    // "none" removes the aggregate from the request, so there is no cell to
    // describe and nothing to say about it.
    act(() => {
      result.current.setGroupAggregateOverrides?.({ budget: "none" });
    });
    await waitFor(() =>
      expect(result.current.groupAggregations).toBeUndefined()
    );

    // Back to Default: the host's own declaration is what stands again.
    act(() => {
      result.current.setGroupAggregateOverrides?.({});
    });
    await waitFor(() =>
      expect(result.current.groupAggregations).toEqual({ budget: "sum" })
    );
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

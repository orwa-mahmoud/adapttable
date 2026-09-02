/**
 * What the server tier promises about requests.
 *
 * Every guarantee below already holds — the value-keyed emit is the
 * deduplication mechanism. These tests exist because nothing pinned them, and
 * a guarantee nobody tests is one a refactor can quietly withdraw. The docs
 * state the same four promises; if one of these fails, the docs became wrong.
 */
import { act, render, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import type { TableSource } from "./TableSource";
import { type TableQuery, useServerData } from "./useServerData";

interface Row {
  id: string;
}

/** Mount the server tier, recording every emitted query and every abort. */
function mount() {
  const queries: TableQuery[] = [];
  const abortedSearches: (string | undefined)[] = [];
  let source!: TableSource<Row>;
  const adapter = createMemoryAdapter("");

  function Harness() {
    source = useServerData<Row>({
      rows: [],
      total: 0,
      urlAdapter: adapter,
      forceMobile: false,
      onQueryChange: (query, { signal }) => {
        queries.push(query);
        signal.addEventListener("abort", () =>
          abortedSearches.push(query.search)
        );
      },
    });
    return null;
  }

  render(<Harness />);
  return {
    queries,
    abortedSearches,
    get source() {
      return source;
    },
  };
}

describe("server-tier request guarantees", () => {
  it("sends nested grouping and session aggregate overrides as one query", async () => {
    const queries: TableQuery[] = [];
    const adapter = createMemoryAdapter(
      "groupBy=team%2Cstatus&groupAgg=budget%3Aavg%2Cperson%3Anone"
    );
    function Harness() {
      useServerData<Row>({
        rows: [],
        total: 0,
        urlAdapter: adapter,
        forceMobile: false,
        supports: { grouping: true, aggregates: true },
        aggregates: [
          { key: "budget", fn: "sum" },
          { key: "person", fn: "count" },
        ],
        onQueryChange: (query) => {
          queries.push(query);
        },
      });
      return null;
    }
    render(<Harness />);
    await waitFor(() => expect(queries).toHaveLength(1));
    expect(queries[0]?.groupBy).toEqual(["team", "status"]);
    expect(queries[0]?.aggregates).toEqual([{ key: "budget", fn: "avg" }]);
  });

  it("emits once for a query, however many times the same value is set", async () => {
    const t = mount();
    await waitFor(() => expect(t.queries).toHaveLength(1));

    act(() => {
      t.source.setSearch("widgets");
      t.source.setSearch("widgets");
      t.source.setSearch("widgets");
    });
    await waitFor(() => expect(t.queries.at(-1)?.search).toBe("widgets"));

    // One request for one query — the repeats collapse into it.
    expect(t.queries).toHaveLength(2);
  });

  it("does not re-request when a render changes nothing", async () => {
    const t = mount();
    await waitFor(() => expect(t.queries).toHaveLength(1));

    // Setting the value it already holds is not a change.
    act(() => t.source.setSearch(""));
    await new Promise((resolve) => setTimeout(resolve, 20));

    expect(t.queries).toHaveLength(1);
  });

  it("aborts the superseded request when the query really changes", async () => {
    const t = mount();
    await waitFor(() => expect(t.queries).toHaveLength(1));

    act(() => t.source.setSearch("a"));
    await waitFor(() => expect(t.queries).toHaveLength(2));
    act(() => t.source.setSearch("ab"));
    await waitFor(() => expect(t.queries).toHaveLength(3));

    // Each superseded query's signal fired, so a forwarded fetch dies at the
    // source and out-of-order responses cannot land.
    expect(t.abortedSearches).toEqual(["", "a"]);
  });

  it("re-requests a value the user returns to, because its request was aborted", async () => {
    const t = mount();
    await waitFor(() => expect(t.queries).toHaveLength(1));

    act(() => t.source.setSearch("a"));
    await waitFor(() => expect(t.queries).toHaveLength(2));
    act(() => t.source.setSearch("ab"));
    await waitFor(() => expect(t.queries).toHaveLength(3));
    act(() => t.source.setSearch("a"));
    await waitFor(() => expect(t.queries).toHaveLength(4));

    // Collapsing this one would leave the table with no request in flight and
    // no rows to show: the first "a" was aborted the moment "ab" superseded it.
    expect(t.queries.map((q) => q.search)).toEqual(["", "a", "ab", "a"]);
  });

  it("refetches on demand even though the query is unchanged", async () => {
    const t = mount();
    await waitFor(() => expect(t.queries).toHaveLength(1));

    const { refetch } = t.source;
    if (!refetch) throw new Error("the server tier should expose refetch");
    act(() => refetch());

    // The one deliberate exception: `refetch` asks for fresh data, so it is
    // never treated as a duplicate.
    await waitFor(() => expect(t.queries).toHaveLength(2));
    expect(t.queries[1]?.search).toBe("");
  });
});

/**
 * The contract as a server actually experiences it: what arrives in
 * `onQueryChange` when a source declares nothing, and what changes the moment
 * it declares a capability.
 *
 * The first test here is the compatibility promise. If it ever fails, an
 * endpoint written before these fields existed has started receiving
 * something new — which is the one outcome this design exists to prevent.
 */
import { type QuerySupport, resetDevWarnings } from "@adapttable/core";
import { render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import { type TableQuery, useServerData } from "./useServerData";

interface Row {
  id: string;
}

/** Mount the server tier with a URL that already has grouping active. */
function mount(
  supports?: QuerySupport,
  url = "groupBy=team",
  expandedIds?: readonly string[],
  facetKeys?: readonly string[]
) {
  const seen: TableQuery[] = [];
  const adapter = createMemoryAdapter(url);
  function Harness() {
    useServerData<Row>({
      rows: [],
      total: 0,
      urlAdapter: adapter,
      forceMobile: false,
      supports,
      expandedIds,
      facetKeys,
      onQueryChange: (query) => {
        seen.push(query);
      },
    });
    return null;
  }
  render(<Harness />);
  return { seen };
}

describe("the query a server receives", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("carries only the baseline fields when no support is declared", async () => {
    const { seen } = mount();
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    const [first] = seen;
    if (!first) throw new Error("the source emitted no query");
    // Exactly the shape endpoints were written against before the contract.
    expect(Object.keys(first).sort((a, b) => a.localeCompare(b))).toEqual([
      "filters",
      "limit",
      "page",
      "search",
      "sortBy",
      "sortDir",
      "sortLevels",
    ]);
  });

  it("adds groupBy once the source says it can group", async () => {
    const { seen } = mount({ grouping: true });
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]!.groupBy).toEqual(["team"]);
  });

  it("sends no groupBy when the table is not grouping", async () => {
    const { seen } = mount({ grouping: true }, "");
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]!.groupBy).toBeUndefined();
  });

  it("warns when the UI is grouping and the source cannot", async () => {
    mount();
    await waitFor(() => expect(console.warn).toHaveBeenCalled());
    expect(vi.mocked(console.warn).mock.calls[0]?.[0]).toContain(
      "supports.grouping"
    );
  });

  it("sends the open tree nodes to a source that answers trees", async () => {
    const { seen } = mount({ tree: true }, "", ["src", "lib"]);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]?.expandedIds).toEqual(["src", "lib"]);
  });

  it("keeps the open nodes to itself when the source never declared trees", async () => {
    const { seen } = mount(undefined, "", ["src"]);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]).not.toHaveProperty("expandedIds");
  });

  it("sends query.facets once the source says it can count", async () => {
    const { seen } = mount({ facets: true }, "", undefined, ["team"]);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]?.facets).toEqual(["team"]);
  });

  it("keeps facet keys to itself when the source never declared facets", async () => {
    const { seen } = mount(undefined, "", undefined, ["team"]);
    await waitFor(() => expect(seen.length).toBeGreaterThan(0));
    expect(seen[0]).not.toHaveProperty("facets");
  });
});

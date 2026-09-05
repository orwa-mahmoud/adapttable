/**
 * Cursor pagination, from the server's side of the wire.
 *
 * The promises under test: a token sent is only ever one the server issued,
 * the trail lets the user page back, a changed sort throws the trail away
 * rather than sending a token describing a result set that no longer exists,
 * and a source which never declares `supports.cursor` sees none of it.
 */
import { act, render, waitFor } from "@testing-library/react";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import { resetDevWarnings } from "@adapttable/core";
import type { TableSource } from "@adapttable/core";
import { type TableQuery, useServerData } from "./useServerData";

interface Row {
  id: string;
}

interface Response {
  rows: Row[];
  nextCursor: string | null;
}

/**
 * A harness shaped like a real caller: it holds the last response in its own
 * state, records every query the table emits, and lets the test hand back
 * whatever the server would have said.
 */
function mount(options: {
  cursorMode?: boolean;
  paginationMode?: "paged" | "infinite";
}) {
  const queries: TableQuery[] = [];
  const adapter = createMemoryAdapter("");
  let source!: TableSource<Row>;
  let setResponse!: (next: Response) => void;

  function Harness() {
    const [response, setState] = useState<Response>({
      rows: [{ id: "a" }],
      nextCursor: null,
    });
    setResponse = setState;
    source = useServerData<Row>({
      rows: response.rows,
      total: 0,
      nextCursor: response.nextCursor,
      urlAdapter: adapter,
      forceMobile: false,
      paginationMode: options.paginationMode ?? "paged",
      supports: options.cursorMode ? { cursor: true } : undefined,
      onQueryChange: (query) => {
        queries.push(query);
      },
    });
    return null;
  }

  render(<Harness />);
  return {
    queries,
    get source() {
      return source;
    },
    respond: (next: Response) => act(() => setResponse(next)),
  };
}

describe("cursor pagination", () => {
  beforeEach(() => {
    resetDevWarnings();
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends no cursor field at all when the source never declares it", async () => {
    const t = mount({ cursorMode: false });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    t.respond({ rows: [{ id: "a" }], nextCursor: "page-2" });
    expect(t.queries.every((q) => !("cursor" in q))).toBe(true);
  });

  it("opens with no cursor, because the first page needs no token", async () => {
    const t = mount({ cursorMode: true });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    // The contract omits a field the caller never set rather than sending it
    // as undefined, so page one is byte-for-byte the query it always was.
    expect(t.queries[0]).not.toHaveProperty("cursor");
  });

  it("reports no next page until the server offers a token", async () => {
    const t = mount({ cursorMode: true, paginationMode: "infinite" });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    expect(t.source.hasNextPage).toBe(false);
    t.respond({ rows: [{ id: "a" }], nextCursor: "page-2" });
    await waitFor(() => expect(t.source.hasNextPage).toBe(true));
  });

  it("sends back exactly the token the server issued", async () => {
    const t = mount({ cursorMode: true, paginationMode: "infinite" });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    t.respond({ rows: [{ id: "a" }], nextCursor: "opaque-2" });
    await waitFor(() => expect(t.source.hasNextPage).toBe(true));

    act(() => t.source.fetchNextPage());
    await waitFor(() => expect(t.queries.at(-1)?.cursor).toBe("opaque-2"));
  });

  it("retraces the trail when the user pages back", async () => {
    const t = mount({ cursorMode: true });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    t.respond({ rows: [{ id: "a" }], nextCursor: "opaque-2" });

    act(() => t.source.setPage(2));
    await waitFor(() => expect(t.queries.at(-1)?.cursor).toBe("opaque-2"));

    act(() => t.source.setPage(1));
    await waitFor(() => expect(t.queries.at(-1)?.cursor).toBeUndefined());
  });

  it("ignores a jump to a page whose token it never received", async () => {
    const t = mount({ cursorMode: true });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    const before = t.queries.length;

    act(() => t.source.setPage(7));

    expect(t.source.page).toBe(1);
    expect(t.queries).toHaveLength(before);
  });

  it("throws the trail away when the sort changes", async () => {
    const t = mount({ cursorMode: true });
    await waitFor(() => expect(t.queries.length).toBeGreaterThan(0));
    t.respond({ rows: [{ id: "a" }], nextCursor: "opaque-2" });
    act(() => t.source.setPage(2));
    await waitFor(() => expect(t.source.page).toBe(2));

    act(() => t.source.setSort("name", "asc"));

    await waitFor(() => expect(t.source.page).toBe(1));
    expect(t.queries.at(-1)?.cursor).toBeUndefined();
  });
});

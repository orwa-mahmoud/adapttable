/**
 * A table served by a server source shows the page the reader asked for
 * last, whatever order the responses arrive in: the superseded request's
 * signal is aborted before its late answer lands.
 */
import { act, renderHook, waitFor } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { useServerData } from "./useServerData";
import { useTableData } from "./useTableData";

interface Row {
  id: string;
  name: string;
}

const ALL: Row[] = Array.from({ length: 6 }, (_, index) => ({
  id: String(index + 1),
  name: `Row ${String(index + 1)}`,
}));

const pageOf = (page: number) => ALL.slice((page - 1) * 2, page * 2);

interface Pending {
  readonly page: number;
  readonly signal: AbortSignal;
  readonly answer: () => void;
}

function useHost(pending: Pending[]) {
  const [rows, setRows] = useState<readonly Row[]>([]);
  const source = useServerData<Row>({
    rows,
    total: ALL.length,
    urlSync: false,
    paginationMode: "paged",
    defaults: { limit: 2 },
    onQueryChange: (query, { signal }) => {
      pending.push({
        page: query.page,
        signal,
        // The host's fetch: a response for an aborted request is dropped.
        answer: () => {
          if (!signal.aborted) setRows(pageOf(query.page));
        },
      });
    },
  });
  return useTableData<Row>({ source, columns: [{ key: "name" }] }).source;
}

const names = (rows: readonly Row[]) => rows.map((row) => row.name);

describe("a table served by a server source", () => {
  it("keeps the latest page when an older response arrives after it", async () => {
    const pending: Pending[] = [];
    const { result } = renderHook(() => useHost(pending));
    await waitFor(() => expect(pending).toHaveLength(1));
    act(() => {
      pending[0]!.answer();
    });
    expect(names(result.current.rows)).toEqual(["Row 1", "Row 2"]);

    act(() => {
      result.current.setPage(2);
    });
    await waitFor(() => expect(pending).toHaveLength(2));
    act(() => {
      result.current.setPage(3);
    });
    await waitFor(() => expect(pending).toHaveLength(3));
    expect(pending.map((request) => request.page)).toEqual([1, 2, 3]);
    expect(pending[1]!.signal.aborted).toBe(true);
    expect(pending[2]!.signal.aborted).toBe(false);

    act(() => {
      pending[2]!.answer();
    });
    expect(names(result.current.rows)).toEqual(["Row 5", "Row 6"]);
    act(() => {
      pending[1]!.answer();
    });
    expect(names(result.current.rows)).toEqual(["Row 5", "Row 6"]);
    expect(result.current.page).toBe(3);
  });

  it("aborts the request in flight when the table goes away", async () => {
    const pending: Pending[] = [];
    const { unmount } = renderHook(() => useHost(pending));
    await waitFor(() => expect(pending).toHaveLength(1));
    expect(pending[0]!.signal.aborted).toBe(false);
    unmount();
    expect(pending[0]!.signal.aborted).toBe(true);
  });
});

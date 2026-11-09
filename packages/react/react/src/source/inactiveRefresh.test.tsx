import {
  INACTIVE_TIER_ROWS,
  type TableCallbackRefresh,
} from "@adapttable/core";
import { createBasicTableEngine } from "@adapttable/core/engine";
import { act, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";

import { createMemoryAdapter } from "../url/adapter";
import { useFrontendData } from "./useFrontendData";
import { useServerData } from "./useServerData";
import { useTableData } from "./useTableData";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Ada" },
  { id: "b", name: "Bea" },
  { id: "c", name: "Cy" },
];

const IDLE_ROWS = INACTIVE_TIER_ROWS as readonly Row[];

/**
 * Counts `refreshCallbacks`, which a frontend source calls on every update
 * and not on a skipped one. Row scans are a different counter.
 */
function countRefreshes() {
  let refreshes = 0;
  const createEngine = (
    options: Parameters<typeof createBasicTableEngine<Row>>[0]
  ) => {
    const engine = createBasicTableEngine<Row>(options);
    const refresh = engine.refreshCallbacks.bind(engine);
    const mutable = engine as unknown as {
      refreshCallbacks: (patch: TableCallbackRefresh<Row>) => void;
    };
    mutable.refreshCallbacks = (patch) => {
      refreshes += 1;
      refresh(patch);
    };
    return engine;
  };
  return {
    createEngine,
    get refreshes() {
      return refreshes;
    },
  };
}

/** `rows.length` is read by a server update and by its commit, not by a skip. */
function watchLength(rows: readonly Row[]) {
  let reads = 0;
  const watched: readonly Row[] = new Proxy(rows, {
    get(target, prop, receiver) {
      if (prop === "length") reads += 1;
      return Reflect.get(target, prop, receiver);
    },
  });
  return {
    rows: watched,
    get reads() {
      return reads;
    },
  };
}

describe("inactive source refresh", () => {
  it("skips a repeat of the same frontend inputs", () => {
    const probe = countRefreshes();
    const adapter = createMemoryAdapter("");
    const { rerender } = renderHook(() =>
      useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        paginationMode: "paged",
        createEngine: probe.createEngine,
      })
    );
    const applied = probe.refreshes;
    expect(applied).toBeGreaterThan(0);
    rerender({ tick: 1 });
    expect(probe.refreshes).toBe(applied);
  });

  it("releases the previous frontend rows once, then skips the idle repeat", () => {
    const probe = countRefreshes();
    const adapter = createMemoryAdapter("");
    const initialProps: { active: boolean; data: readonly Row[] } = {
      active: true,
      data: ROWS,
    };
    const { result, rerender } = renderHook(
      ({ active, data }: { active: boolean; data: readonly Row[] }) =>
        useFrontendData<Row>({
          data,
          active,
          urlAdapter: adapter,
          paginationMode: "paged",
          createEngine: probe.createEngine,
        }),
      { initialProps }
    );
    expect(result.current.total).toBe(3);
    const live = probe.refreshes;
    rerender({ active: false, data: IDLE_ROWS });
    expect(result.current.total).toBe(0);
    expect(result.current.allFilteredRows).toEqual([]);
    expect(probe.refreshes).toBe(live + 1);
    const idle = probe.refreshes;
    rerender({ active: false, data: IDLE_ROWS });
    expect(probe.refreshes).toBe(idle);
    expect(result.current.total).toBe(0);
  });

  it("refreshes an idle frontend source when a callback or filter key changes", () => {
    const probe = countRefreshes();
    const adapter = createMemoryAdapter("");
    const first = (row: Row) => row.name;
    const { rerender } = renderHook(
      ({
        getSearchText,
        filterKey,
      }: {
        getSearchText: (row: Row) => string;
        filterKey: number;
      }) =>
        useFrontendData<Row>({
          data: IDLE_ROWS,
          active: false,
          urlAdapter: adapter,
          paginationMode: "paged",
          createEngine: probe.createEngine,
          getSearchText,
          filterKey,
        }),
      { initialProps: { getSearchText: first, filterKey: 1 } }
    );
    const applied = probe.refreshes;
    rerender({ getSearchText: first, filterKey: 1 });
    expect(probe.refreshes).toBe(applied);
    rerender({ getSearchText: (row) => row.id, filterKey: 1 });
    expect(probe.refreshes).toBe(applied + 1);
    rerender({ getSearchText: (row) => row.id, filterKey: 2 });
    expect(probe.refreshes).toBe(applied + 2);
  });

  it("keeps a Strict Mode frontend mount on the committed rows", () => {
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(
      () =>
        useFrontendData<Row>({
          data: ROWS,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { wrapper: StrictMode }
    );
    expect(result.current.rows.map((row) => row.id)).toEqual(["a", "b", "c"]);
    expect(result.current.tableEngine?.rows("page")).toEqual(
      result.current.rows
    );
  });

  it("skips a repeat server render and still aborts on unmount", () => {
    const seen: AbortSignal[] = [];
    const onQueryChange = vi.fn(
      (_query: unknown, info: { signal: AbortSignal }) => {
        seen.push(info.signal);
      }
    );
    const adapter = createMemoryAdapter("");
    const watched = watchLength(ROWS);
    const { rerender, unmount } = renderHook(() =>
      useServerData<Row>({
        rows: watched.rows,
        total: 3,
        onQueryChange,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(seen[0]?.aborted).toBe(false);
    const reads = watched.reads;
    expect(reads).toBeGreaterThan(0);
    rerender();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(seen[0]?.aborted).toBe(false);
    expect(watched.reads).toBe(reads);
    unmount();
    expect(seen[0]?.aborted).toBe(true);
  });

  it("re-sends a server query when refetch bumps the revision", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("");
    const { result, rerender } = renderHook(() =>
      useServerData<Row>({
        rows: ROWS,
        total: 3,
        onQueryChange,
        urlAdapter: adapter,
        paginationMode: "paged",
      })
    );
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    rerender();
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    act(() => {
      result.current.refetch?.();
    });
    expect(onQueryChange).toHaveBeenCalledTimes(2);
    expect(onQueryChange.mock.calls[0]?.[1].signal.aborted).toBe(true);
    expect(onQueryChange.mock.calls[1]?.[1].signal.aborted).toBe(false);
  });

  it("keeps the frontend page across a server turn and does not abort on a repeat", () => {
    const onQueryChange = vi.fn();
    const adapter = createMemoryAdapter("page=2&limit=1");
    const { result, rerender } = renderHook(
      ({ mode }: { mode: "frontend" | "server" }) =>
        useTableData<Row>({
          data: ROWS,
          columns: [{ key: "name" }],
          mode,
          total: 3,
          onQueryChange,
          urlAdapter: adapter,
          paginationMode: "paged",
        }),
      { initialProps: { mode: "frontend" } }
    );
    expect(result.current.source.page).toBe(2);
    expect(onQueryChange).not.toHaveBeenCalled();
    rerender({ mode: "server" });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    const signal = onQueryChange.mock.calls[0]?.[1].signal as AbortSignal;
    expect(signal.aborted).toBe(false);
    rerender({ mode: "server" });
    expect(onQueryChange).toHaveBeenCalledTimes(1);
    expect(signal.aborted).toBe(false);
    rerender({ mode: "frontend" });
    expect(result.current.source.page).toBe(2);
    expect(result.current.source.rows.map((row) => row.id)).toEqual(["b"]);
    const afterReturn = onQueryChange.mock.calls.length;
    rerender({ mode: "frontend" });
    expect(onQueryChange.mock.calls).toHaveLength(afterReturn);
    expect(result.current.source.page).toBe(2);
  });
});

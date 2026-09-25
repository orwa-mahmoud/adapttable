/**
 * The find bar's state.
 */
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import { createMemoryAdapter } from "../url/adapter";
import {
  FIND_URL_WRITE_DEBOUNCE_MS,
  useFindFocus,
  useFindInTable,
} from "./useFindInTable";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Alan" },
  { id: "3", name: "Grace" },
];
const COLUMNS: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (row) => row.name },
];

beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
afterEach(() => vi.useRealTimers());

function flushUrl() {
  act(() => {
    vi.advanceTimersByTime(FIND_URL_WRITE_DEBOUNCE_MS + 10);
  });
}

const setup = (enabled = true, search = "") => {
  const urlAdapter = createMemoryAdapter(search);
  const hook = renderHook(() =>
    useFindInTable<Row>({
      enabled,
      rows: ROWS,
      columns: COLUMNS,
      urlAdapter,
    })
  );
  return { ...hook, urlAdapter };
};

describe("useFindInTable", () => {
  it("searches nothing until the bar is open", () => {
    const { result } = setup();
    act(() => {
      result.current.setQuery("a");
    });
    expect(result.current.matches).toHaveLength(0);
    act(() => {
      result.current.setOpen(true);
    });
    expect(result.current.matches).toHaveLength(3);
  });

  it("lands on the first hit and walks forward, wrapping", () => {
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    expect(result.current.current).toEqual({ row: 0, col: 0 });
    act(() => {
      result.current.next();
    });
    expect(result.current.current).toEqual({ row: 1, col: 0 });
    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(result.current.current).toEqual({ row: 0, col: 0 });
  });

  it("walks backwards too", () => {
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    act(() => {
      result.current.previous();
    });
    expect(result.current.index).toBe(2);
  });

  it("starts the walk again on a new query", () => {
    // Staying on hit 9 of the last search would land the user somewhere
    // unrelated to what they just typed.
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    act(() => {
      result.current.next();
    });
    expect(result.current.index).toBe(1);
    act(() => {
      result.current.setQuery("gr");
    });
    expect(result.current.index).toBe(0);
    expect(result.current.current).toEqual({ row: 2, col: 0 });
  });

  it("points at nothing when the query matches nothing", () => {
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("zzz");
    });
    expect(result.current.index).toBe(-1);
    expect(result.current.current).toBeNull();
  });

  it("clears the query when the bar closes", () => {
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
      result.current.setOpen(false);
    });
    expect(result.current.query).toBe("");
    expect(result.current.matchKeys.size).toBe(0);
  });

  it("clamps the walk when a narrower query leaves fewer hits", () => {
    const { result } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    act(() => {
      result.current.next();
    });
    expect(result.current.index).toBe(1);
    act(() => {
      result.current.setQuery("ada");
    });
    expect(result.current.index).toBe(0);
  });

  it("opens the bar through openBar, the way Ctrl/Cmd+F does", () => {
    const { result } = setup();
    expect(result.current.open).toBe(false);
    act(() => {
      result.current.openBar?.();
    });
    expect(result.current.open).toBe(true);
  });

  it("focuses and selects the current match", () => {
    const focusCell = vi.fn();
    const selectRange = vi.fn();
    let current: { row: number; col: number } | null = null;
    const { rerender } = renderHook(() =>
      useFindFocus(current, focusCell, selectRange)
    );
    expect(focusCell).not.toHaveBeenCalled();
    current = { row: 1, col: 0 };
    rerender();
    expect(focusCell).toHaveBeenCalledWith({ row: 1, col: 0 });
    expect(selectRange).toHaveBeenCalledWith({
      anchor: { row: 1, col: 0 },
      head: { row: 1, col: 0 },
    });
  });

  it("stays shut when the feature is off", () => {
    const { result } = setup(false);
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    expect(result.current.open).toBe(false);
    expect(result.current.matches).toHaveLength(0);
  });

  it("reopens from a find param and lands on the first hit", () => {
    const { result } = setup(true, "find=Ada&atv=1");
    expect(result.current.open).toBe(true);
    expect(result.current.query).toBe("Ada");
    expect(result.current.index).toBe(0);
    expect(result.current.current).toEqual({ row: 0, col: 0 });
  });

  it("writes the query with replace-state after a short debounce", () => {
    const { result, urlAdapter } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("Al");
    });
    expect(urlAdapter.getSearch()).not.toContain("find=");
    flushUrl();
    expect(urlAdapter.getSearch()).toContain("find=Al");
    expect(urlAdapter.getSearch()).toContain("atv=1");
  });

  it("drops the param when the bar closes", () => {
    const { result, urlAdapter } = setup(true, "find=Ada&atv=1");
    act(() => {
      result.current.setOpen(false);
    });
    flushUrl();
    expect(urlAdapter.getSearch()).not.toContain("find=");
    expect(result.current.query).toBe("");
    expect(result.current.open).toBe(false);
  });

  it("keeps the match index out of the URL", () => {
    const { result, urlAdapter } = setup();
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("a");
    });
    act(() => {
      result.current.next();
    });
    flushUrl();
    expect(result.current.index).toBe(1);
    expect(urlAdapter.getSearch()).toMatch(/find=a/);
    expect(urlAdapter.getSearch()).not.toMatch(/findIndex|findAt|match=/i);
  });

  it("adopts a find param applied from outside, the way Saved Views do", () => {
    const { result, urlAdapter } = setup();
    act(() => {
      urlAdapter.setSearch("find=Grace&atv=1");
    });
    expect(result.current.open).toBe(true);
    expect(result.current.query).toBe("Grace");
    expect(result.current.current).toEqual({ row: 2, col: 0 });
  });

  it("opens a closed bar when a matching find param arrives", () => {
    const { result, urlAdapter } = setup();
    act(() => {
      result.current.setQuery("Ada");
    });
    expect(result.current.open).toBe(false);
    act(() => {
      urlAdapter.setSearch("find=Ada&atv=1");
    });
    expect(result.current.open).toBe(true);
    expect(result.current.query).toBe("Ada");
  });

  it("starts closed when there is no URL adapter", () => {
    const { result } = renderHook(() =>
      useFindInTable<Row>({
        enabled: true,
        rows: ROWS,
        columns: COLUMNS,
      })
    );
    expect(result.current.open).toBe(false);
    expect(result.current.query).toBe("");
  });

  it("namespaces the param when the table has a urlKey", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useFindInTable<Row>({
        enabled: true,
        rows: ROWS,
        columns: COLUMNS,
        urlAdapter,
        urlKey: "edit",
      })
    );
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("Ada");
    });
    flushUrl();
    expect(urlAdapter.getSearch()).toContain("edit.find=Ada");
    expect(urlAdapter.getSearch()).not.toMatch(/(^|&)find=/);
  });

  it("keeps a closed bar's keystrokes out of the URL", () => {
    const { result, urlAdapter } = setup();
    act(() => {
      result.current.setQuery("Ada");
    });
    flushUrl();
    expect(urlAdapter.getSearch()).not.toContain("find=");
    expect(result.current.open).toBe(false);
  });

  it("does not write the host adapter when urlSync is off", () => {
    const urlAdapter = createMemoryAdapter("");
    const { result } = renderHook(() =>
      useFindInTable<Row>({
        enabled: true,
        rows: ROWS,
        columns: COLUMNS,
        urlAdapter,
        urlSync: false,
      })
    );
    act(() => {
      result.current.setOpen(true);
      result.current.setQuery("Ada");
    });
    flushUrl();
    expect(urlAdapter.getSearch()).toBe("");
  });

  it("coalesces a burst of keystrokes into one replace-state write", () => {
    const adapter = createMemoryAdapter("");
    const writes: { search: string; push?: boolean }[] = [];
    const spied = {
      ...adapter,
      setSearch: (search: string, options?: { push?: boolean }) => {
        writes.push({ search, push: options?.push });
        adapter.setSearch(search, options);
      },
    };
    const { result } = renderHook(() =>
      useFindInTable<Row>({
        enabled: true,
        rows: ROWS,
        columns: COLUMNS,
        urlAdapter: spied,
      })
    );
    act(() => {
      result.current.setOpen(true);
      for (const text of ["A", "Al", "Ala", "Alan"]) {
        result.current.setQuery(text);
      }
    });
    flushUrl();
    expect(writes).toHaveLength(1);
    expect(writes[0]!.search).toContain("find=Alan");
    expect(writes[0]!.push).not.toBe(true);
  });
});

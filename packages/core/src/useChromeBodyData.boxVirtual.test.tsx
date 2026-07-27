/**
 * A virtual window inside a maxHeight box extends itself at the BOX's
 * scroll end. The page-level affordances must therefore disappear: the
 * box never grows, so an IntersectionObserver sentinel below it would
 * stay visible and fire forever (the runaway `page=160` bug), and a
 * Load-more button appends rows the window doesn't even show.
 */
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useFrontendData } from "./source/useFrontendData";
import type { ColumnDef } from "./types";
import { createMemoryAdapter } from "./url/adapter";
import { useChromeBodyData, useTableChrome } from "./useTableChrome";

vi.mock("@tanstack/react-virtual", () => ({
  useWindowVirtualizer: vi.fn(),
  useVirtualizer: vi.fn(),
}));

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = Array.from({ length: 60 }, (_, i) => ({
  id: String(i),
  name: `Row ${i}`,
}));
const cols: ColumnDef<Row>[] = [{ key: "name" }];

const ACTIVE_WINDOW = {
  getVirtualItems: () => [{ index: 0, start: 0, end: 48, key: "0" }],
  getTotalSize: () => 2880,
  measureElement: vi.fn(),
  options: { scrollMargin: 0 },
};
const IDLE = {
  getVirtualItems: () => [],
  getTotalSize: () => 0,
  measureElement: vi.fn(),
  options: { scrollMargin: 0 },
};

function renderBody(maxHeight: number | undefined) {
  const adapter = createMemoryAdapter("");
  return renderHook(() => {
    const source = useFrontendData<Row>({
      data: ROWS,
      columns: cols,
      adapter,
      paginationMode: "infinite",
    });
    const props = {
      source,
      columns: cols,
      rowKey: (r: Row) => r.id,
      virtualize: true,
      maxHeight,
    };
    const chrome = useTableChrome<Row>(props);
    return useChromeBodyData(chrome, props);
  });
}

describe("box-virtual suppresses the page-level load-more affordances", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    vi.mocked(useVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useVirtualizer>
    );
  });

  it("an active window INSIDE a maxHeight box turns canLoadMore off", () => {
    vi.mocked(useVirtualizer).mockReturnValue(
      ACTIVE_WINDOW as unknown as ReturnType<typeof useVirtualizer>
    );
    const { result } = renderBody(380);
    expect(result.current.virtualization.enabled).toBe(true);
    expect(result.current.canLoadMore).toBe(false);
  });

  it("window-mode virtualization (no box) keeps the sentinel", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      ACTIVE_WINDOW as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    const { result } = renderBody(undefined);
    expect(result.current.virtualization.enabled).toBe(true);
    expect(result.current.canLoadMore).toBe(true);
  });
});

describe("useChromeBodyData with row grouping", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    vi.mocked(useVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useVirtualizer>
    );
  });

  it("windows groupingEntries and disables leaf row virtualization", () => {
    const groupedRows: Row[] = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
      { id: "3", name: "Cara" },
    ];
    const groupCols: ColumnDef<Row>[] = [
      { key: "name" },
      { key: "team", accessor: () => "A" },
    ];
    // Force every row into the same group via a constant accessor.
    groupCols[1] = { key: "team", accessor: () => "A" };

    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 0, start: 0, end: 48, key: "group:A" },
        { index: 1, start: 48, end: 96, key: "1" },
      ],
      getTotalSize: () => 400,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: groupedRows,
        columns: groupCols,
        adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: groupCols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        groupBy: "team",
      };
      const chrome = useTableChrome<Row>(props);
      return { chrome, body: useChromeBodyData(chrome, props) };
    });

    expect(result.current.chrome.grouping).toBeDefined();
    expect(result.current.body.groupingEntries).toBeDefined();
    expect(result.current.body.groupingEntries!).toHaveLength(2);
    // Leaf row virtualization is off while grouping is armed — the keyed
    // group window owns the spacers instead.
    expect(result.current.body.virtualization.rows).toEqual([]);
    expect(result.current.body.virtualization.enabled).toBe(true);
  });
});

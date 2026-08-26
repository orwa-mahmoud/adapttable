/**
 * A virtual window inside a maxHeight box extends itself at the BOX's
 * scroll end. The page-level affordances must therefore disappear: the
 * box never grows, so an IntersectionObserver sentinel below it would
 * stay visible and fire forever (the runaway `page=160` bug), and a
 * Load-more button appends rows the window doesn't even show.
 */
import { useVirtualizer, useWindowVirtualizer } from "@tanstack/react-virtual";
import { renderHook } from "@testing-library/react";
import { act } from "react";
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
      urlAdapter: adapter,
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

  it("window mode feeds TanStack the measured list offset as scrollMargin", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      ACTIVE_WINDOW as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    const { result } = renderBody(undefined);
    const box = document.createElement("div");
    const body = document.createElement("div");
    body.setAttribute("data-adapttable-part", "tbody");
    box.appendChild(body);
    vi.spyOn(body, "getBoundingClientRect").mockReturnValue({
      top: 280,
      left: 0,
      right: 0,
      bottom: 280,
      width: 0,
      height: 0,
      x: 0,
      y: 280,
      toJSON: () => ({}),
    });
    vi.spyOn(window, "scrollY", "get").mockReturnValue(20);

    act(() => {
      result.current.virtualScrollRef(box);
    });

    expect(useWindowVirtualizer).toHaveBeenCalledWith(
      expect.objectContaining({ scrollMargin: 300 })
    );
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
        urlAdapter: adapter,
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

describe("useChromeBodyData with tree data", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    vi.mocked(useVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useVirtualizer>
    );
  });

  it("windows the tree's entries instead of the source rows", () => {
    // A tree's visible list is its own — the row virtualizer counts source
    // rows, so without a keyed window over the entries a 50,000-row hierarchy
    // renders 50,000 rows.
    vi.mocked(useWindowVirtualizer).mockReturnValue({
      getVirtualItems: () => [
        { index: 0, start: 0, end: 48, key: "1" },
        { index: 1, start: 48, end: 96, key: "2" },
      ],
      getTotalSize: () => 400,
      measureElement: vi.fn(),
      options: { scrollMargin: 0 },
    } as unknown as ReturnType<typeof useWindowVirtualizer>);

    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        // Every row a child of the one before it: one deep chain, all open.
        getParentId: (row: Row) =>
          row.id === "0" ? undefined : String(Number(row.id) - 1),
        expandedIds: ROWS.map((row) => row.id),
      };
      const chrome = useTableChrome<Row>(props);
      return { chrome, body: useChromeBodyData(chrome, props) };
    });

    // One entry per row the source handed over — the whole walked tree.
    expect(result.current.chrome.tree?.entries).toHaveLength(
      result.current.chrome.source.rows.length
    );
    // The body renders the window, not the walked tree.
    expect(result.current.body.treeEntries).toHaveLength(2);
    // Leaf row virtualization is off while a tree is armed — the keyed entry
    // window owns the spacers instead.
    expect(result.current.body.virtualization.rows).toEqual([]);
    expect(result.current.body.virtualization.enabled).toBe(true);
  });

  it("leaves a flat table's rows to the row virtualizer", () => {
    const { result } = renderBody(undefined);
    expect(result.current.treeEntries).toBeUndefined();
  });
});

describe("useChromeBodyData rowHeight estimate", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    vi.mocked(useVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useVirtualizer>
    );
  });

  it("reads a per-row height on a flat table", () => {
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        rowHeight: (row: Row) => (row.id === "0" ? 80 : 40),
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    const estimate = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .estimateSize;
    expect(estimate(0)).toBe(80);
    expect(estimate(1)).toBe(40);
    expect(estimate(999)).toBe(56);
  });

  it("uses a constant height for every slot", () => {
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        rowHeight: 48,
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    const estimate = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .estimateSize;
    expect(estimate(0)).toBe(48);
    expect(estimate(9)).toBe(48);
  });

  it("skips group headers and extras when grouping is on", () => {
    const groupedRows: Row[] = [
      { id: "1", name: "Alice" },
      { id: "2", name: "Bob" },
    ];
    const groupCols: ColumnDef<Row>[] = [
      { key: "name" },
      { key: "team", accessor: () => "A" },
    ];
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: groupedRows,
        columns: groupCols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: groupCols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        groupBy: "team",
        rowHeight: (row: Row) => (row.id === "1" ? 90 : 40),
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    const estimate = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .estimateSize;
    // Index 0 is the group header — not a data row.
    expect(estimate(0)).toBe(56);
    expect(estimate(1)).toBe(90);
  });

  it("reads the walked tree entry at the virtualizer index", () => {
    const adapter = createMemoryAdapter("");
    renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS.slice(0, 3),
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        getParentId: (row: Row) =>
          row.id === "0" ? undefined : String(Number(row.id) - 1),
        expandedIds: ["0", "1", "2"],
        rowHeight: (row: Row) => (row.id === "1" ? 72 : 40),
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    const estimate = vi.mocked(useWindowVirtualizer).mock.calls.at(-1)![0]
      .estimateSize;
    expect(estimate(0)).toBe(40);
    expect(estimate(1)).toBe(72);
    expect(estimate(99)).toBe(56);
  });
});

describe("useChromeBodyData mobile card measurement", () => {
  beforeEach(() => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    vi.mocked(useVirtualizer).mockReturnValue(
      IDLE as unknown as ReturnType<typeof useVirtualizer>
    );
  });

  it("measures a mobile card as one element even when row detail is set", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      ACTIVE_WINDOW as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        forceMobile: true,
        renderRowDetail: () => "detail",
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    // Cards nest the detail inside the card, so the card is the item.
    expect(result.current.virtualization.measureElement).toBe(
      ACTIVE_WINDOW.measureElement
    );
    expect(result.current.virtualization.measureRowPair).toBeUndefined();
  });

  it("measures a desktop row as a pair when row detail is set", () => {
    vi.mocked(useWindowVirtualizer).mockReturnValue(
      ACTIVE_WINDOW as unknown as ReturnType<typeof useWindowVirtualizer>
    );
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        columns: cols,
        urlAdapter: adapter,
        paginationMode: "infinite",
      });
      const props = {
        source,
        columns: cols,
        rowKey: (r: Row) => r.id,
        virtualize: true as const,
        forceMobile: false,
        renderRowDetail: () => "detail",
      };
      const chrome = useTableChrome<Row>(props);
      return useChromeBodyData(chrome, props);
    });
    expect(result.current.virtualization.measureElement).toBeUndefined();
    expect(result.current.virtualization.measureRowPair).toBeDefined();
  });
});

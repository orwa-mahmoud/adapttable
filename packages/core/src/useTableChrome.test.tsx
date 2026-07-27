import { act, renderHook } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { buildTableCsv } from "./export/tableCsv";
import { useFrontendData } from "./source/useFrontendData";
import type { ColumnDef } from "./types";
import { createMemoryAdapter } from "./url/adapter";
import { useTableChrome } from "./useTableChrome";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const columns: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];

function mount(
  initial = "",
  opts: {
    rows?: readonly Row[];
    isLoading?: boolean;
    isMobile?: boolean;
    extraChips?: { key: string; label: string; onRemove: () => void }[];
    filterLabels?: Record<string, (v: string) => string>;
    activeFilterCount?: number;
    onRowsChange?: (rows: readonly Row[]) => void;
  } = {}
) {
  const adapter = createMemoryAdapter(initial);
  return renderHook(() => {
    const source = useFrontendData<Row>({
      data: opts.rows ?? ROWS,
      urlAdapter: adapter,
      columns,
      paginationMode: "paged",
      isLoading: opts.isLoading,
    });
    return useTableChrome<Row>({
      source,
      columns,
      rowKey: (r) => r.id,
      isMobile: opts.isMobile,
      extraChips: opts.extraChips,
      filterLabels: opts.filterLabels,
      activeFilterCount: opts.activeFilterCount,
      onRowsChange: opts.onRowsChange,
    });
  });
}

describe("useTableChrome", () => {
  it("resolves the desktop body and a paged footer with data", () => {
    const { result } = mount();
    expect(result.current.body).toBe("desktop");
    expect(result.current.isPaged).toBe(true);
    expect(result.current.showFooter).toBe(true);
    expect(result.current.isMobile).toBe(false);
  });

  it("reports the skeleton body while loading with no rows", () => {
    const { result } = mount("", { rows: [], isLoading: true });
    expect(result.current.body).toBe("skeleton");
    expect(result.current.showFooter).toBe(true);
  });

  it("reports the empty body when there are no rows", () => {
    const { result } = mount("", { rows: [] });
    expect(result.current.body).toBe("empty");
    expect(result.current.showFooter).toBe(false);
  });

  it("reports the mobile body when isMobile", () => {
    const { result } = mount("", { isMobile: true });
    expect(result.current.body).toBe("mobile");
  });

  it("merges label chips with extraChips and counts them", () => {
    const { result } = mount("f_status=Active", {
      filterLabels: { status: (v) => `Status: ${v}` },
      extraChips: [{ key: "x", label: "X", onRemove: vi.fn() }],
    });
    expect(result.current.mergedChips.map((c) => c.label)).toContain(
      "Status: Active"
    );
    expect(result.current.mergedChips.map((c) => c.label)).toContain("X");
    expect(result.current.activeFilterCount).toBe(
      result.current.mergedChips.length
    );
  });

  it("returns only extraChips when there are no label chips", () => {
    const { result } = mount("", {
      extraChips: [{ key: "x", label: "Only", onRemove: vi.fn() }],
    });
    expect(result.current.mergedChips.map((c) => c.label)).toEqual(["Only"]);
  });

  it("honours an explicit activeFilterCount override", () => {
    const { result } = mount("", { activeFilterCount: 7 });
    expect(result.current.activeFilterCount).toBe(7);
  });

  it("exposes the headless table and a getRowId", () => {
    const { result } = mount();
    expect(result.current.table.rows).toHaveLength(2);
    expect(result.current.getRowId(ROWS[0]!)).toBe("a");
    act(() => result.current.table.toggleSort("name"));
  });

  it("notifies callers when the materialized rows change", () => {
    const onRowsChange = vi.fn();
    const { rerender } = mount("", { onRowsChange });
    expect(onRowsChange).toHaveBeenLastCalledWith(ROWS);

    rerender();
    expect(onRowsChange).toHaveBeenCalledTimes(1);
  });

  it("grouping is a full-set view: footer numbers, select-all and CSV match the screen", () => {
    const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      name: `P${String(i + 1).padStart(2, "0")}-${i % 3 === 0 ? "A" : "B"}`,
    }));
    const adapter = createMemoryAdapter("limit=10");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: rows,
        urlAdapter: adapter,
        columns,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns,
        rowKey: (r) => r.id,
        groupBy: "name",
        bulkActions: [{ key: "del", label: "Delete", onClick: vi.fn() }],
      });
    });

    // The view facade presents the full filtered set as one page.
    expect(result.current.grouping).toBeDefined();
    expect(result.current.source.rows).toHaveLength(30);
    expect(result.current.table.pagination.totalPages).toBe(1);
    expect(result.current.table.pagination.fromIndex).toBe(1);
    expect(result.current.table.pagination.toIndex).toBe(30);
    expect(result.current.showFooter).toBe(true);

    // Select-all covers every rendered row, not the page slice.
    act(() => result.current.table.selection?.toggleAll());
    expect(result.current.table.selection?.selectedCount).toBe(30);

    // Page-scope CSV exports exactly the rendered set: header + 30 rows.
    const csv = buildTableCsv({
      source: result.current.source,
      columns: result.current.table.columns,
      scope: "page",
    });
    expect(csv.trim().split("\n")).toHaveLength(31);
  });

  it("typing in search does not rebuild the grouped model", () => {
    const rows: Row[] = Array.from({ length: 50 }, (_, i) => ({
      id: String(i),
      name: `P${i % 5}`,
    }));
    const adapter = createMemoryAdapter("");
    const stableRowKey = (r: Row) => r.id;
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: rows,
        urlAdapter: adapter,
        columns,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({
        source,
        columns,
        rowKey: stableRowKey,
        groupBy: "name",
      });
    });
    const before = result.current.grouping;
    expect(before).toBeDefined();
    // Uncommitted keystrokes re-render the table but must not rebuild the
    // O(filtered rows) grouped flat model.
    act(() => result.current.table.setSearchValue("p"));
    act(() => result.current.table.setSearchValue("p1"));
    expect(result.current.grouping).toBe(before);
  });

  it("CSV export columns are identical on desktop and mobile viewports", () => {
    const deviceCols: ColumnDef<Row>[] = [
      { key: "name", header: "Name" },
      { key: "id", header: "Ref", hideOnMobile: true },
    ];
    const build = (isMobile: boolean) => {
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() => {
        const source = useFrontendData<Row>({
          data: ROWS,
          urlAdapter: adapter,
          columns: deviceCols,
          paginationMode: "paged",
        });
        return useTableChrome<Row>({
          source,
          columns: deviceCols,
          rowKey: (r) => r.id,
          isMobile,
        });
      });
      return buildTableCsv({
        source: result.current.source,
        columns: result.current.columnLayout.visibleColumns,
        scope: "page",
      });
    };
    const desktop = build(false);
    const mobile = build(true);
    expect(mobile).toBe(desktop);
    // And the full exportable set is present — hideOnMobile is visual only.
    expect(desktop.split("\r\n")[0]).toBe("Name,Ref");
  });

  it("without grouping the source passes through untouched", () => {
    const rows: Row[] = Array.from({ length: 30 }, (_, i) => ({
      id: String(i + 1),
      name: `P${i + 1}`,
    }));
    const adapter = createMemoryAdapter("limit=10");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: rows,
        urlAdapter: adapter,
        columns,
        paginationMode: "paged",
      });
      return useTableChrome<Row>({ source, columns, rowKey: (r) => r.id });
    });
    expect(result.current.source.rows).toHaveLength(10);
    expect(result.current.table.pagination.totalPages).toBe(3);
  });

  it("does not loop when an uncontrolled inline handler stores the selection", () => {
    // The documented uncontrolled usage: an inline arrow (fresh identity
    // every render) that writes the ids straight into state. Keying the
    // observer effect on the handler identity made this recurse forever.
    const adapter = createMemoryAdapter("");
    const renders = { count: 0 };
    const received: string[][] = [];
    const { result } = renderHook(() => {
      renders.count += 1;
      // Fail fast (instead of starving the runner) if the loop returns.
      if (renders.count > 50) {
        throw new Error("selection observer feedback loop");
      }
      const [ids, setIds] = useState<readonly string[]>([]);
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        columns,
        paginationMode: "paged",
      });
      const chrome = useTableChrome<Row>({
        source,
        columns,
        rowKey: (r) => r.id,
        bulkActions: [{ key: "del", label: "Delete", onClick: vi.fn() }],
        onSelectionChange: (next) => {
          received.push(next);
          setIds(next);
        },
      });
      return { chrome, ids };
    });

    // Mount: the documented single fire with the empty selection, and no
    // feedback loop (initial render + the setIds([]) commit).
    expect(received).toEqual([[]]);
    expect(renders.count).toBeLessThanOrEqual(3);

    // One real selection change notifies exactly once more.
    const mounted = renders.count;
    act(() => result.current.chrome.table.selection?.toggle("a"));
    expect(received).toEqual([[], ["a"]]);
    expect(result.current.ids).toEqual(["a"]);
    // toggle commit + setIds re-render — never an unbounded cascade.
    expect(renders.count - mounted).toBeLessThanOrEqual(2);
  });
});

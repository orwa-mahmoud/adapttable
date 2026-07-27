import { act, render, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useFrontendData } from "../source/useFrontendData";
import type { BulkAction, ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { resetDevWarnings } from "../utils/devWarn";
import { useDataTable, type UseDataTableOptions } from "./useDataTable";

interface Row {
  id: string;
  name: string;
  city: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice", city: "Dubai" },
  { id: "b", name: "Bob", city: "Riyadh" },
];

const cols: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
  { key: "city", header: "City", accessor: (r) => r.city, align: "end" },
];

function mount(
  initial = "",
  opts: Partial<UseDataTableOptions<Row>> = {},
  frontendOpts: { paginationMode?: "paged" | "infinite" } = {}
) {
  const adapter = createMemoryAdapter(initial);
  const view = renderHook(() => {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      columns: cols,
      paginationMode: frontendOpts.paginationMode ?? "paged",
    });
    return useDataTable<Row>({
      source,
      columns: cols,
      rowKey: (r) => r.id,
      ...opts,
    });
  });
  return { adapter, ...view };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("useDataTable", () => {
  it("warns in dev about duplicate column keys (and not about unique ones)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    mount("", {
      columns: [...cols, { key: "name", header: "Name again" }],
    });
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('duplicate column key "name"')
    );
    warn.mockClear();
    resetDevWarnings();
    mount();
    expect(warn).not.toHaveBeenCalled();
    resetDevWarnings();
    vi.restoreAllMocks();
  });

  it("exposes rows, columns, labels, and pagination", () => {
    const { result } = mount();
    expect(result.current.rows.map((r) => r.id)).toEqual(["a", "b"]);
    expect(result.current.columns).toHaveLength(2);
    expect(result.current.labels.search).toBe("Search");
    expect(result.current.pagination.totalPages).toBe(1);
    expect(result.current.isEmpty).toBe(false);
  });

  it("merges label overrides", () => {
    const { result } = mount("", { labels: { search: "Buscar" } });
    expect(result.current.labels.search).toBe("Buscar");
  });

  it("filters columns by layout (explicit hideOnMobile always wins)", () => {
    const mobileCols: ColumnDef<Row>[] = [
      ...cols,
      { key: "x", header: "X", hideOnMobile: true },
    ];
    const { result } = mount("", { columns: mobileCols, forceMobile: true });
    // x sits inside the identity-anchor window, but its explicit hide wins.
    expect(result.current.columns.map((c) => c.key)).toEqual(["name", "city"]);
  });

  it("toggleSort cycles asc → desc → cleared through the source", () => {
    const { result, adapter } = mount();
    act(() => result.current.toggleSort("name"));
    expect(adapter.getSearch()).toContain("sortDir=asc");
    act(() => result.current.toggleSort("name"));
    expect(adapter.getSearch()).toContain("sortDir=desc");
    act(() => result.current.toggleSort("name"));
    expect(adapter.getSearch()).not.toContain("sortBy");
  });

  it("debounces the search input and commits to the source", () => {
    const { result, adapter } = mount();
    act(() => result.current.setSearchValue("ali"));
    expect(adapter.getSearch()).not.toContain("q=ali");
    act(() => vi.advanceTimersByTime(300));
    expect(adapter.getSearch()).toContain("q=ali");
  });

  it("derives filter chips and an active count from filterLabels", () => {
    const { result } = mount("f_status=Active,Planned", {
      columns: cols,
      filterLabels: { status: (v) => `Status: ${v}` },
    });
    // status isn't an array key here, so it's a single scalar chip.
    expect(result.current.activeFilterCount).toBeGreaterThan(0);
    expect(result.current.filterChips[0]?.label).toContain("Status:");
  });

  it("enables selection only when bulk actions are configured", () => {
    const noBulk = mount();
    expect(noBulk.result.current.selection).toBeNull();

    const bulkActions: BulkAction[] = [
      { key: "del", label: "Delete", onClick: vi.fn() },
    ];
    const withBulk = mount("", { bulkActions });
    expect(withBulk.result.current.selection).not.toBeNull();
    act(() => withBulk.result.current.selection?.toggleAll());
    expect(withBulk.result.current.selection?.selectedCount).toBe(2);
  });

  it("keeps the id-based selection across page changes", () => {
    const bulkActions: BulkAction[] = [
      { key: "del", label: "Delete", onClick: vi.fn() },
    ];
    const { result } = mount("limit=1", { bulkActions });
    act(() => result.current.selection?.toggle("a"));
    expect(result.current.selection?.selectedCount).toBe(1);
    act(() => result.current.source.setPage(2));
    // Selection survives the page navigation (it is keyed by row id).
    expect(result.current.selection?.isSelected("a")).toBe(true);
  });

  it("resets the selection when the search term changes", () => {
    const bulkActions: BulkAction[] = [
      { key: "del", label: "Delete", onClick: vi.fn() },
    ];
    const { result } = mount("", { bulkActions });
    act(() => result.current.selection?.toggle("a"));
    expect(result.current.selection?.selectedCount).toBe(1);
    act(() => result.current.source.setSearch("zzz"));
    expect(result.current.selection?.selectedCount).toBe(0);
  });

  describe("prop-getters", () => {
    it("getTableProps carries role, dir and aria-label", () => {
      const { result } = mount("", { dir: "rtl", tableLabel: "People" });
      const props = result.current.getTableProps();
      expect(props.role).toBe("table");
      expect(props.dir).toBe("rtl");
      expect(props["aria-label"]).toBe("People");
    });

    it("getHeaderRowProps carries the row role and merges overrides", () => {
      const { result } = mount();
      expect(result.current.getHeaderRowProps().role).toBe("row");
      const props = result.current.getHeaderRowProps({ className: "head" });
      expect(props.role).toBe("row");
      expect(props.className).toBe("head");
    });

    it("getHeaderCellProps reports aria-sort and alignment", () => {
      const { result } = mount("sortBy=name&sortDir=asc");
      const sorted = result.current.getHeaderCellProps(cols[0]!);
      expect(sorted["aria-sort"]).toBe("ascending");
      const plain = result.current.getHeaderCellProps(cols[1]!);
      expect(plain["aria-sort"]).toBeUndefined();
      expect((plain.style as { textAlign: string }).textAlign).toBe("end");
    });

    it("reports 'descending' aria-sort for a desc-sorted column", () => {
      const { result } = mount("sortBy=name&sortDir=desc");
      expect(result.current.getHeaderCellProps(cols[0]!)["aria-sort"]).toBe(
        "descending"
      );
    });

    it("defaults.sortBy alone sorts, reports aria-sort, and cycles on click", () => {
      const adapter = createMemoryAdapter("");
      const { result } = renderHook(() => {
        const source = useFrontendData<Row>({
          data: [...ROWS].reverse(),
          urlAdapter: adapter,
          columns: cols,
          paginationMode: "paged",
          defaults: { sortBy: "name" },
        });
        return useDataTable<Row>({
          source,
          columns: cols,
          rowKey: (r) => r.id,
        });
      });
      // Data is actually ordered ascending, and the header says so.
      expect(result.current.rows.map((r) => r.name)).toEqual(["Alice", "Bob"]);
      expect(result.current.getHeaderCellProps(cols[0]!)["aria-sort"]).toBe(
        "ascending"
      );
      // First click cycles to descending instead of clearing.
      act(() => result.current.toggleSort("name"));
      expect(result.current.sortDir).toBe("desc");
      expect(result.current.rows.map((r) => r.name)).toEqual(["Bob", "Alice"]);
    });

    it("maps center alignment to a centered cell", () => {
      const { result } = mount();
      const centered: ColumnDef<Row> = {
        key: "c",
        header: "C",
        accessor: (r) => r.name,
        align: "center",
      };
      const style = result.current.getCellProps(centered).style as {
        textAlign: string;
      };
      expect(style.textAlign).toBe("center");
    });

    it("getHeaderCellProps reports 'none' for an unsorted sortable column", () => {
      const { result } = mount();
      expect(result.current.getHeaderCellProps(cols[0]!)["aria-sort"]).toBe(
        "none"
      );
    });

    it("getSortButtonProps fires toggleSort and disables non-sortable", () => {
      const { result, adapter } = mount();
      const props = result.current.getSortButtonProps(cols[0]!);
      act(() => props.onClick());
      expect(adapter.getSearch()).toContain("sortBy=name");

      const disabled = result.current.getSortButtonProps(cols[1]!);
      expect(disabled.disabled).toBe(true);
      act(() => disabled.onClick());
      expect(adapter.getSearch()).not.toContain("sortBy=city");
    });

    it("getRowProps sets aria-selected only when selection is active", () => {
      const { result } = mount("", {
        bulkActions: [{ key: "d", label: "D", onClick: vi.fn() }],
      });
      const props = result.current.getRowProps(ROWS[0]!, 0);
      expect(props["aria-selected"]).toBe(false);
      expect(props["data-index"]).toBe(0);
    });

    it("getCellProps applies logical (RTL-aware) alignment", () => {
      const { result } = mount();
      const props = result.current.getCellProps(cols[1]!);
      expect(props.style?.textAlign).toBe("end");
    });

    it("getSearchInputProps wires value + onChange", () => {
      const { result } = mount();
      const props = result.current.getSearchInputProps();
      expect(props.type).toBe("search");
      act(() =>
        props.onChange({
          currentTarget: { value: "z" },
        })
      );
      expect(result.current.searchValue).toBe("z");
    });

    it("prop-getters merge caller overrides", () => {
      const { result } = mount();
      const extra = vi.fn();
      const props = result.current.getTableProps({
        className: "mine",
        onClick: extra,
      });
      expect(props.className).toBe("mine");
      (props.onClick as () => void)();
      expect(extra).toHaveBeenCalled();
    });
  });

  it("reports isEmpty when there are no rows", () => {
    const adapter = createMemoryAdapter("q=zzz");
    const { result } = renderHook(() => {
      const source = useFrontendData<Row>({
        data: ROWS,
        urlAdapter: adapter,
        paginationMode: "paged",
      });
      return useDataTable<Row>({ source, columns: cols, rowKey: (r) => r.id });
    });
    expect(result.current.isEmpty).toBe(true);
  });

  it("resolves bare-key columns to real headers and cell content", () => {
    const { result } = mount("", {
      columns: [{ key: "name" }, { key: "city" }],
    });
    expect(result.current.columns.map((c) => c.header)).toEqual([
      "Name",
      "City",
    ]);
    expect(
      result.current.getCellContent(result.current.columns[0]!, ROWS[0]!, 0)
    ).toBe("Alice");
  });

  it("resolves per-column i18n data paths from the locale option", () => {
    interface Localized {
      id: string;
      name: string;
      name_ar: string;
    }
    const rows: Localized[] = [{ id: "a", name: "Alice", name_ar: "أليس" }];
    const adapter = createMemoryAdapter("");
    const { result } = renderHook(() => {
      const source = useFrontendData<Localized>({
        data: rows,
        urlAdapter: adapter,
        paginationMode: "paged",
      });
      return useDataTable<Localized>({
        source,
        columns: [{ key: "name", i18n: { ar: "name_ar" } }],
        rowKey: (r) => r.id,
        locale: "ar",
      });
    });
    const column = result.current.columns[0]!;
    expect(result.current.getCellContent(column, rows[0]!, 0)).toBe("أليس");
  });

  it("renders a Cell component through getCellContent", () => {
    const Cell = ({ row, rowIndex }: { row: Row; rowIndex: number }) => (
      <em>
        {row.name}#{rowIndex}
      </em>
    );
    const { result } = mount("", {
      columns: [{ key: "name", header: "Name", Cell }],
    });
    const content = result.current.getCellContent(
      result.current.columns[0]!,
      ROWS[0]!,
      1
    );
    const { container } = render(<>{content}</>);
    expect(container.querySelector("em")?.textContent).toBe("Alice#1");
  });

  it("keeps getRowProps spread-clean and the key in getRowKey", () => {
    const { result } = mount();
    const rowProps = result.current.getRowProps(ROWS[0]!, 0);
    expect("key" in rowProps).toBe(false);
    expect(result.current.getRowKey(ROWS[0]!)).toBe("a");

    // Spreading the result into JSX must not trigger React's spread-key
    // warning (the exact failure headless consumers had to code around).
    const errorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => undefined);
    try {
      render(
        <table>
          <thead>
            <tr>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            <tr key={result.current.getRowKey(ROWS[0]!)} {...rowProps}>
              <td>x</td>
            </tr>
          </tbody>
        </table>
      );
      const spreadKeyComplaints = errorSpy.mock.calls.filter((call) =>
        String(call[0]).includes("key")
      );
      expect(spreadKeyComplaints).toEqual([]);
    } finally {
      errorSpy.mockRestore();
    }
  });
});

/**
 * Gap-fill for useDataTable — pins the lighter prop-getter branches the
 * main suite skips: default aria-label, non-string header → key, custom
 * selectionGetId, and aria-selected omitted when selection is inactive.
 */
import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { useFrontendData } from "../source/useFrontendData";
import type { BulkAction, ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { useDataTable, type UseDataTableOptions } from "./useDataTable";

interface Row {
  id: string;
  name: string;
}
const ROWS: Row[] = [{ id: "a", name: "Alice" }];
const cols: ColumnDef<Row>[] = [{ key: "name", header: "Name" }];

function mount(opts: Partial<UseDataTableOptions<Row>> = {}) {
  const adapter = createMemoryAdapter();
  return renderHook(() => {
    const source = useFrontendData<Row>({
      data: ROWS,
      urlAdapter: adapter,
      paginationMode: "paged",
    });
    return useDataTable<Row>({
      source,
      columns: cols,
      rowKey: (r) => r.id,
      ...opts,
    });
  });
}

describe("useDataTable — gap fill", () => {
  it("getTableProps falls back to the table label when no tableLabel", () => {
    const { result } = mount();
    expect(result.current.getTableProps()["aria-label"]).toBe("Data table");
  });

  it("getSortButtonProps uses the column key when the header isn't a string", () => {
    const nodeCols: ColumnDef<Row>[] = [
      { key: "name", header: <span>Name</span>, sortable: true },
    ];
    const { result } = mount({ columns: nodeCols });
    const props = result.current.getSortButtonProps(nodeCols[0]!);
    expect(props["aria-label"]).toBe("Sort by: name");
  });

  it("honours a custom selectionGetId", () => {
    const bulkActions: BulkAction[] = [
      { key: "d", label: "D", onClick: vi.fn() },
    ];
    const getId = vi.fn((r: Row) => `row-${r.id}`);
    const { result } = mount({ bulkActions, selectionGetId: getId });
    result.current.getRowProps(ROWS[0]!, 0);
    expect(getId).toHaveBeenCalledWith(ROWS[0]);
  });

  it("getRowProps omits aria-selected when selection is inactive", () => {
    const { result } = mount();
    expect(
      result.current.getRowProps(ROWS[0]!, 0)["aria-selected"]
    ).toBeUndefined();
  });
});

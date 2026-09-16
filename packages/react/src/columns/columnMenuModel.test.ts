import {
  type ColumnMenuAction,
  columnMenuActions,
  type ColumnMenuItem,
  columnMenuLabel,
  columnMenuRows,
  defaultLabels,
  filterColumnMenuRows,
  hideAllColumns,
  nextPinSide,
  pinActionLabel,
  resetColumnLayout,
  showAllColumns,
  unpinAllColumns,
} from "@adapttable/core";
import { describe, expect, it, vi } from "vitest";

import type { ColumnDef } from "../columnDef";
import type { UseColumnLayoutResult } from "./useColumnLayout";

interface Row {
  id: string;
}

function action(
  items: readonly ColumnMenuItem[],
  id: string
): ColumnMenuAction {
  const item = items.find((candidate) => candidate.id === id);
  if (!item || "kind" in item) throw new Error(`Missing action: ${id}`);
  return item;
}

const cols: ColumnDef<Row>[] = [
  { key: "a", header: "Alpha", accessor: (r) => r.id },
  { key: "b", header: "Bravo", accessor: (r) => r.id },
  { key: "c", header: 123, mobileLabel: "Charlie" },
  { key: "d", header: 456 },
];

function layout(
  hidden: string[],
  pinned: Record<string, "start" | "end"> = {}
): UseColumnLayoutResult<Row> {
  const visible = cols.filter((c) => !hidden.includes(c.key));
  return {
    state: { hidden, order: [], pinned, widths: {} },
    visibleColumns: visible,
    isHidden: (k) => hidden.includes(k),
    setHidden: () => undefined,
    toggleVisible: () => undefined,
    setPinned: () => undefined,
    move: () => undefined,
    setOrder: () => undefined,
    setWidth: () => undefined,
    setName: () => undefined,
    resetName: () => undefined,
    pinOffset: () => undefined,
    reset: () => undefined,
    toggleColumnGroup: () => undefined,
  };
}

describe("columnMenuLabel", () => {
  it("uses the header string, then mobileLabel, then key", () => {
    expect(columnMenuLabel(cols[0]!)).toBe("Alpha");
    expect(columnMenuLabel(cols[2]!)).toBe("Charlie");
    expect(columnMenuLabel(cols[3]!)).toBe("d");
  });
});

describe("columnMenuRows", () => {
  it("keeps every column in declared order — hiding does not reorder", () => {
    const rows = columnMenuRows(cols, layout(["b"], { a: "start" }));
    expect(rows.map((r) => r.key)).toEqual(["a", "b", "c", "d"]);
    expect(rows[0]!.pinned).toBe("start");
    expect(rows[0]!.index).toBe(0);
    // Bravo is hidden but stays in position 1 with a stable reorder index.
    const bravo = rows[1]!;
    expect(bravo.key).toBe("b");
    expect(bravo.hidden).toBe(true);
    expect(bravo.index).toBe(1);
  });

  it("honors an explicit column order including hidden columns", () => {
    const l = layout(["a"]);
    l.state = { ...l.state, order: ["c", "a", "b", "d"] };
    const rows = columnMenuRows(cols, l);
    expect(rows.map((r) => r.key)).toEqual(["c", "a", "b", "d"]);
    expect(rows[1]!.key).toBe("a");
    expect(rows[1]!.hidden).toBe(true);
  });
});

describe("pin toggle helpers", () => {
  const labels = { pinStart: "Pin to start", unpin: "Unpin" };

  it("toggles a data column none ↔ start (never end)", () => {
    expect(nextPinSide(undefined)).toBe("start");
    expect(nextPinSide("start")).toBeUndefined();
  });

  it("labels the NEXT action so the accessible name matches behaviour", () => {
    expect(pinActionLabel(undefined, labels)).toBe("Pin to start");
    expect(pinActionLabel("start", labels)).toBe("Unpin");
  });
});

describe("column menu 2.0", () => {
  const locked: ColumnDef<Row>[] = [
    {
      key: "a",
      header: "Alpha",
      accessor: (r) => r.id,
      lockVisibility: true,
      lockPin: true,
      lockPosition: true,
      lockWidth: true,
    },
    {
      key: "b",
      header: "Bravo",
      accessor: (r) => r.id,
      sortable: true,
      renameable: true,
    },
    { key: "c", header: "Charlie", accessor: (r) => r.id, filter: "text" },
  ];

  it("marks lock and capability flags on each row", () => {
    const rows = columnMenuRows(locked, layout([]));
    expect(rows[0]).toMatchObject({
      canMove: false,
      canHide: false,
      canPin: false,
      canResize: false,
    });
    expect(rows[1]).toMatchObject({
      canSort: true,
      canFilter: false,
      canRename: true,
    });
    expect(rows[2]).toMatchObject({ canSort: false, canFilter: true });
  });

  it("filters the chooser by name or key", () => {
    const rows = columnMenuRows(cols, layout([]));
    expect(filterColumnMenuRows(rows, "br").map((r) => r.key)).toEqual(["b"]);
    expect(filterColumnMenuRows(rows, "d").map((r) => r.key)).toEqual(["d"]);
    expect(filterColumnMenuRows(rows, "  ").map((r) => r.key)).toEqual([
      "a",
      "b",
      "c",
      "d",
    ]);
  });

  it("bulk show/hide/unpin skip locked columns", () => {
    const setHidden = vi.fn();
    const setPinned = vi.fn();
    const hidden = layout(["b"], { a: "start", b: "start" });
    hidden.setHidden = setHidden;
    const shown = layout([], { a: "start", b: "start" });
    shown.setHidden = setHidden;
    shown.setPinned = setPinned;
    showAllColumns(columnMenuRows(locked, hidden), hidden);
    expect(setHidden).toHaveBeenCalledWith("b", false);
    expect(setHidden).not.toHaveBeenCalledWith("a", false);
    hideAllColumns(columnMenuRows(locked, shown), shown);
    expect(setHidden).toHaveBeenCalledWith("b", true);
    expect(setHidden).not.toHaveBeenCalledWith("a", true);
    unpinAllColumns(columnMenuRows(locked, shown), shown);
    expect(setPinned).toHaveBeenCalledWith("b", undefined);
    expect(setPinned).not.toHaveBeenCalledWith("a", undefined);
  });

  it("reset one column clears hide, pin, width and a custom name", () => {
    const setHidden = vi.fn();
    const setPinned = vi.fn();
    const setWidth = vi.fn();
    const resetName = vi.fn();
    const l = layout(["b"], { b: "start" });
    l.state = { ...l.state, names: { b: "Owner" } };
    l.setHidden = setHidden;
    l.setPinned = setPinned;
    l.setWidth = setWidth;
    l.resetName = resetName;
    const row = columnMenuRows(locked, l)[1]!;
    resetColumnLayout(row, l);
    expect(setHidden).toHaveBeenCalledWith("b", false);
    expect(setPinned).toHaveBeenCalledWith("b", undefined);
    expect(setWidth).toHaveBeenCalledWith("b", undefined);
    expect(resetName).toHaveBeenCalledWith("b");
  });

  it("builds a submenu that sorts, filters and resets", () => {
    const onSortColumn = vi.fn();
    const onFilterColumn = vi.fn();
    const onAutoSizeColumn = vi.fn();
    const onBeginRename = vi.fn();
    const l = layout([]);
    const rows = columnMenuRows(locked, l);
    const sortActs = columnMenuActions(rows[1]!, {
      labels: defaultLabels,
      layout: l,
      onSortColumn,
      onAutoSizeColumn,
      onBeginRename,
    });
    expect(sortActs.map((a) => a.id)).toEqual(
      expect.arrayContaining([
        "sort-asc",
        "pin-start",
        "pin-end",
        "rename",
        "reset",
      ])
    );
    action(sortActs, "sort-asc").run();
    expect(onSortColumn).toHaveBeenCalledWith("b", "asc");
    action(sortActs, "sort-desc").run();
    expect(onSortColumn).toHaveBeenCalledWith("b", "desc");
    action(sortActs, "rename").run();
    expect(onBeginRename).toHaveBeenCalledOnce();
    const filterActs = columnMenuActions(rows[2]!, {
      labels: defaultLabels,
      layout: l,
      onFilterColumn,
    });
    action(filterActs, "filter").run();
    expect(onFilterColumn).toHaveBeenCalledWith("c");
  });

  it("runs pin, hide, autosize and reset from the submenu", () => {
    const setPinned = vi.fn();
    const toggleVisible = vi.fn();
    const setHidden = vi.fn();
    const setWidth = vi.fn();
    const onAutoSizeColumn = vi.fn();
    const l = layout(["b"], { b: "start" });
    l.setPinned = setPinned;
    l.toggleVisible = toggleVisible;
    l.setHidden = setHidden;
    l.setWidth = setWidth;
    const row = columnMenuRows(locked, l)[1]!;
    const acts = columnMenuActions(row, {
      labels: defaultLabels,
      layout: l,
      onAutoSizeColumn,
    });
    action(acts, "pin-start").run();
    expect(setPinned).toHaveBeenCalledWith("b", "start");
    action(acts, "pin-end").run();
    expect(setPinned).toHaveBeenCalledWith("b", "end");
    action(acts, "unpin").run();
    expect(setPinned).toHaveBeenCalledWith("b", undefined);
    action(acts, "show").run();
    expect(toggleVisible).toHaveBeenCalledWith("b");
    action(acts, "auto-size").run();
    expect(onAutoSizeColumn).toHaveBeenCalledWith("b");
    action(acts, "reset").run();
    expect(setHidden).toHaveBeenCalledWith("b", false);
    expect(setPinned).toHaveBeenCalledWith("b", undefined);
    expect(setWidth).toHaveBeenCalledWith("b", undefined);
  });
});

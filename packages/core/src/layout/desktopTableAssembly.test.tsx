import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultConfirm } from "../actions/confirm";
import { REORDER_COLUMN_WIDTH } from "../rows/rowReorder";
import { useFrontendData } from "../source/useFrontendData";
import { tableRenderModel } from "../tableRenderProps";
import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import {
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  desktopChromeMetrics,
  desktopHasPinned,
  desktopPinSignature,
  desktopRowMeasureRef,
  desktopRowWiringEqual,
  desktopScrollBoxStyle,
  type DesktopRowWiring,
  useDesktopTableAssembly,
} from "./desktopTableAssembly";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
];
const cols: ColumnDef<Row>[] = [
  { key: "name", header: "Name", accessor: (r) => r.name, sortable: true },
];

function useChrome() {
  const source = useFrontendData<Row>({
    data: ROWS,
    columns: cols,
    urlAdapter: createMemoryAdapter(""),
    paginationMode: "paged",
  });
  return useTableChrome<Row>({
    source,
    columns: cols,
    rowKey: (r) => r.id,
  });
}

describe("desktopChromeMetrics", () => {
  it("counts injected columns in pin leads and min-width", () => {
    const metrics = desktopChromeMetrics({
      expandable: true,
      showReorder: true,
      hasSelection: true,
      showActions: true,
    });
    expect(metrics.leads.start).toBe(
      DESKTOP_EXPANSION_WIDTH + REORDER_COLUMN_WIDTH + DESKTOP_SELECTION_WIDTH
    );
    expect(metrics.leads.end).toBe(DESKTOP_ACTIONS_WIDTH);
    expect(metrics.extraMinWidth).toBe(
      DESKTOP_EXPANSION_WIDTH +
        REORDER_COLUMN_WIDTH +
        DESKTOP_SELECTION_WIDTH +
        DESKTOP_ACTIONS_WIDTH
    );
  });

  it("can keep the expand column out of pin leads", () => {
    const metrics = desktopChromeMetrics({
      expandable: true,
      showReorder: false,
      hasSelection: true,
      showActions: false,
      widths: { selection: 44, includeExpansionInLeads: false },
    });
    expect(metrics.leads.start).toBe(44);
    expect(metrics.expansionLead).toBe(0);
  });
});

describe("desktopHasPinned / desktopScrollBoxStyle / desktopPinSignature", () => {
  it("detects a pinned data column", () => {
    expect(
      desktopHasPinned(
        [{ key: "name" }],
        (key) => (key === "name" ? { side: "start", inset: 0 } : undefined),
        false,
        false
      )
    ).toBe(true);
    expect(
      desktopHasPinned([{ key: "name" }], () => undefined, false, false)
    ).toBe(false);
    expect(
      desktopHasPinned([{ key: "name" }], () => undefined, true, false)
    ).toBe(true);
  });

  it("scrolls both axes only inside a maxHeight box", () => {
    expect(desktopScrollBoxStyle(320, false)).toEqual({
      maxHeight: 320,
      overflowX: "auto",
      overflowY: "auto",
    });
    expect(desktopScrollBoxStyle(undefined, true)).toEqual({
      overflowX: "auto",
    });
    expect(desktopScrollBoxStyle(undefined, false)).toBeUndefined();
  });

  it("fingerprints pin side and inset", () => {
    expect(
      desktopPinSignature([{ key: "name" }, { key: "age" }], (key) =>
        key === "name" ? { side: "start", inset: 12 } : undefined
      )
    ).toBe("name:start:12|");
  });
});

describe("desktopRowMeasureRef", () => {
  it("skips pinned rows and prefers the pair measurer", () => {
    const measure = () => undefined;
    const pairRef = () => undefined;
    const pair = { row: () => pairRef, detail: () => pairRef };
    expect(desktopRowMeasureRef("top", pair, 2, measure)).toBeUndefined();
    expect(desktopRowMeasureRef(undefined, pair, 2, measure)).toBe(pairRef);
    expect(desktopRowMeasureRef(undefined, undefined, 0, measure)).toBe(
      measure
    );
  });
});

describe("desktopRowWiringEqual", () => {
  it("ignores callback identity and compares visual fields", () => {
    const base = {
      row: ROWS[0],
      index: 0,
      id: "a",
      selected: false,
      expanded: undefined,
      columns: cols,
      spanSignature: "",
      labels: { cancel: "Cancel" },
      showActions: false,
      showReorder: false,
      reorderSignature: null,
      rowPinSignature: null,
      rowPinSide: undefined,
      pinRowSticky: true,
      rowPinOffset: 0,
      sourceIndex: 0,
      reorderPinned: false,
      rowActions: undefined,
      rowActionsLayout: undefined,
      cellSpanAppearance: undefined,
      renderRowActions: undefined,
      columnSpan: 1,
      columnWidths: undefined,
      pinSignature: "",
      hasStartPin: false,
      hasEndPin: false,
      actionsPinned: false,
      rowClass: undefined,
      rowStyleSignature: "",
      clickable: false,
      hasPrefetch: false,
      editingSignature: null,
      gridFocus: undefined,
      treeColumnKey: undefined,
      treeEntry: undefined,
      onRowClick: () => undefined,
    } as unknown as DesktopRowWiring<Row>;
    const next = {
      ...base,
      onRowClick: () => undefined,
      onToggleSelect: () => undefined,
    };
    expect(desktopRowWiringEqual(base, next)).toBe(true);
    expect(desktopRowWiringEqual(base, { ...next, selected: true })).toBe(
      false
    );
  });
});

describe("useDesktopTableAssembly", () => {
  it("calls tableRenderModel and exposes the same prelude", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      const assembly = useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
      });
      const model = tableRenderModel({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
      });
      return { assembly, model };
    });
    expect(result.current.assembly.model.columnSpan).toBe(
      result.current.model.columnSpan
    );
    expect(result.current.assembly.model.entries.map((e) => e.key)).toEqual([
      "a",
      "b",
    ]);
    expect(result.current.assembly.bodySlots.map((s) => s.kind)).toEqual([
      "row",
      "row",
    ]);
  });

  it("injects selection, expand, reorder and actions into leading/trailing", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
        rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
        renderRowDetail: (row) => row.name,
        expansion: {
          expandedIds: new Set<string>(),
          isExpanded: () => false,
          toggle: () => undefined,
        },
        rowReorder: {
          lifted: null,
          overIndex: null,
          isLifted: () => false,
          rowAttrs: () => undefined,
          dropProps: () => ({}),
        } as never,
      });
    });
    expect(result.current.header.leading.expand).toBe(true);
    expect(result.current.header.leading.reorder).toBe(true);
    expect(result.current.header.trailing.actions).toBe(true);
    expect(result.current.model.showActions).toBe(true);
    expect(result.current.model.showReorder).toBe(true);
  });

  it("assembles header sort/resize/filter state", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
        setWidth: () => undefined,
        headerFilters: true,
        filterDefs: [{ key: "name", type: "text" }],
      });
    });
    const leaf = result.current.header.leaf(cols[0]!, 0);
    expect(leaf.column.key).toBe("name");
    expect(leaf.resizeHandleProps?.role).toBe("button");
    expect(leaf.headerDef?.key).toBe("name");
    expect(leaf.sortButtonProps.type).toBe("button");
    expect(leaf.caption).toBe("Name");
  });

  it("inserts virtual padding and extra rows around data", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
        paddingTop: 40,
        paddingBottom: 20,
        extraRows: [
          {
            key: "note",
            kind: "fullWidth",
            beforeRowId: "b",
            render: () => "x",
          },
        ],
      });
    });
    expect(result.current.bodySlots.map((s) => `${s.kind}:${s.key}`)).toEqual([
      "virtualPad:pad-top",
      "row:a",
      "extra:note",
      "row:b",
      "virtualPad:pad-bottom",
    ]);
    const extra = result.current.bodySlots.find((s) => s.kind === "extra");
    expect(extra?.kind === "extra" && extra.extraKind).toBe("fullWidth");
    expect(extra?.kind === "extra" && extra.colSpan).toBe(
      result.current.model.columnSpan
    );
  });

  it("spreads getRowProps onto each row slot", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
      });
    });
    const row = result.current.bodySlots.find((s) => s.kind === "row");
    expect(row?.kind).toBe("row");
    if (row?.kind !== "row") return;
    expect(row.wiring.rowDomProps["data-row-id"]).toBe("a");
    expect(row.wiring.rowDomProps["data-adapttable-part"]).toBe("row");
    expect(row.wiring.id).toBe("a");
  });
});

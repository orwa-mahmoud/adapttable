import { renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { defaultConfirm } from "../actions/confirm";
import { REORDER_COLUMN_WIDTH } from "../rows/rowReorder";
import { useFrontendData } from "../source/useFrontendData";
import { tableRenderModel } from "../tableRenderProps";
import type { ColumnDef } from "../types";
import { createMemoryAdapter } from "../url/adapter";
import { useTableChrome } from "../useTableChrome";
import {
  createDesktopRow,
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  desktopBodyPinStyle,
  desktopChromeMetrics,
  desktopEdgeHeadStyle,
  desktopHasPinned,
  desktopHeadCellStyle,
  desktopPinSignature,
  desktopRowMeasureRef,
  type DesktopRowWiring,
  desktopRowWiringEqual,
  desktopScrollBoxStyle,
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

describe("desktopBodyPinStyle / desktopHeadCellStyle / desktopEdgeHeadStyle", () => {
  it("merges column and row pin styles, or returns undefined", () => {
    expect(
      desktopBodyPinStyle(
        "name",
        () => undefined,
        { start: 0, end: 0 },
        undefined,
        0
      )
    ).toBeUndefined();
    const columnOnly = desktopBodyPinStyle(
      "name",
      (key) => (key === "name" ? { side: "start", inset: 8 } : undefined),
      { start: 48, end: 0 },
      undefined,
      0
    );
    expect(columnOnly?.position).toBe("sticky");
    expect(columnOnly?.insetInlineStart).toBe(56);
    const rowOnly = desktopBodyPinStyle(
      "name",
      () => undefined,
      { start: 0, end: 0 },
      "top",
      24
    );
    expect(rowOnly?.position).toBe("sticky");
    expect(rowOnly?.top).toBe(24);
    const both = desktopBodyPinStyle(
      "name",
      (key) => (key === "name" ? { side: "end", inset: 4 } : undefined),
      { start: 0, end: 120 },
      "bottom",
      16
    );
    expect(both?.position).toBe("sticky");
    expect(both?.insetInlineEnd).toBe(124);
  });

  it("builds header cell styles for pin, width, and resize", () => {
    expect(
      desktopHeadCellStyle({ key: "name" }, { leads: { start: 0, end: 0 } })
    ).toBeUndefined();
    const pinned = desktopHeadCellStyle(
      { key: "name", width: 80 },
      {
        pinOffset: (key) =>
          key === "name" ? { side: "start", inset: 0 } : undefined,
        leads: { start: 48, end: 0 },
        columnWidths: { name: 90 },
        stickyStyle: { position: "sticky", top: 0 },
      }
    );
    expect(pinned?.position).toBe("sticky");
    expect(pinned?.width).toBe(90);
    const resize = desktopHeadCellStyle(
      { key: "name" },
      {
        leads: { start: 0, end: 0 },
        setWidth: () => undefined,
      }
    );
    expect(resize?.position).toBe("relative");
    const sized = desktopHeadCellStyle(
      { key: "name" },
      {
        leads: { start: 0, end: 0 },
        columnWidths: { name: 72 },
      }
    );
    expect(sized).toEqual({ width: 72 });
  });

  it("merges sticky header with an active edge pin", () => {
    expect(desktopEdgeHeadStyle("start", false, undefined)).toBeUndefined();
    expect(desktopEdgeHeadStyle("start", false, { top: 0 })?.top).toBe(0);
    const edge = desktopEdgeHeadStyle("end", true, { top: 8 });
    expect(edge?.position).toBe("sticky");
    expect(edge?.insetInlineEnd).toBe(0);
    expect(edge?.top).toBe(8);
  });
});

describe("createDesktopRow", () => {
  it("skips a re-render when wiring and extras match", () => {
    const RowBase = (props: DesktopRowWiring<Row> & { size: string }) =>
      createElement("span", null, props.size);
    const Row = createDesktopRow<Row, DesktopRowWiring<Row> & { size: string }>(
      RowBase,
      (prev, next) => prev.size === next.size
    );
    const wiring = {
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
      size: "md",
    } as unknown as DesktopRowWiring<Row> & { size: string };
    const compare = (
      Row as unknown as {
        compare: (
          a: DesktopRowWiring<Row> & { size: string },
          b: DesktopRowWiring<Row> & { size: string }
        ) => boolean;
      }
    ).compare;
    expect(compare).toBeTypeOf("function");
    expect(compare(wiring, { ...wiring })).toBe(true);
    expect(compare(wiring, { ...wiring, size: "lg" })).toBe(false);
    expect(compare(wiring, { ...wiring, selected: true })).toBe(false);
    const Bare = createDesktopRow<Row, DesktopRowWiring<Row>>(() =>
      createElement("span")
    );
    const bareCompare = (
      Bare as unknown as {
        compare: (
          a: DesktopRowWiring<Row>,
          b: DesktopRowWiring<Row>
        ) => boolean;
      }
    ).compare;
    expect(bareCompare(wiring, { ...wiring, size: "other" } as never)).toBe(
      true
    );
  });
});

describe("useDesktopTableAssembly coverage paths", () => {
  it("wires pins, sticky header, callbacks, extras, and grouping", () => {
    const toggleSelect = vi.fn();
    const toggleExpand = vi.fn();
    const toggleGroup = vi.fn();
    const onRowClick = vi.fn();
    const prefetch = vi.fn();
    const renderRowDetail = vi.fn((row: Row) => row.name);
    const virtualScrollRef = vi.fn();
    const toggleColumn = vi.fn();
    const { result } = renderHook(() => {
      const chrome = useChrome();
      chrome.table.selection = {
        selectedIds: new Set<string>(),
        isSelected: () => false,
        toggle: toggleSelect,
      } as never;
      const assembly = useDesktopTableAssembly(
        {
          table: chrome.table,
          rows: ROWS,
          getRowId: chrome.getRowId,
          confirm: defaultConfirm,
          onRowClick,
          prefetch,
          rowClassName: (row) => (row.id === "a" ? "lead" : undefined),
          rowStyle: () => ({ background: "red" }),
          renderRowDetail,
          expansion: {
            expandedIds: new Set<string>(),
            isExpanded: () => false,
            toggle: toggleExpand,
          },
          stickyHeader: true,
          stickyTop: 12,
          maxHeight: 400,
          actionsPinned: true,
          reorderPinned: true,
          virtualScrollRef,
          setWidth: () => undefined,
          columnWidths: { name: 120 },
          fitColumns: true,
          pinOffset: (key) =>
            key === "name" ? { side: "start", inset: 0 } : undefined,
          pinnedTopRows: [ROWS[0]!],
          pinnedBottomRows: [ROWS[1]!],
          extraRows: [
            {
              key: "rule",
              kind: "separator",
              beforeRowId: "a",
            },
            {
              key: "note",
              kind: "fullWidth",
              beforeRowId: "b",
              render: () => "note",
            },
          ],
          rowReorder: {
            lifted: null,
            overIndex: null,
            isLifted: () => false,
            rowAttrs: () => ({ "data-reorder": "" }),
            dropProps: () => ({ "data-drop": "" }),
          } as never,
          rowActions: [{ key: "e", label: "Edit", onClick: () => undefined }],
          summaryRow: () => ({ name: "2" }),
          headerFilters: true,
          filterDefs: [{ key: "name", type: "text" }],
          gridFocus: {
            enabled: true,
            columnCheckbox: true,
            isColumnSelected: () => false,
            toggleColumn,
            getGridProps: () => ({ role: "grid" }),
            getRowPropsAt: () => ({ "data-grid-row": "" }),
            getColumnHeaderProps: () => ({ "data-col-header": "" }),
          } as never,
          grouping: {
            groupBy: ["name"],
            collapsed: {
              collapsedGroupIds: new Set<string>(),
              isCollapsed: () => false,
              toggle: toggleGroup,
              expandAll: () => undefined,
              collapseAll: () => undefined,
              collapseToDepth: () => undefined,
            },
            entries: [
              {
                kind: "group",
                key: "g1",
                value: "A",
                label: "A",
                level: 0,
                groupBy: "name",
                path: ["A"],
                leafRows: ROWS,
                leafIds: ["a", "b"],
                collapsed: false,
              },
              { kind: "separator", key: "g-sep" },
              {
                kind: "row",
                key: "a",
                row: ROWS[0]!,
                index: 0,
                groupKey: "g1",
              },
              {
                kind: "groupFooter",
                key: "g1:footer",
                groupKey: "g1",
                level: 0,
                groupBy: "name",
                label: "A",
                leafRows: ROWS,
                leafIds: ["a", "b"],
              },
              {
                kind: "groupMore",
                key: "g1:more",
                groupKey: "g1",
                level: 0,
                scope: "rows",
                remaining: 1,
                leafRows: [],
                leafIds: [],
                label: "more",
              },
            ],
            setGroupBy: () => undefined,
            expandAll: () => undefined,
            collapseAll: () => undefined,
            collapseToDepth: () => undefined,
            showMore: () => undefined,
          },
        },
        { widths: { expansion: 40, selection: 44, actions: 100 } }
      );
      return assembly;
    });
    const kinds = result.current.bodySlots.map((s) => `${s.kind}:${s.key}`);
    expect(kinds).toContain("row:a");
    expect(kinds).toContain("group:g1");
    expect(kinds).toContain("extra:g-sep");
    expect(kinds).toContain("group:g1:footer");
    expect(kinds).toContain("group:g1:more");
    expect(kinds).toContain("row:b");
    expect(result.current.pin.hasPinned).toBe(true);
    expect(result.current.pin.hasStartPin).toBe(true);
    expect(result.current.pin.stickActions).toBe(true);
    expect(result.current.pin.stickyStyle?.position).toBe("sticky");
    expect(result.current.scroll.boxStyle?.maxHeight).toBe(400);
    expect(result.current.showColumnFooter).toBe(true);
    expect(result.current.summary?.name).toBe("2");
    expect(result.current.header.leading.expand).toBe(true);
    expect(result.current.header.leading.reorder).toBe(true);
    expect(result.current.header.trailing.actions).toBe(true);
    expect(result.current.gridProps).toEqual({ role: "grid" });
    expect(result.current.tableStyle?.minWidth).toBeGreaterThan(0);
    result.current.callbacks.onToggleSelect("a");
    result.current.callbacks.onToggleExpand("a");
    result.current.callbacks.onToggleGroup("g1");
    result.current.callbacks.handleRowClick(ROWS[0]!);
    result.current.callbacks.handlePrefetch(ROWS[0]!);
    result.current.callbacks.renderDetail(ROWS[0]!);
    expect(toggleSelect).toHaveBeenCalledWith("a");
    expect(toggleExpand).toHaveBeenCalledWith("a");
    expect(toggleGroup).toHaveBeenCalledWith("g1");
    expect(onRowClick).toHaveBeenCalledWith(ROWS[0]);
    expect(prefetch).toHaveBeenCalledWith(ROWS[0]);
    expect(renderRowDetail).toHaveBeenCalledWith(ROWS[0]);
    const leaf = result.current.header.leaf(cols[0]!, 0, 2);
    expect(leaf.rowSpan).toBe(2);
    expect(leaf.style.verticalAlign).toBe("middle");
    expect(leaf.showColumnCheckbox).toBe(true);
    leaf.onToggleColumn?.();
    expect(toggleColumn).toHaveBeenCalledWith(0);
    expect(result.current.pin.headStyle(cols[0]!)?.position).toBe("sticky");
    expect(result.current.pin.edgeHeadStyle("start", true)?.position).toBe(
      "sticky"
    );
    expect(result.current.pin.edgeBodyStyle("start", true)?.position).toBe(
      "sticky"
    );
    const box = { nodeType: 1 } as unknown as HTMLDivElement;
    result.current.scroll.bindScrollBox(box);
    expect(virtualScrollRef).toHaveBeenCalledWith(box);
    const pinned = result.current.bodySlots.find(
      (s) => s.kind === "row" && s.wiring.rowPinSide === "top"
    );
    expect(pinned?.kind).toBe("row");
    if (pinned?.kind === "row") {
      expect(pinned.wiring.rowClass).toBe("lead");
      expect(pinned.wiring.bodyPinStyle("name")?.position).toBe("sticky");
      expect(pinned.wiring.rowDomProps["data-clickable"]).toBe("");
      const enter = pinned.wiring.rowDomProps.onMouseEnter as
        | (() => void)
        | undefined;
      enter?.();
      expect(prefetch).toHaveBeenCalled();
    }
  });

  it("measures scroll-body rows and exposes column spacers", () => {
    const measure = vi.fn();
    const pairRef = vi.fn();
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
        measureElement: measure,
        measureRowPair: {
          row: () => pairRef,
          detail: () => pairRef,
        },
        columnWindow: {
          enabled: true,
          columns: cols,
          paddingStart: 40,
          paddingEnd: 20,
        },
        tree: {
          entries: [
            { row: ROWS[0]!, id: "a", depth: 0, hasChildren: false },
          ] as never,
          expansion: { toggle: () => undefined } as never,
          columnKey: "name",
        },
      });
    });
    expect(result.current.header.leading.spacerStart).toBe(true);
    expect(result.current.header.trailing.spacerEnd).toBe(true);
    const row = result.current.bodySlots.find((s) => s.kind === "row");
    expect(row?.kind).toBe("row");
    if (row?.kind === "row") {
      expect(row.wiring.measureRef).toBe(pairRef);
      expect(row.wiring.treeColumnKey).toBe("name");
    }
  });

  it("invokes live callbacks when selection and expansion are absent", () => {
    const { result } = renderHook(() => {
      const chrome = useChrome();
      return useDesktopTableAssembly({
        table: chrome.table,
        rows: ROWS,
        getRowId: chrome.getRowId,
        confirm: defaultConfirm,
      });
    });
    expect(result.current.callbacks.onToggleSelect("a")).toBeUndefined();
    expect(result.current.callbacks.onToggleExpand("a")).toBeUndefined();
    expect(result.current.callbacks.onToggleGroup("g")).toBeUndefined();
    expect(result.current.callbacks.handleRowClick(ROWS[0]!)).toBeUndefined();
    expect(result.current.callbacks.handlePrefetch(ROWS[0]!)).toBeUndefined();
    expect(result.current.callbacks.renderDetail(ROWS[0]!)).toBeUndefined();
    const leaf = result.current.header.leaf(cols[0]!, 0);
    expect(leaf.onToggleColumn).toBeUndefined();
    expect(leaf.resizeHandleProps).toBeUndefined();
    expect(result.current.pin.stickyStyle).toBeUndefined();
    expect(result.current.scroll.boxStyle).toBeUndefined();
  });
});

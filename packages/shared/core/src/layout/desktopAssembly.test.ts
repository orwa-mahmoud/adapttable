/**
 * The desktop assembly is everything an HTML-table body needs before a kit
 * paints it. What has to hold is the wiring each row renders from (and the
 * memo policy that decides when it re-renders), the body in reading order,
 * and the sticky, pin, width and header rules — identical in every binding.
 */
import { describe, expect, it, vi } from "vitest";

import type { ColumnMetadata } from "../columnModel";
import { PIN_Z, type PinOffset } from "../columns/columnLayoutModel";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { BodyCell } from "../rows/cellSpan";
import {
  type ExtraRow,
  insertExtraRows,
  insertExtrasBeforeRows,
} from "../rows/extraRows";
import { pinnedSummaryRowId } from "../rows/pinnedSummaryRows";
import type { CssProperties } from "../style/cssProperties";
import type { TreeEntry } from "../tree/treeRows";
import {
  absoluteColumnIndex,
  columnHeaderControllerFor,
  DESKTOP_ROW_WIRING_KEYS,
  desktopBodySlots,
  type DesktopBodySlotsInput,
  desktopEdgeBodyStyle,
  desktopEdgeHeadStyle,
  desktopHeadCellStyle,
  desktopHeaderLeaf,
  type DesktopHeaderLeafContext,
  desktopPinEdges,
  desktopRowDomProps,
  desktopRowWiring,
  type DesktopRowWiringArgs,
  type DesktopRowWiringContext,
  desktopRowWiringEqual,
  desktopStickyPlan,
  desktopTableStyle,
  headerSortDir,
} from "./desktopAssembly";

interface Row {
  id: string;
  name: string;
}

const ROWS: Row[] = [
  { id: "a", name: "Alice" },
  { id: "b", name: "Bob" },
  { id: "c", name: "Cleo" },
];

const getRowId = (row: Row) => row.id;

const pinStart = (key: string): PinOffset | undefined =>
  key === "name" ? { side: "start", inset: 8 } : undefined;

/* ── Memo policy ───────────────────────────────────────────────────── */

describe("desktopRowWiringEqual", () => {
  const base = Object.fromEntries(
    DESKTOP_ROW_WIRING_KEYS.map((key) => [key, `v:${key}`])
  );

  it("lists every field a memoized row paints from", () => {
    expect(DESKTOP_ROW_WIRING_KEYS).toContain("row");
    expect(DESKTOP_ROW_WIRING_KEYS).toContain("flashSignature");
    expect(DESKTOP_ROW_WIRING_KEYS).toContain("treeColumnKey");
    expect(new Set(DESKTOP_ROW_WIRING_KEYS).size).toBe(
      DESKTOP_ROW_WIRING_KEYS.length
    );
  });

  it("ignores fields outside the wiring keys, like callback identity", () => {
    expect(
      desktopRowWiringEqual(
        { ...base, onRowClick: () => undefined } as never,
        { ...base, onRowClick: () => undefined } as never
      )
    ).toBe(true);
  });

  it("re-renders when any single wiring field changes", () => {
    for (const key of DESKTOP_ROW_WIRING_KEYS) {
      expect(desktopRowWiringEqual(base, { ...base, [key]: "changed" })).toBe(
        false
      );
    }
  });
});

/* ── Row DOM props ─────────────────────────────────────────────────── */

type DomArgs = Parameters<typeof desktopRowDomProps<Row>>[0];

function domArgs(overrides: Partial<DomArgs> = {}): DomArgs {
  return {
    table: {
      getRowProps: (row: Row, index: number) => ({
        "data-row-id": row.id,
        "data-index": index,
      }),
    },
    row: ROWS[1]!,
    focusIndex: 4,
    gridFocus: undefined,
    onRowClick: undefined,
    handleRowClick: vi.fn(),
    summary: false,
    rowReorder: undefined,
    index: 1,
    windowStart: 0,
    reorderAttrs: undefined,
    rowPinSide: undefined,
    pinPart: undefined,
    selection: null,
    id: "b",
    editing: undefined,
    labels: { pinnedSummaryRow: "Summary row" },
    visualStyle: undefined,
    pinSticky: undefined,
    prefetch: undefined,
    handlePrefetch: vi.fn(),
    ...overrides,
  };
}

describe("desktopRowDomProps", () => {
  it("gives a plain row its table props and nothing it did not ask for", () => {
    const props = desktopRowDomProps(domArgs());
    expect(props).toEqual({
      "data-row-id": "b",
      "data-index": 4,
      "aria-selected": undefined,
      "data-row-pin": undefined,
      "data-adapttable-part": "row",
      "data-stagger": "",
      "data-selected": undefined,
      "data-dirty": undefined,
      "data-clickable": undefined,
      "aria-label": undefined,
      style: {},
      onMouseEnter: undefined,
    });
  });

  it("wires selection, focus, click, reorder, pin, dirt and prefetch", () => {
    const handleRowClick = vi.fn();
    const handlePrefetch = vi.fn();
    const dropProps = vi.fn(() => ({ onDrop: "drop" }));
    const props = desktopRowDomProps(
      domArgs({
        gridFocus: { getRowPropsAt: (index) => ({ "aria-rowindex": index }) },
        onRowClick: vi.fn(),
        handleRowClick,
        rowReorder: {
          lifted: null,
          pendingMove: null,
          isLifted: () => false,
          overIndex: null,
          dropProps,
        },
        windowStart: 20,
        reorderAttrs: { "data-dragging": "", "data-drop": "inside" },
        rowPinSide: "top",
        pinPart: "pinned-top",
        selection: { isSelected: (id) => id === "b" },
        editing: { state: {}, dirty: { isRowDirty: () => true } },
        visualStyle: { color: "red" },
        pinSticky: { position: "sticky", top: 30 },
        prefetch: vi.fn(),
        handlePrefetch,
      })
    );
    expect(dropProps).toHaveBeenCalledWith(1, ROWS[1], 20);
    expect(props["aria-selected"]).toBe(true);
    expect(props["aria-rowindex"]).toBe(4);
    expect(props.tabIndex).toBe(-1);
    expect(props["data-adapttable-row"]).toBe("");
    expect(props.onDrop).toBe("drop");
    expect(props["data-dragging"]).toBe("");
    expect(props["data-drop"]).toBe("inside");
    expect(props["data-row-pin"]).toBe("top");
    expect(props["data-adapttable-part"]).toBe("pinned-top");
    expect(props["data-selected"]).toBe("");
    expect(props["data-dirty"]).toBe("");
    expect(props["data-clickable"]).toBe("");
    expect(props.style).toMatchObject({
      color: "red",
      position: "sticky",
      top: 30,
      boxShadow: "inset 0 0 0 2px currentColor",
    });
    (props.onKeyDown as (event: object) => void)({
      key: "Enter",
      target: "self",
      currentTarget: "self",
      preventDefault: vi.fn(),
    });
    expect(handleRowClick).toHaveBeenCalledWith(ROWS[1]);
    (props.onMouseEnter as () => void)();
    expect(handlePrefetch).toHaveBeenCalledWith(ROWS[1]);
  });

  it("announces an unselected row as unselected", () => {
    const props = desktopRowDomProps(
      domArgs({ selection: { isSelected: () => false } })
    );
    expect(props["aria-selected"]).toBe(false);
    expect(props["data-selected"]).toBeUndefined();
  });

  it("gives a summary row none of the row's interactions", () => {
    const dropProps = vi.fn(() => ({ onDrop: "drop" }));
    const props = desktopRowDomProps(
      domArgs({
        summary: true,
        onRowClick: vi.fn(),
        rowReorder: {
          lifted: null,
          pendingMove: null,
          isLifted: () => false,
          overIndex: null,
          dropProps,
        },
        selection: { isSelected: () => true },
        prefetch: vi.fn(),
        rowPinSide: "bottom",
        pinPart: "pinned-summary-bottom",
      })
    );
    expect(dropProps).not.toHaveBeenCalled();
    expect(props["aria-selected"]).toBeUndefined();
    expect(props["data-selected"]).toBeUndefined();
    expect(props["data-clickable"]).toBeUndefined();
    expect(props.onClick).toBeUndefined();
    expect(props.onMouseEnter).toBeUndefined();
    expect(props["aria-label"]).toBe("Summary row");
    expect(props["data-adapttable-part"]).toBe("pinned-summary-bottom");
  });
});

/* ── Row wiring ────────────────────────────────────────────────────── */

type Ctx = DesktopRowWiringContext<Row>;

function makeCtx(overrides: Partial<Ctx> = {}): Ctx {
  const columns = [{ key: "name" }, { key: "team" }];
  const cells: BodyCell<Row>[] = [
    {
      column: { key: "name" },
      columnIndex: 0,
      colSpan: 2,
      rowSpan: 1,
    },
  ];
  return {
    cellsByRow: new Map([["a", cells]]),
    rowStyle: undefined,
    rowHeight: undefined,
    leads: { start: 48, end: 0 },
    pinRowSticky: true,
    rowPinOffset: 40,
    measureRowPair: undefined,
    measureElement: undefined,
    rowReorder: undefined,
    table: { getRowProps: (row) => ({ "data-row-id": row.id }) },
    gridFocus: undefined,
    onRowClick: undefined,
    handleRowClick: vi.fn(),
    windowStart: 0,
    selection: null,
    editing: undefined,
    prefetch: undefined,
    handlePrefetch: vi.fn(),
    columns,
    labels: { pinnedSummaryRow: "Summary" },
    expansionState: undefined,
    showActions: true,
    showReorder: true,
    rows: ROWS,
    reorderPinned: false,
    rowPinning: undefined,
    rowActions: "actions",
    rowActionsLayout: "menu",
    cellSpanAppearance: "merged",
    renderRowActions: "render",
    confirm: "confirm",
    columnSpan: 4,
    columnSpacers: { start: 0, end: 10 },
    tree: undefined,
    columnWidths: { name: 100 },
    pinOffset: pinStart,
    pinSignature: "name:start:8|",
    hasStartPin: true,
    hasEndPin: false,
    stickActions: true,
    rowClassName: undefined,
    isCellFlashing: undefined,
    getRowId,
    summaryTopCount: 2,
    onToggleSelect: vi.fn(),
    onToggleExpand: vi.fn(),
    renderDetail: vi.fn(),
    ...overrides,
  };
}

function rowArgs(
  overrides: Partial<DesktopRowWiringArgs<Row>> = {}
): DesktopRowWiringArgs<Row> {
  return {
    row: ROWS[0]!,
    index: 0,
    id: "a",
    sourceIndex: 5,
    rowPinSide: undefined,
    treeEntry: undefined,
    measure: true,
    ...overrides,
  };
}

describe("desktopRowWiring", () => {
  it("passes the shared context through and derives the row's own fields", () => {
    const ctx = makeCtx();
    const wiring = desktopRowWiring(ctx, rowArgs());
    expect(wiring.row).toBe(ROWS[0]);
    expect(wiring.table).toBe(ctx.table);
    expect(wiring.columns).toBe(ctx.columns);
    expect(wiring.bodyCells).toBe(ctx.cellsByRow.get("a"));
    expect(wiring.spanSignature).toBe("name:2x1");
    expect(wiring.selected).toBeUndefined();
    expect(wiring.expanded).toBeUndefined();
    expect(wiring.showActions).toBe(true);
    expect(wiring.showReorder).toBe(true);
    expect(wiring.rowCount).toBe(3);
    expect(wiring.reorderSignature).toBeNull();
    expect(wiring.rowPinSignature).toBeNull();
    expect(wiring.treeColumnKey).toBeUndefined();
    expect(wiring.onToggleTree).toBeUndefined();
    expect(wiring.actionsPinned).toBe(true);
    expect(wiring.rowClass).toBeUndefined();
    expect(wiring.rowVisualStyle).toBeUndefined();
    expect(wiring.rowStyleSignature).toBe("");
    expect(wiring.flashSignature).toBe("");
    expect(wiring.clickable).toBe(false);
    expect(wiring.hasPrefetch).toBe(false);
    expect(wiring.editingSignature).toBeNull();
    expect(wiring.onRowClick).toBe(ctx.handleRowClick);
    expect(wiring.onPrefetch).toBe(ctx.handlePrefetch);
    // A data row counts from the source, after the summary rows above it.
    expect(wiring.focusIndex).toBe(7);
    expect(wiring.pinPart).toBeUndefined();
    expect(wiring.pinSticky).toBeUndefined();
    expect(wiring.edgeRowPin).toEqual({});
    expect(wiring.rowDomProps["data-row-id"]).toBe("a");
    expect(wiring.rowDomProps["data-adapttable-part"]).toBe("row");
    expect(wiring.bodyPinStyle("name")).toEqual({
      position: "sticky",
      insetInlineStart: 56,
      zIndex: PIN_Z.body,
    });
    expect(wiring.bodyPinStyle("team")).toBeUndefined();
    expect(wiring.bodyPinSide("name")).toBe("start");
    expect(wiring.bodyPinSide("team")).toBeUndefined();
  });

  it("reads selection, expansion, tree, style, flash, editing and reorder", () => {
    const toggle = vi.fn();
    const rowClassName = vi.fn(() => "hot");
    const ctx = makeCtx({
      selection: { isSelected: () => true },
      expansionState: { isExpanded: () => false },
      tree: { columnKey: "name", expansion: { toggle } },
      rowStyle: () => ({ color: "blue" }),
      rowHeight: 32,
      rowClassName,
      isCellFlashing: (_id, key) => key === "team",
      onRowClick: vi.fn(),
      prefetch: vi.fn(),
      editing: { state: { active: null } },
      rowPinning: { sideOf: () => "top" },
      rowReorder: {
        lifted: "a",
        pendingMove: null,
        isLifted: (id) => id === "a",
        overIndex: null,
        rowAttrs: () => ({ "data-dragging": "" }),
      },
    });
    const wiring = desktopRowWiring(ctx, rowArgs({ rowPinSide: "top" }));
    expect(wiring.selected).toBe(true);
    expect(wiring.expanded).toBe(false);
    expect(wiring.treeColumnKey).toBe("name");
    expect(wiring.onToggleTree).toBe(toggle);
    expect(rowClassName).toHaveBeenCalledWith(ROWS[0], 5);
    expect(wiring.rowClass).toBe("hot");
    expect(wiring.rowVisualStyle).toEqual({ color: "blue", height: 32 });
    expect(wiring.rowStyleSignature).toBe('{"color":"blue","height":32}');
    expect(wiring.flashSignature).toBe("team");
    expect(wiring.clickable).toBe(true);
    expect(wiring.hasPrefetch).toBe(true);
    expect(wiring.editingSignature).toBe("");
    expect(wiring.rowPinSignature).toBe("top");
    expect(wiring.reorderSignature).toBe("Ld");
    expect(wiring.rowDomProps["data-dragging"]).toBe("");
    expect(wiring.pinPart).toBe("pinned-top");
    expect(wiring.pinSticky).toEqual({
      position: "sticky",
      top: 40,
      zIndex: PIN_Z.rowPinned,
    });
    expect(wiring.edgeRowPin).toEqual({
      position: "sticky",
      top: 40,
      zIndex: PIN_Z.rowPinnedColumn,
    });
    // A pinned row never measures, even when asked to.
    expect(wiring.measureRef).toBeUndefined();
    expect(wiring.detailMeasureRef).toBeUndefined();
    expect(wiring.bodyPinStyle("team")).toEqual({
      position: "sticky",
      top: 40,
      zIndex: PIN_Z.rowPinned,
    });
  });

  it("measures a scrolled row with the pair measurer, else the element", () => {
    const rowRef = vi.fn();
    const detailRef = vi.fn();
    const measureElement = vi.fn();
    const pair = { row: vi.fn(() => rowRef), detail: vi.fn(() => detailRef) };
    const paired = desktopRowWiring(
      makeCtx({ measureRowPair: pair, measureElement }),
      rowArgs({ index: 3 })
    );
    expect(pair.row).toHaveBeenCalledWith(3);
    expect(paired.measureRef).toBe(rowRef);
    expect(paired.detailMeasureRef).toBe(detailRef);
    expect(paired.measureElement).toBe(measureElement);
    expect(paired.measureRowPair).toBe(pair);

    const single = desktopRowWiring(
      makeCtx({ measureElement }),
      rowArgs({ index: 3 })
    );
    expect(single.measureRef).toBe(measureElement);
    expect(single.detailMeasureRef).toBeUndefined();

    const unmeasured = desktopRowWiring(
      makeCtx({ measureRowPair: pair, measureElement }),
      rowArgs({ measure: false })
    );
    expect(unmeasured.measureRef).toBeUndefined();
    expect(unmeasured.detailMeasureRef).toBeUndefined();
    expect(unmeasured.measureElement).toBeUndefined();
    expect(unmeasured.measureRowPair).toBeUndefined();
  });

  it("gives a summary row its own part, focus index and no interactions", () => {
    const rowAttrs = vi.fn(() => ({ "data-dragging": "" as const }));
    const ctx = makeCtx({
      windowStart: 10,
      selection: { isSelected: () => true },
      expansionState: { isExpanded: () => true },
      rowReorder: {
        lifted: null,
        pendingMove: null,
        isLifted: () => false,
        overIndex: null,
        rowAttrs,
      },
    });
    const top = desktopRowWiring(
      ctx,
      rowArgs({ summary: true, rowPinSide: "top", sourceIndex: 12 })
    );
    expect(rowAttrs).not.toHaveBeenCalled();
    expect(top.selected).toBeUndefined();
    expect(top.expanded).toBeUndefined();
    expect(top.showActions).toBe(false);
    expect(top.showReorder).toBe(false);
    // A summary row counts from the window.
    expect(top.focusIndex).toBe(2);
    expect(top.pinPart).toBe("pinned-summary-top");
    expect(top.rowDomProps["aria-label"]).toBe("Summary");

    const unplaced = desktopRowWiring(ctx, rowArgs({ summary: true }));
    expect(unplaced.pinPart).toBeUndefined();
    expect(unplaced.rowDomProps["data-adapttable-part"]).toBe("row");
  });
});

/* ── Body slots ────────────────────────────────────────────────────── */

function slotsInput(
  overrides: Partial<
    DesktopBodySlotsInput<Row, DesktopRowWiringArgs<Row>, string>
  > = {}
): DesktopBodySlotsInput<Row, DesktopRowWiringArgs<Row>, string> {
  return {
    pinnedTopRows: [],
    pinnedBottomRows: [],
    pinnedSummaryTop: [],
    pinnedSummaryBottom: [],
    extraRows: undefined,
    extraFill: (key) => `fill:${key}`,
    insertExtraRows,
    insertExtrasBeforeRows,
    paddingTop: 0,
    paddingBottom: 0,
    grouping: undefined,
    entries: ROWS.map((row, index) => ({ row, index, key: row.id })),
    tree: undefined,
    getRowId,
    columnSpan: 3,
    rows: ROWS,
    wiring: (args) => args,
    ...overrides,
  };
}

function slotKeys(slots: readonly { kind: string; key: string }[]): string[] {
  return slots.map((slot) => `${slot.kind}:${slot.key}`);
}

describe("desktopBodySlots", () => {
  it("renders just the rows when nothing else is composed", () => {
    const slots = desktopBodySlots(slotsInput());
    expect(slotKeys(slots)).toEqual(["row:a", "row:b", "row:c"]);
    const first = slots[0];
    expect(first?.kind === "row" && first.wiring).toEqual({
      row: ROWS[0],
      index: 0,
      id: "a",
      sourceIndex: 0,
      rowPinSide: undefined,
      treeEntry: undefined,
      measure: true,
    });
  });

  it("lays out summaries, pins, pads, rows and extras in reading order", () => {
    const top = { id: "top", name: "Top total" };
    const bottom = { id: "bottom", name: "Bottom total" };
    const extraRows: ExtraRow[] = [
      { key: "before-a", kind: "separator", beforeRowId: "a" },
      {
        key: "before-b",
        kind: "fullWidth",
        beforeRowId: "b",
        render: () => "B",
      },
      { key: "tail", kind: "fullWidth" },
    ];
    const slots = desktopBodySlots(
      slotsInput({
        pinnedSummaryTop: [top],
        pinnedSummaryBottom: [bottom],
        pinnedTopRows: [ROWS[0]!],
        pinnedBottomRows: [{ id: "gone", name: "Not loaded" }],
        extraRows,
        paddingTop: 30,
        paddingBottom: 50,
        entries: [
          { row: ROWS[1]!, index: 0, key: "b", sourceIndex: 1 },
          { row: ROWS[2]!, index: 1, key: "c", sourceIndex: 2 },
        ],
      })
    );
    const topSummary = pinnedSummaryRowId("top", 0);
    const bottomSummary = pinnedSummaryRowId("bottom", 0);
    expect(slotKeys(slots)).toEqual([
      `row:${topSummary}`,
      "extra:before-a",
      "row:a",
      "virtualPad:pad-top",
      "extra:before-b",
      "row:b",
      "row:c",
      "extra:tail",
      "virtualPad:pad-bottom",
      "row:gone",
      `row:${bottomSummary}`,
    ]);

    const [summary, separator, pinned, pad] = slots;
    expect(summary?.kind === "row" && summary.wiring).toEqual({
      row: top,
      index: 0,
      id: topSummary,
      sourceIndex: 0,
      rowPinSide: "top",
      treeEntry: undefined,
      measure: false,
      summary: true,
    });
    expect(separator).toEqual({
      kind: "extra",
      key: "before-a",
      extraKind: "separator",
      colSpan: 3,
      render: undefined,
      fillStyle: "fill:before-a",
    });
    expect(pinned?.kind === "row" && pinned.wiring).toEqual({
      row: ROWS[0],
      index: 0,
      id: "a",
      sourceIndex: 0,
      rowPinSide: "top",
      treeEntry: undefined,
      measure: false,
    });
    expect(pad).toEqual({
      kind: "virtualPad",
      key: "pad-top",
      height: 30,
      colSpan: 3,
    });

    const fullWidth = slots[4];
    expect(fullWidth?.kind === "extra" && fullWidth.render?.()).toBe("B");
    const scrolled = slots[5];
    expect(scrolled?.kind === "row" && scrolled.wiring.sourceIndex).toBe(1);
    // A pinned row missing from the rendered rows falls back to index 0.
    const missing = slots[9];
    expect(missing?.kind === "row" && missing.wiring).toMatchObject({
      id: "gone",
      sourceIndex: 0,
      rowPinSide: "bottom",
    });
    const bottomRow = slots[10];
    expect(bottomRow?.kind === "row" && bottomRow.wiring.summary).toBe(true);
    expect(bottomRow?.kind === "row" && bottomRow.wiring.rowPinSide).toBe(
      "bottom"
    );
  });

  it("finds a pinned row's place in the rendered rows", () => {
    const slots = desktopBodySlots(slotsInput({ pinnedTopRows: [ROWS[2]!] }));
    const pinned = slots[0];
    expect(pinned?.kind === "row" && pinned.wiring).toMatchObject({
      id: "c",
      index: 2,
      sourceIndex: 2,
    });
  });

  it("renders tree entries in place of the flat rows", () => {
    const entries: TreeEntry<Row>[] = [
      {
        row: ROWS[2]!,
        key: "c",
        level: 0,
        hasChildren: true,
        expanded: true,
        path: [],
        siblingIndex: 0,
        descendantIds: ["a"],
      },
      {
        row: ROWS[0]!,
        key: "a",
        level: 1,
        hasChildren: false,
        expanded: false,
        path: ["c"],
        parentId: "c",
        siblingIndex: 0,
        descendantIds: [],
      },
    ];
    const slots = desktopBodySlots(slotsInput({ tree: { entries } }));
    expect(slotKeys(slots)).toEqual(["row:c", "row:a"]);
    const child = slots[1];
    expect(child?.kind === "row" && child.wiring).toMatchObject({
      id: "a",
      index: 1,
      sourceIndex: 1,
      treeEntry: entries[1],
    });
  });

  it("renders grouped entries: headers, footers, more, extras and leaves", () => {
    const entries = [
      { kind: "group", key: "g1" },
      { kind: "separator", key: "sep" },
      { kind: "row", key: "b", row: ROWS[1], index: 4 },
      { kind: "fullWidth", key: "note", render: () => "note" },
      { kind: "groupFooter", key: "g1:footer" },
      { kind: "groupMore", key: "g1:more" },
    ] as unknown as GroupedFlatEntry<Row>[];
    const slots = desktopBodySlots(
      slotsInput({
        grouping: { entries },
        // Grouped bodies already carry their extras; the flat splice is unused.
        extraRows: [{ key: "ignored", kind: "separator", beforeRowId: "b" }],
      })
    );
    expect(slotKeys(slots)).toEqual([
      "group:g1",
      "extra:sep",
      "row:b",
      "extra:note",
      "group:g1:footer",
      "group:g1:more",
    ]);
    const group = slots[0];
    expect(group?.kind === "group" && group.entry).toBe(entries[0]);
    const leaf = slots[2];
    expect(leaf?.kind === "row" && leaf.wiring).toEqual({
      row: ROWS[1],
      index: 4,
      id: "b",
      sourceIndex: 4,
      rowPinSide: undefined,
      treeEntry: undefined,
      measure: true,
    });
    const note = slots[3];
    expect(note?.kind === "extra" && note.render?.()).toBe("note");
  });
});

/* ── Sticky, scroll and width rules ────────────────────────────────── */

describe("desktopStickyPlan", () => {
  const base = {
    maxHeight: undefined,
    hasPinned: false,
    overflowing: false,
    stickyHeader: false,
    stickyTop: 64,
    headerHeight: 40,
  };

  it("sticks nothing and scrolls nothing for a plain table", () => {
    expect(desktopStickyPlan(base)).toEqual({
      inScrollBox: false,
      headerStickTop: 64,
      rowPinOffset: 0,
      stickyStyle: undefined,
      stickyAttr: undefined,
      boxStyle: undefined,
    });
  });

  it("sticks the header at stickyTop on the page", () => {
    expect(desktopStickyPlan({ ...base, stickyHeader: true })).toEqual({
      inScrollBox: false,
      headerStickTop: 64,
      rowPinOffset: 104,
      stickyStyle: { position: "sticky", top: 64, zIndex: PIN_Z.header },
      stickyAttr: true,
      boxStyle: undefined,
    });
  });

  it("sticks at 0 inside a maxHeight box", () => {
    const plan = desktopStickyPlan({
      ...base,
      maxHeight: 400,
      stickyHeader: true,
    });
    expect(plan.inScrollBox).toBe(true);
    expect(plan.headerStickTop).toBe(0);
    expect(plan.rowPinOffset).toBe(40);
    expect(plan.stickyStyle?.top).toBe(0);
    expect(plan.boxStyle).toEqual({
      maxHeight: 400,
      overflowX: "auto",
      overflowY: "auto",
    });
  });

  it("scrolls sideways for a pinned column or real overflow", () => {
    for (const extra of [{ hasPinned: true }, { overflowing: true }]) {
      const plan = desktopStickyPlan({ ...base, ...extra });
      expect(plan.inScrollBox).toBe(true);
      expect(plan.headerStickTop).toBe(0);
      expect(plan.boxStyle).toEqual({ overflowX: "auto" });
    }
  });
});

describe("desktopPinEdges", () => {
  const columns = [{ key: "name" }, { key: "team" }, { key: "total" }];

  it("reports each pinned edge and the signature", () => {
    const pinOffset = (key: string): PinOffset | undefined => {
      if (key === "name") return { side: "start", inset: 0 };
      if (key === "total") return { side: "end", inset: 4 };
      return undefined;
    };
    expect(desktopPinEdges(columns, pinOffset)).toEqual({
      hasStartPin: true,
      hasEndPin: true,
      signature: "name:start:0||total:end:4",
    });
  });

  it("reports no pins without a lookup", () => {
    expect(desktopPinEdges(columns, undefined)).toEqual({
      hasStartPin: false,
      hasEndPin: false,
      signature: "||",
    });
  });
});

describe("desktopHeadCellStyle", () => {
  const leads = { start: 48, end: 0 };

  it("is undefined when nothing applies", () => {
    expect(desktopHeadCellStyle({ key: "team" }, { leads })).toBeUndefined();
  });

  it("merges sticky header, pin and measured width", () => {
    expect(
      desktopHeadCellStyle(
        { key: "name", width: 80 },
        {
          leads,
          pinOffset: pinStart,
          columnWidths: { name: 90 },
          stickyStyle: { position: "sticky", top: 0, zIndex: PIN_Z.header },
        }
      )
    ).toEqual({
      position: "sticky",
      top: 0,
      insetInlineStart: 56,
      zIndex: PIN_Z.headerPinned,
      width: 90,
    });
  });

  it("holds an unpinned measured width", () => {
    expect(
      desktopHeadCellStyle(
        { key: "team" },
        { leads, columnWidths: { team: 120 } }
      )
    ).toEqual({ width: 120 });
  });

  it("anchors a resize handle with a positioning box", () => {
    const setWidth = vi.fn();
    expect(desktopHeadCellStyle({ key: "team" }, { leads, setWidth })).toEqual({
      position: "relative",
    });
    // A sticky header is already a positioning box.
    expect(
      desktopHeadCellStyle(
        { key: "team" },
        { leads, setWidth, stickyStyle: { position: "sticky", top: 0 } }
      )
    ).toEqual({ position: "sticky", top: 0 });
  });

  it("carries a lone sticky style", () => {
    expect(
      desktopHeadCellStyle(
        { key: "team" },
        { leads, stickyStyle: { position: "sticky", top: 12 } }
      )
    ).toEqual({ position: "sticky", top: 12 });
  });
});

describe("desktopEdgeHeadStyle / desktopEdgeBodyStyle", () => {
  const sticky = { position: "sticky", top: 0 };

  it("is undefined with neither a sticky header nor an active edge", () => {
    expect(desktopEdgeHeadStyle("start", false, undefined)).toBeUndefined();
  });

  it("merges the sticky header and the edge pin", () => {
    expect(desktopEdgeHeadStyle("start", false, sticky)).toEqual(sticky);
    expect(desktopEdgeHeadStyle("end", true, undefined)).toEqual({
      position: "sticky",
      insetInlineEnd: 0,
      zIndex: PIN_Z.headerPinned,
    });
    expect(desktopEdgeHeadStyle("start", true, sticky)).toEqual({
      position: "sticky",
      top: 0,
      insetInlineStart: 0,
      zIndex: PIN_Z.headerPinned,
    });
  });

  it("pins an injected body cell only when its edge is active", () => {
    expect(desktopEdgeBodyStyle("start", false)).toBeUndefined();
    expect(desktopEdgeBodyStyle("end", true)).toEqual({
      position: "sticky",
      insetInlineEnd: 0,
      zIndex: PIN_Z.body,
    });
  });
});

describe("desktopTableStyle", () => {
  const sized = [
    { key: "name", width: 100 },
    { key: "team" },
  ] as ColumnMetadata<never>[];

  it("is undefined when no column has a width and fit is off", () => {
    expect(
      desktopTableStyle([{ key: "team" }] as ColumnMetadata<never>[], {
        columnWidths: undefined,
        extraMinWidth: 48,
        fitColumns: false,
      })
    ).toBeUndefined();
  });

  it("holds every column plus the injected chrome", () => {
    expect(
      desktopTableStyle(sized, {
        columnWidths: { team: 50 },
        extraMinWidth: 48,
        fitColumns: undefined,
      })
    ).toEqual({ minWidth: 198 });
  });

  it("adds the fitted layout when fitColumns is on", () => {
    expect(
      desktopTableStyle(sized, {
        columnWidths: undefined,
        extraMinWidth: 0,
        fitColumns: true,
      })
    ).toEqual({ minWidth: 100, tableLayout: "fixed", width: "100%" });
    expect(
      desktopTableStyle([], {
        columnWidths: undefined,
        extraMinWidth: 0,
        fitColumns: true,
      })
    ).toEqual({ tableLayout: "fixed", width: "100%" });
  });
});

/* ── Header leaves ─────────────────────────────────────────────────── */

describe("columnHeaderControllerFor", () => {
  it("captions with the header and drives the given sort", () => {
    const toggleSort = vi.fn();
    const controller = columnHeaderControllerFor(
      { key: "name", header: "Name" },
      { sortDir: "desc", sortIndex: 2, toggleSort }
    );
    expect(controller).toEqual({
      label: "Name",
      sortDir: "desc",
      sortIndex: 2,
      toggleSort,
    });
  });

  it("humanizes the key and offers an inert sort by default", () => {
    const controller = columnHeaderControllerFor({ key: "team_name" });
    expect(controller.label).toBe("Team Name");
    expect(controller.sortDir).toBeUndefined();
    expect(controller.sortIndex).toBeUndefined();
    expect(controller.toggleSort()).toBeUndefined();
  });
});

describe("headerSortDir", () => {
  it("reads the multi-sort chain first", () => {
    expect(
      headerSortDir(
        {
          sortBy: "name",
          sortDir: "asc",
          source: { sortLevels: [{ key: "team", dir: "desc" }] },
        },
        "team"
      )
    ).toBe("desc");
  });

  it("falls back to the single sort for the sorted column only", () => {
    const table = {
      sortBy: "name",
      sortDir: "asc" as const,
      source: { sortLevels: [] },
    };
    expect(headerSortDir(table, "name")).toBe("asc");
    expect(headerSortDir(table, "team")).toBeUndefined();
  });
});

interface LeafCol {
  key: string;
  header?: unknown;
  width?: number;
  sortable?: boolean;
  groupable?: boolean;
}

function leafCtx(
  overrides: Partial<DesktopHeaderLeafContext<Row, LeafCol>> = {}
): DesktopHeaderLeafContext<Row, LeafCol> {
  return {
    table: {
      columns: [{ key: "name" }, { key: "team" }],
      sortBy: "name",
      sortDir: "asc",
      source: { sortLevels: [] },
      getHeaderCellProps: (column, extra) => ({
        "data-key": column.key,
        style: extra?.style as CssProperties | undefined,
      }),
      getSortButtonProps: () => ({ onClick: undefined }),
    },
    headStyle: () => undefined,
    groupingPanel: undefined,
    gridFocus: undefined,
    headerFilters: undefined,
    filterDefs: undefined,
    pinOffset: undefined,
    setWidth: undefined,
    resizeLabel: "Resize",
    columnResizeHandleProps: vi.fn(),
    labels: {},
    ...overrides,
  };
}

describe("desktopHeaderLeaf", () => {
  it("assembles a bare leaf with nothing composed", () => {
    const column = { key: "team" };
    const leaf = desktopHeaderLeaf(leafCtx(), column, 1, 1, new Map());
    expect(leaf.column).toBe(column);
    expect(leaf.headerIndex).toBe(1);
    expect(leaf.rowSpan).toBe(1);
    expect(leaf.headerProps).toEqual({ "data-key": "team", style: undefined });
    expect(leaf.columnHeaderProps).toEqual({});
    expect(leaf.style).toEqual({});
    expect(leaf.sortDir).toBeUndefined();
    expect(leaf.sortActive).toBe(false);
    expect(leaf.sortIndex).toBeUndefined();
    expect(leaf.headerDef).toBeUndefined();
    expect(leaf.pinSide).toBeUndefined();
    expect(leaf.resizeHandleProps).toBeUndefined();
    expect(leaf.columnName).toBe("team");
    expect(leaf.showColumnCheckbox).toBe(false);
    expect(leaf.columnCheckboxChecked).toBe(false);
    expect(leaf.onToggleColumn).toBeUndefined();
    expect(leaf.columnSelectAriaLabel).toBe("Select column: team");
  });

  it("assembles sort, filter, pin, resize, drag and column selection", () => {
    const toggleSort = vi.fn();
    const toggleColumn = vi.fn();
    const getColumnHeaderProps = vi.fn(
      (index: number, options: { sortable?: boolean }) => ({
        "aria-colindex": index + 1,
        sortable: options.sortable,
      })
    );
    const columnResizeHandleProps = vi.fn(() => ({ role: "separator" }));
    const setWidth = vi.fn();
    const headerDragProps = vi.fn((key: string) => ({ draggable: key }));
    const ctx = leafCtx({
      table: {
        ...leafCtx().table,
        getSortButtonProps: () => ({
          onClick: toggleSort,
          "data-sort-index": 1,
        }),
      },
      headStyle: () => ({ color: "red" }),
      groupingPanel: { headerDragProps },
      gridFocus: {
        columnCheckbox: true,
        getColumnHeaderProps,
        isColumnSelected: (index) => index === 7,
        toggleColumn,
      },
      headerFilters: true,
      filterDefs: [{ key: "name", type: "text" }],
      pinOffset: pinStart,
      setWidth,
      columnResizeHandleProps,
      labels: { selectColumn: "Pick column" },
    });
    const column = { key: "name", header: "Name", sortable: true };
    const leaf = desktopHeaderLeaf(ctx, column, 0, 2, new Map([["name", 7]]));

    // A pinned header names the edge it holds, as its body cells do.
    expect(leaf.headerProps).toEqual({
      "data-key": "name",
      "data-pinned": "start",
      style: { color: "red" },
      draggable: "name",
    });
    // A windowed header addresses its absolute column.
    expect(getColumnHeaderProps).toHaveBeenCalledWith(7, { sortable: true });
    expect(leaf.columnHeaderProps).toEqual({
      "aria-colindex": 8,
      sortable: true,
    });
    expect(leaf.style).toEqual({ color: "red", verticalAlign: "middle" });
    expect(leaf.sortDir).toBe("asc");
    expect(leaf.sortActive).toBe(true);
    expect(leaf.sortIndex).toBe(1);
    expect(leaf.sortButtonProps.onClick).toBe(toggleSort);
    expect(leaf.headerDef).toEqual({ key: "name", type: "text" });
    expect(leaf.pinSide).toBe("start");
    expect(columnResizeHandleProps).toHaveBeenCalledWith(
      "name",
      setWidth,
      "Resize: Name"
    );
    expect(leaf.resizeHandleProps).toEqual({ role: "separator" });
    expect(leaf.columnName).toBe("Name");
    expect(leaf.showColumnCheckbox).toBe(true);
    expect(leaf.columnCheckboxChecked).toBe(true);
    leaf.onToggleColumn?.();
    expect(toggleColumn).toHaveBeenCalledWith(7);
    expect(leaf.columnSelectAriaLabel).toBe("Pick column: Name");
  });

  it("offers no drag for a column closed to grouping", () => {
    const headerDragProps = vi.fn(() => ({ draggable: true }));
    const leaf = desktopHeaderLeaf(
      leafCtx({ groupingPanel: { headerDragProps } }),
      { key: "team", groupable: false },
      0,
      1,
      new Map()
    );
    expect(headerDragProps).not.toHaveBeenCalled();
    expect(leaf.headerProps).toEqual({ "data-key": "team", style: undefined });
  });

  it("falls back to the rendered index and ignores a non-numeric sort index", () => {
    const isColumnSelected = vi.fn(() => false);
    const leaf = desktopHeaderLeaf(
      leafCtx({
        table: {
          ...leafCtx().table,
          getSortButtonProps: () => ({ "data-sort-index": "1" }),
        },
        gridFocus: {
          columnCheckbox: false,
          getColumnHeaderProps: () => undefined as never,
          isColumnSelected,
          toggleColumn: vi.fn(),
        },
        headerFilters: true,
      }),
      { key: "team" },
      3,
      1,
      new Map()
    );
    expect(isColumnSelected).toHaveBeenCalledWith(3);
    expect(leaf.sortIndex).toBeUndefined();
    expect(leaf.columnHeaderProps).toEqual({});
    expect(leaf.showColumnCheckbox).toBe(false);
    expect(leaf.headerDef).toBeUndefined();
  });
});

describe("absoluteColumnIndex", () => {
  it("maps each visible column to its position in the full list", () => {
    const index = absoluteColumnIndex([
      { key: "name" },
      { key: "team" },
      { key: "total" },
    ]);
    expect([...index.entries()]).toEqual([
      ["name", 0],
      ["team", 1],
      ["total", 2],
    ]);
    expect(absoluteColumnIndex([]).size).toBe(0);
  });
});

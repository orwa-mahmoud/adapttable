/**
 * Desktop table assembly — wiring, not pixels.
 *
 * Everything an HTML-table body needs before a kit paints it: the body slots
 * in reading order (summary rows, pinned rows, the top pad, the grouped or
 * scrolled rows with their extras, the bottom pad, and the bottom pins), each
 * row's wiring and DOM props, the memo policy that decides when a row
 * re-renders, the header leaves with their sort, filter, resize and
 * selection state, the sticky and scroll-box rules, and the table's
 * minimum width. A binding supplies its refs and render nodes; the rules
 * are the same in every binding.
 */
import type { ColumnMetadata } from "../columnModel";
import { columnHeaderLabel } from "../columns/columnHeader";
import {
  edgePinStyle,
  PIN_Z,
  type PinLeads,
  type PinnedCellStyle,
  type PinOffset,
} from "../columns/columnLayoutModel";
import { fittedTableStyle } from "../columns/columnSizing";
import { tableMinWidth } from "../columns/columnWidths";
import type { FilterDef } from "../filters/filterDefs";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import type { BodyCell } from "../rows/cellSpan";
import type { ExtraEntry, ExtraRow } from "../rows/extraRows";
import {
  pinnedSummaryEntries,
  pinnedSummaryPart,
} from "../rows/pinnedSummaryRows";
import { rowClickProps } from "../rows/rowClickProps";
import type { EditableCellEditing } from "../rows/rowEditingDigest";
import type { RowPinLookup, RowPinSide } from "../rows/rowPinModel";
import {
  cellsForRow,
  pinnedRowCellStyle,
  pinnedRowSticky,
  resolveRowStyle,
  rowEditingSignature,
  rowIsDirty,
  rowPinSignature,
  rowSpanSignature,
  rowStyleSignature,
} from "../rows/rowPresentation";
import {
  type RowReorderDigest,
  rowReorderSignature,
} from "../rows/rowReorderModel";
import type { RowHeight, RowStyle } from "../rows/rowStyle";
import type { CssProperties } from "../style/cssProperties";
import type { TreeEntry } from "../tree/treeRows";
import type { ColumnHeaderController } from "../types";
import type { VirtualTableRow } from "../virtual/virtualTableModel";
import {
  type ChromeBodySlot,
  type ChromeExtraSlot,
  type ChromeGroupEntry,
  desktopBodyPinStyle,
  desktopDetailMeasureRef,
  desktopEdgeHeadPin,
  desktopHeadCellGeometry,
  desktopPinSignature,
  desktopRowMeasureRef,
  desktopScrollBoxStyle,
  type RowPairMeasurer,
} from "./chromeModel";
import {
  bodyRowEntries,
  columnSelectLabel,
  filterDefForColumn,
  isExtraEntry,
  pinnedRowPart,
  rowFlashSignature,
  rowReorderDropStyle,
} from "./leanAssembly";

/* ── Memo policy ───────────────────────────────────────────────────── */

/**
 * The row-wiring fields a memoized desktop row compares. Every other field
 * is either derived from these or a stable callback, so a row re-renders
 * exactly when something it paints changed.
 *
 * @public
 */
export const DESKTOP_ROW_WIRING_KEYS = [
  "row",
  "index",
  "id",
  "selected",
  "expanded",
  "treeEntry",
  "columns",
  "spanSignature",
  "labels",
  "showActions",
  "showReorder",
  "reorderSignature",
  "rowPinSignature",
  "rowPinSide",
  "pinRowSticky",
  "rowPinOffset",
  "sourceIndex",
  "reorderPinned",
  "rowActions",
  "rowActionsLayout",
  "cellSpanAppearance",
  "renderRowActions",
  "columnSpan",
  "columnWidths",
  "pinSignature",
  "hasStartPin",
  "hasEndPin",
  "actionsPinned",
  "rowClass",
  "rowStyleSignature",
  "flashSignature",
  "clickable",
  "hasPrefetch",
  "editingSignature",
  "gridFocus",
  "treeColumnKey",
] as const;

/**
 * Whether a memoized row can skip re-rendering: every field in
 * {@link DESKTOP_ROW_WIRING_KEYS} is unchanged.
 *
 * @public
 */
export function desktopRowWiringEqual(
  prev: Readonly<
    Partial<Record<(typeof DESKTOP_ROW_WIRING_KEYS)[number], unknown>>
  >,
  next: Readonly<
    Partial<Record<(typeof DESKTOP_ROW_WIRING_KEYS)[number], unknown>>
  >
): boolean {
  return DESKTOP_ROW_WIRING_KEYS.every((key) => prev[key] === next[key]);
}

/* ── Row wiring ────────────────────────────────────────────────────── */

/** Reorder state as a desktop row reads it. */
export interface WiringReorder<TRow> extends RowReorderDigest {
  rowAttrs?: (
    id: string,
    index: number
  ) =>
    | { "data-dragging"?: ""; "data-drop"?: "before" | "inside" | "after" }
    | undefined;
  dropProps?: (
    index: number,
    row: TRow,
    windowStart: number
  ) => object | undefined;
}

/**
 * What every desktop row of one table shares. The fields core reads are
 * typed; the rest pass through to the row as they are.
 *
 * @public
 */
export interface DesktopRowWiringContext<TRow> {
  /** Per-row body cells. */
  readonly cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /** Host row style. */
  readonly rowStyle: RowStyle<TRow> | undefined;
  /** Host row height. */
  readonly rowHeight: RowHeight<TRow> | undefined;
  /** Injected-column insets. */
  readonly leads: PinLeads;
  /** Whether pinned rows can stick. */
  readonly pinRowSticky: boolean;
  /** Where a pinned row sits, clearing a sticky header. */
  readonly rowPinOffset: number;
  /** Pair measurer, when details can open under a window. */
  readonly measureRowPair: RowPairMeasurer | undefined;
  /** Single-element measurer. */
  readonly measureElement: ((element: Element | null) => void) | undefined;
  /** Reorder state, when composed. */
  readonly rowReorder: WiringReorder<TRow> | undefined;
  /** The table's row prop-getter. */
  readonly table: { getRowProps(row: TRow, index: number): object };
  /** Grid focus, when composed. */
  readonly gridFocus: { getRowPropsAt(index: number): object } | undefined;
  /** The host's row click, if any. */
  readonly onRowClick: ((row: TRow) => void) | undefined;
  /** Stable click forwarder. */
  readonly handleRowClick: (row: TRow) => void;
  /** Index of the first loaded row in the dataset. */
  readonly windowStart: number;
  /** Selection, when on. */
  readonly selection: { isSelected(id: string): boolean } | null;
  /** Editing, when on. */
  readonly editing: unknown;
  /** The host's prefetch, if any. */
  readonly prefetch: ((row: TRow) => void) | undefined;
  /** Stable prefetch forwarder. */
  readonly handlePrefetch: (row: TRow) => void;
  /** Visible columns. */
  readonly columns: readonly { readonly key: string }[];
  /** Resolved labels. */
  readonly labels: { readonly pinnedSummaryRow: string };
  /** Detail expansion, when row detail is on. */
  readonly expansionState: { isExpanded(id: string): boolean } | undefined;
  /** Whether the actions column renders. */
  readonly showActions: boolean;
  /** Whether the reorder column renders. */
  readonly showReorder: boolean;
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** Whether the reorder column is start-pinned. */
  readonly reorderPinned: boolean;
  /** Row pinning, when composed. */
  readonly rowPinning: RowPinLookup | undefined;
  /** Row actions. */
  readonly rowActions: unknown;
  /** Row actions layout. */
  readonly rowActionsLayout: unknown;
  /** Span appearance. */
  readonly cellSpanAppearance: unknown;
  /** Actions-cell override. */
  readonly renderRowActions: unknown;
  /** Confirmation gate. */
  readonly confirm: unknown;
  /** Full-width colSpan. */
  readonly columnSpan: number;
  /** Column-window spacers. */
  readonly columnSpacers: { start: number; end: number } | undefined;
  /** Tree bundle, when rows are a tree. */
  readonly tree:
    | {
        readonly columnKey?: string;
        readonly expansion: { toggle: (id: string) => void };
      }
    | undefined;
  /** Measured widths. */
  readonly columnWidths: Readonly<Record<string, number>> | undefined;
  /** Pin lookup. */
  readonly pinOffset: ((key: string) => PinOffset | undefined) | undefined;
  /** Pin layout memo key. */
  readonly pinSignature: string;
  /** Anything pinned at the start. */
  readonly hasStartPin: boolean;
  /** Anything pinned at the end. */
  readonly hasEndPin: boolean;
  /** Whether the actions column sticks. */
  readonly stickActions: boolean;
  /** Host row class. */
  readonly rowClassName:
    ((row: TRow, index: number) => string | undefined) | undefined;
  /** Cell flash lookup. */
  readonly isCellFlashing:
    ((rowId: string, columnKey: string) => boolean) | undefined;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** How many summary rows sit above the body. */
  readonly summaryTopCount: number;
  /** Stable selection toggle. */
  readonly onToggleSelect: (id: string) => void;
  /** Stable expansion toggle. */
  readonly onToggleExpand: (id: string) => void;
  /** Stable detail renderer. */
  readonly renderDetail: (row: TRow) => unknown;
}

/**
 * One row's place in the body.
 *
 * @public
 */
export interface DesktopRowWiringArgs<TRow> {
  /** The row. */
  readonly row: TRow;
  /** Position within the rendered window. */
  readonly index: number;
  /** Row identity. */
  readonly id: string;
  /** Index in the source rows. */
  readonly sourceIndex: number;
  /** Which edge the row is pinned to. */
  readonly rowPinSide: RowPinSide | undefined;
  /** Its tree entry, when rows are a tree. */
  readonly treeEntry: TreeEntry<TRow> | undefined;
  /** Whether the virtualizer measures it. */
  readonly measure: boolean;
  /** Whether it is a host summary row. */
  readonly summary?: boolean;
}

/**
 * Everything one desktop row needs. Fields the context passes through keep
 * the binding's own types.
 *
 * @public
 */
export interface DesktopRowWiringModel<
  TRow,
  C extends DesktopRowWiringContext<TRow>,
> {
  gridFocus: C["gridFocus"];
  row: TRow;
  index: number;
  id: string;
  table: C["table"];
  columns: C["columns"];
  bodyCells: readonly BodyCell<TRow>[];
  spanSignature: string;
  labels: C["labels"];
  selected: boolean | undefined;
  expanded: boolean | undefined;
  showActions: boolean;
  showReorder: boolean;
  rowReorder: C["rowReorder"];
  windowStart: number;
  rowCount: number;
  reorderPinned: boolean;
  reorderSignature: string | null;
  rowPinSide: RowPinSide | undefined;
  pinRowSticky: boolean;
  rowPinOffset: number;
  rowPinSignature: string | null;
  sourceIndex: number;
  rowActions: C["rowActions"];
  rowActionsLayout: C["rowActionsLayout"];
  cellSpanAppearance: C["cellSpanAppearance"];
  renderRowActions: C["renderRowActions"];
  confirm: C["confirm"];
  columnSpan: number;
  columnSpacers: C["columnSpacers"];
  treeEntry: TreeEntry<TRow> | undefined;
  treeColumnKey: string | undefined;
  onToggleTree: ((id: string) => void) | undefined;
  columnWidths: C["columnWidths"];
  pinOffset: C["pinOffset"];
  pinSignature: string;
  hasStartPin: boolean;
  hasEndPin: boolean;
  actionsPinned: boolean;
  rowClass: string | undefined;
  rowVisualStyle: CssProperties | undefined;
  rowStyleSignature: string;
  flashSignature: string;
  isCellFlashing: C["isCellFlashing"];
  clickable: boolean;
  hasPrefetch: boolean;
  editing: C["editing"];
  rows: C["rows"];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
  onRowClick: (row: TRow) => void;
  onPrefetch: (row: TRow) => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  renderDetail: C["renderDetail"];
  measureElement: C["measureElement"];
  measureRowPair: C["measureRowPair"];
  leads: PinLeads;
  focusIndex: number;
  pinPart: DesktopRowPinPart;
  pinSticky: ReturnType<typeof pinnedRowSticky>;
  edgeRowPin: ReturnType<typeof pinnedRowCellStyle>;
  measureRef: ((element: Element | null) => void) | undefined;
  detailMeasureRef: ((element: Element | null) => void) | undefined;
  rowDomProps: Record<string, unknown>;
  bodyPinStyle: (key: string) => ReturnType<typeof desktopBodyPinStyle>;
  /** The edge a body cell's column is pinned to, for its `data-pinned`. */
  bodyPinSide: (key: string) => PinOffset["side"] | undefined;
}

/**
 * The part a pinned or summary row carries, or `undefined` for a scrolling
 * row.
 *
 * @public
 */
export type DesktopRowPinPart =
  | "pinned-top"
  | "pinned-bottom"
  | "pinned-summary-top"
  | "pinned-summary-bottom"
  | undefined;

function summaryOrPinPart(
  summary: boolean,
  side: RowPinSide | undefined
): DesktopRowPinPart {
  if (!summary) return pinnedRowPart(side);
  if (!side) return undefined;
  return pinnedSummaryPart(side);
}

/**
 * The index focus and ARIA address a row by: a summary row counts from the
 * window, a data row from the source, after the summary rows above it.
 */
function desktopFocusIndex(
  summary: boolean,
  sourceIndex: number,
  windowStart: number,
  summaryTopCount: number
): number {
  if (summary) return sourceIndex - windowStart;
  return sourceIndex + summaryTopCount;
}

function omitWhenSummary(
  summary: boolean,
  value: boolean | undefined
): boolean | undefined {
  return summary ? undefined : value;
}

/**
 * The DOM props for one desktop row: the table's row props, selection and
 * grid ARIA, click and keyboard activation, reorder drop target, the pin and
 * part marks, and the merged style. A summary row takes none of the row's
 * interactions.
 *
 * @public
 */
export function desktopRowDomProps<TRow>(args: {
  readonly table: { getRowProps(row: TRow, index: number): object };
  readonly row: TRow;
  readonly focusIndex: number;
  readonly gridFocus: { getRowPropsAt(index: number): object } | undefined;
  readonly onRowClick: ((row: TRow) => void) | undefined;
  readonly handleRowClick: (row: TRow) => void;
  readonly summary: boolean;
  readonly rowReorder: WiringReorder<TRow> | undefined;
  readonly index: number;
  readonly windowStart: number;
  readonly reorderAttrs: ReturnType<
    NonNullable<WiringReorder<TRow>["rowAttrs"]>
  >;
  readonly rowPinSide: RowPinSide | undefined;
  readonly pinPart: DesktopRowPinPart;
  readonly selection: { isSelected(id: string): boolean } | null;
  readonly id: string;
  readonly editing: unknown;
  readonly labels: { readonly pinnedSummaryRow: string };
  readonly visualStyle: CssProperties | undefined;
  readonly pinSticky: object | undefined;
  readonly prefetch: ((row: TRow) => void) | undefined;
  readonly handlePrefetch: (row: TRow) => void;
}): Record<string, unknown> {
  const click =
    args.summary || !args.onRowClick ? undefined : args.handleRowClick;
  const dropProps = args.summary
    ? undefined
    : args.rowReorder?.dropProps?.(args.index, args.row, args.windowStart);
  const selected =
    !args.summary && args.selection?.isSelected(args.id) === true;
  // The live selection is the one the row's checkbox toggles, so it is what
  // the row announces; a table without selection announces nothing.
  const ariaSelected =
    args.summary || !args.selection
      ? undefined
      : args.selection.isSelected(args.id);
  const clickable = !args.summary && args.onRowClick !== undefined;
  const editing = args.editing as EditableCellEditing<TRow> | undefined;
  return {
    ...args.table.getRowProps(args.row, args.focusIndex),
    "aria-selected": ariaSelected,
    ...args.gridFocus?.getRowPropsAt(args.focusIndex),
    ...rowClickProps(args.row, click, args.focusIndex),
    ...dropProps,
    ...args.reorderAttrs,
    "data-row-pin": args.rowPinSide,
    "data-adapttable-part": args.pinPart ?? "row",
    "data-stagger": "",
    "data-selected": selected ? "" : undefined,
    "data-dirty": rowIsDirty(editing, args.id) ? "" : undefined,
    "data-clickable": clickable ? "" : undefined,
    "aria-label": args.summary ? args.labels.pinnedSummaryRow : undefined,
    style: {
      ...args.visualStyle,
      ...args.pinSticky,
      ...rowReorderDropStyle(args.reorderAttrs),
    },
    onMouseEnter:
      args.prefetch && !args.summary
        ? () => args.handlePrefetch(args.row)
        : undefined,
  };
}

/**
 * Assemble one desktop row's wiring.
 *
 * @param ctx - What every row of the table shares.
 * @param args - This row's place in the body.
 * @returns The wiring a memoized row renders from.
 *
 * @public
 */
export function desktopRowWiring<TRow, C extends DesktopRowWiringContext<TRow>>(
  ctx: C,
  args: DesktopRowWiringArgs<TRow>
): DesktopRowWiringModel<TRow, C> {
  const { row, index, id, sourceIndex, rowPinSide, treeEntry, measure } = args;
  const summary = args.summary === true;
  const bodyCells = cellsForRow(ctx.cellsByRow, id);
  const visualStyle = resolveRowStyle(
    ctx.rowStyle,
    ctx.rowHeight,
    row,
    sourceIndex
  );
  const focusIndex = desktopFocusIndex(
    summary,
    sourceIndex,
    ctx.windowStart,
    ctx.summaryTopCount
  );
  const pinPart = summaryOrPinPart(summary, rowPinSide);
  const pinSticky = pinnedRowSticky(
    rowPinSide,
    ctx.pinRowSticky,
    ctx.rowPinOffset
  );
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, ctx.rowPinOffset, true);
  const reorderAttrs = summary
    ? undefined
    : ctx.rowReorder?.rowAttrs?.(id, index);
  const editing = ctx.editing as EditableCellEditing<TRow> | undefined;
  const { pinOffset, leads, rowPinOffset } = ctx;
  return {
    gridFocus: ctx.gridFocus,
    row,
    index,
    id,
    table: ctx.table,
    columns: ctx.columns,
    bodyCells,
    spanSignature: rowSpanSignature(bodyCells),
    labels: ctx.labels,
    selected: omitWhenSummary(summary, ctx.selection?.isSelected(id)),
    expanded: omitWhenSummary(summary, ctx.expansionState?.isExpanded(id)),
    showActions: summary ? false : ctx.showActions,
    showReorder: summary ? false : ctx.showReorder,
    rowReorder: ctx.rowReorder,
    windowStart: ctx.windowStart,
    rowCount: ctx.rows.length,
    reorderPinned: ctx.reorderPinned,
    reorderSignature: rowReorderSignature(ctx.rowReorder, id, index),
    rowPinSide,
    pinRowSticky: ctx.pinRowSticky,
    rowPinOffset,
    rowPinSignature: rowPinSignature(ctx.rowPinning, id),
    sourceIndex,
    rowActions: ctx.rowActions,
    rowActionsLayout: ctx.rowActionsLayout,
    cellSpanAppearance: ctx.cellSpanAppearance,
    renderRowActions: ctx.renderRowActions,
    confirm: ctx.confirm,
    columnSpan: ctx.columnSpan,
    columnSpacers: ctx.columnSpacers,
    treeEntry,
    treeColumnKey: ctx.tree?.columnKey,
    onToggleTree: ctx.tree?.expansion.toggle,
    columnWidths: ctx.columnWidths,
    pinOffset,
    pinSignature: ctx.pinSignature,
    hasStartPin: ctx.hasStartPin,
    hasEndPin: ctx.hasEndPin,
    actionsPinned: ctx.stickActions,
    rowClass: ctx.rowClassName?.(row, sourceIndex),
    rowVisualStyle: visualStyle,
    rowStyleSignature: rowStyleSignature(visualStyle),
    flashSignature: rowFlashSignature(ctx.isCellFlashing, id, ctx.columns),
    isCellFlashing: ctx.isCellFlashing,
    clickable: Boolean(ctx.onRowClick),
    hasPrefetch: Boolean(ctx.prefetch),
    editing: ctx.editing,
    rows: ctx.rows,
    getRowId: ctx.getRowId,
    editingSignature: rowEditingSignature(editing, id),
    onRowClick: ctx.handleRowClick,
    onPrefetch: ctx.handlePrefetch,
    onToggleSelect: ctx.onToggleSelect,
    onToggleExpand: ctx.onToggleExpand,
    renderDetail: ctx.renderDetail,
    measureElement: measure ? ctx.measureElement : undefined,
    measureRowPair: measure ? ctx.measureRowPair : undefined,
    leads,
    focusIndex,
    pinPart,
    pinSticky,
    edgeRowPin,
    measureRef: measure
      ? desktopRowMeasureRef(
          rowPinSide,
          ctx.measureRowPair,
          index,
          ctx.measureElement
        )
      : undefined,
    detailMeasureRef: measure
      ? desktopDetailMeasureRef(rowPinSide, ctx.measureRowPair, index)
      : undefined,
    rowDomProps: desktopRowDomProps({
      table: ctx.table,
      row,
      focusIndex,
      gridFocus: ctx.gridFocus,
      onRowClick: ctx.onRowClick,
      handleRowClick: ctx.handleRowClick,
      summary,
      rowReorder: ctx.rowReorder,
      index,
      windowStart: ctx.windowStart,
      reorderAttrs,
      rowPinSide,
      pinPart,
      selection: ctx.selection,
      id,
      editing,
      labels: ctx.labels,
      visualStyle,
      pinSticky,
      prefetch: ctx.prefetch,
      handlePrefetch: ctx.handlePrefetch,
    }),
    bodyPinStyle: (key: string) =>
      desktopBodyPinStyle(key, pinOffset, leads, rowPinSide, rowPinOffset),
    bodyPinSide: (key: string) => pinOffset?.(key)?.side,
  };
}

/* ── Body slots ────────────────────────────────────────────────────── */

/**
 * What {@link desktopBodySlots} lays out.
 *
 * @public
 */
export interface DesktopBodySlotsInput<TRow, TWiring, TStyle> {
  /** Top-pinned data rows. */
  readonly pinnedTopRows: readonly TRow[];
  /** Bottom-pinned data rows. */
  readonly pinnedBottomRows: readonly TRow[];
  /** Host summary rows above the body. */
  readonly pinnedSummaryTop: readonly TRow[];
  /** Host summary rows below the body. */
  readonly pinnedSummaryBottom: readonly TRow[];
  /** Host-injected rows. */
  readonly extraRows: readonly ExtraRow[] | undefined;
  /** The fill style for one extra row. */
  readonly extraFill: (key: string) => TStyle | undefined;
  /** Place extras among keyed entries. */
  readonly insertExtraRows: <T extends { key: string }>(
    entries: readonly T[],
    extras: readonly ExtraRow[] | undefined,
    keyOf: (entry: T) => string
  ) => readonly (T | ExtraEntry)[];
  /** Place extras among pinned rows. */
  readonly insertExtrasBeforeRows: (
    rows: readonly TRow[],
    extras: readonly ExtraRow[] | undefined,
    getRowId: (row: TRow) => string
  ) => readonly ({ key: string; row: TRow } | ExtraEntry)[];
  /** Top virtual spacer. */
  readonly paddingTop: number;
  /** Bottom virtual spacer. */
  readonly paddingBottom: number;
  /** Grouped entries, when grouping renders. */
  readonly grouping:
    { readonly entries: readonly GroupedFlatEntry<TRow>[] } | undefined;
  /** The rendered row entries. */
  readonly entries: readonly VirtualTableRow<TRow>[];
  /** The tree, when rows are a tree. */
  readonly tree: { readonly entries: readonly TreeEntry<TRow>[] } | undefined;
  /** Row identity. */
  readonly getRowId: (row: TRow) => string;
  /** Full-width colSpan. */
  readonly columnSpan: number;
  /** The rendered rows. */
  readonly rows: readonly TRow[];
  /** Build one row's wiring. */
  readonly wiring: (args: DesktopRowWiringArgs<TRow>) => TWiring;
}

function isGroupEntry<TRow>(
  entry: GroupedFlatEntry<TRow>
): entry is ChromeGroupEntry<TRow> {
  return (
    entry.kind === "group" ||
    entry.kind === "groupFooter" ||
    entry.kind === "groupMore"
  );
}

function extraSlot<TNode, TStyle>(
  slot: {
    kind: "separator" | "fullWidth";
    key: string;
    render?: () => unknown;
  },
  columnSpan: number,
  extraFill: (key: string) => TStyle | undefined
): ChromeExtraSlot<TNode, TStyle> {
  return {
    kind: "extra",
    key: slot.key,
    extraKind: slot.kind,
    colSpan: columnSpan,
    render:
      slot.kind === "fullWidth"
        ? (slot.render as (() => TNode) | undefined)
        : undefined,
    fillStyle: extraFill(slot.key),
  };
}

/**
 * The desktop body in reading order: summary rows, pinned rows (with their
 * extras), the top pad, the grouped or scrolled rows (with theirs), the
 * bottom pad, then the bottom pins and summaries.
 *
 * @public
 */
export function desktopBodySlots<
  TRow,
  TWiring,
  TNode = unknown,
  TStyle = unknown,
>(
  input: DesktopBodySlotsInput<TRow, TWiring, TStyle>
): ChromeBodySlot<TRow, TWiring, TNode, TStyle>[] {
  const slots: ChromeBodySlot<TRow, TWiring, TNode, TStyle>[] = [];
  const { getRowId, columnSpan, extraFill } = input;

  const summaries = (rows: readonly TRow[], side: RowPinSide) => {
    for (const entry of pinnedSummaryEntries(rows, side)) {
      slots.push({
        kind: "row",
        key: entry.id,
        wiring: input.wiring({
          row: entry.row,
          index: entry.index,
          id: entry.id,
          sourceIndex: entry.index,
          rowPinSide: side,
          treeEntry: undefined,
          measure: false,
          summary: true,
        }),
      });
    }
  };

  const pinned = (rows: readonly TRow[], side: RowPinSide) => {
    for (const slot of input.insertExtrasBeforeRows(
      rows,
      input.extraRows,
      getRowId
    )) {
      if (isExtraEntry(slot)) {
        slots.push(extraSlot<TNode, TStyle>(slot, columnSpan, extraFill));
        continue;
      }
      const id = getRowId(slot.row);
      const sourceIndex = Math.max(
        0,
        input.rows.findIndex((item) => getRowId(item) === id)
      );
      slots.push({
        kind: "row",
        key: slot.key,
        wiring: input.wiring({
          row: slot.row,
          index: sourceIndex,
          id,
          sourceIndex,
          rowPinSide: side,
          treeEntry: undefined,
          measure: false,
        }),
      });
    }
  };

  const pad = (key: "pad-top" | "pad-bottom", height: number) => {
    if (height > 0)
      slots.push({ kind: "virtualPad", key, height, colSpan: columnSpan });
  };

  summaries(input.pinnedSummaryTop, "top");
  pinned(input.pinnedTopRows, "top");
  pad("pad-top", input.paddingTop);
  if (input.grouping) {
    for (const entry of input.grouping.entries) {
      if (entry.kind === "separator" || entry.kind === "fullWidth") {
        slots.push(extraSlot<TNode, TStyle>(entry, columnSpan, extraFill));
        continue;
      }
      if (isGroupEntry(entry)) {
        slots.push({ kind: "group", key: entry.key, entry });
        continue;
      }
      slots.push({
        kind: "row",
        key: entry.key,
        wiring: input.wiring({
          row: entry.row,
          index: entry.index,
          id: getRowId(entry.row),
          sourceIndex: entry.index,
          rowPinSide: undefined,
          treeEntry: undefined,
          measure: true,
        }),
      });
    }
  } else {
    for (const slot of input.insertExtraRows(
      bodyRowEntries(input.entries, input.tree),
      input.extraRows,
      (entry) => entry.key
    )) {
      if (isExtraEntry(slot)) {
        slots.push(extraSlot<TNode, TStyle>(slot, columnSpan, extraFill));
        continue;
      }
      const { row, index, key, treeEntry, sourceIndex } = slot;
      slots.push({
        kind: "row",
        key,
        wiring: input.wiring({
          row,
          index,
          id: getRowId(row),
          sourceIndex: sourceIndex ?? index,
          rowPinSide: undefined,
          treeEntry,
          measure: true,
        }),
      });
    }
  }
  pad("pad-bottom", input.paddingBottom);
  pinned(input.pinnedBottomRows, "bottom");
  summaries(input.pinnedSummaryBottom, "bottom");
  return slots;
}

/* ── Sticky, scroll and width rules ────────────────────────────────── */

/**
 * The sticky header style: at the top of the scroll box when the table
 * scrolls inside one, at `stickyTop` on the page otherwise.
 *
 * @public
 */
export interface DesktopStickyPlan {
  /** Whether the table scrolls inside a bounded box. */
  readonly inScrollBox: boolean;
  /** Where a sticky header sticks. */
  readonly headerStickTop: number;
  /** Where a pinned row sits, clearing a sticky header. */
  readonly rowPinOffset: number;
  /** The header's sticky style, absent when it does not stick. */
  readonly stickyStyle:
    { position: "sticky"; top: number; zIndex: number } | undefined;
  /** Present only when the header sticks. */
  readonly stickyAttr: true | undefined;
  /** The scroll box's overflow style. */
  readonly boxStyle: ReturnType<typeof desktopScrollBoxStyle>;
}

/**
 * Where the header sticks and how the scroll box overflows.
 *
 * A `maxHeight`, a pinned column or real horizontal overflow each put the
 * table in a scroll box; inside one, a sticky header sticks at 0 and a
 * pinned row sits under the header's measured height.
 *
 * @public
 */
export function desktopStickyPlan(input: {
  readonly maxHeight: number | undefined;
  readonly hasPinned: boolean;
  readonly overflowing: boolean;
  readonly stickyHeader: boolean;
  readonly stickyTop: number;
  readonly headerHeight: number;
}): DesktopStickyPlan {
  const inScrollBox =
    input.maxHeight != null || input.hasPinned || input.overflowing;
  const headerStickTop = inScrollBox ? 0 : input.stickyTop;
  return {
    inScrollBox,
    headerStickTop,
    rowPinOffset: input.stickyHeader ? headerStickTop + input.headerHeight : 0,
    stickyStyle: input.stickyHeader
      ? { position: "sticky", top: headerStickTop, zIndex: PIN_Z.header }
      : undefined,
    stickyAttr: input.stickyHeader || undefined,
    boxStyle: desktopScrollBoxStyle(
      input.maxHeight,
      input.hasPinned || input.overflowing
    ),
  };
}

/**
 * Which edges have a pinned data column, and the pin layout's memo key.
 *
 * @public
 */
export function desktopPinEdges(
  columns: readonly { readonly key: string }[],
  pinOffset: ((key: string) => PinOffset | undefined) | undefined
): { hasStartPin: boolean; hasEndPin: boolean; signature: string } {
  return {
    hasStartPin: columns.some(
      (column) => pinOffset?.(column.key)?.side === "start"
    ),
    hasEndPin: columns.some(
      (column) => pinOffset?.(column.key)?.side === "end"
    ),
    signature: desktopPinSignature(columns, pinOffset),
  };
}

/**
 * A header cell's style: the sticky header, its column pin, its width, and
 * a positioning box when it anchors a resize handle.
 *
 * @public
 */
export function desktopHeadCellStyle(
  column: { key: string; width?: number | string },
  options: {
    pinOffset?: (key: string) => PinOffset | undefined;
    leads: PinLeads;
    columnWidths?: Readonly<Record<string, number>>;
    setWidth?: (key: string, width: number) => void;
    stickyStyle?: object;
  }
): CssProperties | undefined {
  const { pin, width, anchorsResize } = desktopHeadCellGeometry(
    column,
    options
  );
  if (!options.stickyStyle && !pin && width == null && !anchorsResize) {
    return undefined;
  }
  const merged: CssProperties = {
    ...options.stickyStyle,
    ...pin,
    ...(width != null && { width }),
  };
  if (anchorsResize && !merged.position) merged.position = "relative";
  return merged;
}

/**
 * An injected header cell's style: the sticky header plus its edge pin.
 *
 * @public
 */
export function desktopEdgeHeadStyle(
  side: "start" | "end",
  active: boolean,
  stickyStyle: object | undefined
): CssProperties | undefined {
  const edge = desktopEdgeHeadPin(side, active);
  if (!stickyStyle && !edge) return undefined;
  return { ...stickyStyle, ...edge };
}

/**
 * An injected body cell's edge pin.
 *
 * @public
 */
export function desktopEdgeBodyStyle(
  side: "start" | "end",
  active: boolean
): PinnedCellStyle | undefined {
  return edgePinStyle(side, active, PIN_Z.body);
}

/**
 * The `<table>` style: a minimum width that holds every column plus the
 * injected chrome, and the fitted layout when `fitColumns` is on. Absent
 * when neither applies.
 *
 * @public
 */
export function desktopTableStyle(
  columns: readonly ColumnMetadata<never>[],
  options: {
    readonly columnWidths: Readonly<Record<string, number>> | undefined;
    readonly extraMinWidth: number;
    readonly fitColumns: boolean | undefined;
  }
): CssProperties | undefined {
  const minWidth = tableMinWidth(columns, {
    widths: options.columnWidths,
    extra: options.extraMinWidth,
  });
  const merged: CssProperties = {
    ...(minWidth > 0 ? { minWidth } : {}),
    ...fittedTableStyle(options.fitColumns),
  };
  return Object.keys(merged).length > 0 ? merged : undefined;
}

/* ── Header leaves ─────────────────────────────────────────────────── */

/**
 * A custom header's controller: the caption, and the sort it can drive.
 *
 * @public
 */
export function columnHeaderControllerFor(
  column: { readonly header?: unknown } & ColumnMetadata<never>,
  extras: {
    sortDir?: "asc" | "desc";
    sortIndex?: number;
    toggleSort?: (event?: { shiftKey?: boolean }) => void;
  } = {}
): ColumnHeaderController {
  return {
    label: column.header ?? columnHeaderLabel(column),
    sortDir: extras.sortDir,
    sortIndex: extras.sortIndex,
    toggleSort: extras.toggleSort ?? (() => undefined),
  };
}

/** Sort-button props as a header leaf reads them. */
export interface LeafSortProps {
  readonly onClick?: (event?: { shiftKey?: boolean }) => void;
  readonly "data-sort-index"?: unknown;
}

/** A column as a header leaf reads it. */
export interface LeafColumn {
  readonly key: string;
  readonly header?: unknown;
  readonly width?: number | string;
  readonly sortable?: boolean;
  readonly groupable?: boolean;
}

/**
 * What every header leaf of one table shares.
 *
 * @public
 */
export interface DesktopHeaderLeafContext<
  TRow,
  TColumn extends LeafColumn,
  THeaderProps extends { style?: object } = { style?: CssProperties },
  TSortProps extends LeafSortProps = LeafSortProps,
> {
  /** The table's prop-getters and sort state. */
  readonly table: {
    readonly columns: readonly { readonly key: string }[];
    readonly sortBy?: string;
    readonly sortDir?: "asc" | "desc";
    readonly source: {
      readonly sortLevels: readonly { key: string; dir: "asc" | "desc" }[];
    };
    getHeaderCellProps(
      column: TColumn,
      extra?: { style: object }
    ): THeaderProps;
    getSortButtonProps(column: TColumn): TSortProps;
  };
  /** A header cell's own style. */
  readonly headStyle: (column: TColumn) => object | undefined;
  /** Grouping strip drag, when the panel is composed. */
  readonly groupingPanel: { headerDragProps(key: string): object } | undefined;
  /** Grid focus, when composed. */
  readonly gridFocus:
    | {
        readonly columnCheckbox: boolean;
        getColumnHeaderProps(
          index: number,
          options: { sortable?: boolean }
        ): object;
        isColumnSelected(index: number): boolean;
        toggleColumn(index: number): void;
      }
    | undefined;
  /** Whether header filters render. */
  readonly headerFilters: boolean | undefined;
  /** Declarative filter definitions. */
  readonly filterDefs: readonly FilterDef<TRow>[] | undefined;
  /** Pin lookup. */
  readonly pinOffset: ((key: string) => PinOffset | undefined) | undefined;
  /** Resize setter, when columns resize. */
  readonly setWidth: ((key: string, width: number) => void) | undefined;
  /** The resize handle's label prefix. */
  readonly resizeLabel: string;
  /** Build the neutral resize-handle props. */
  readonly columnResizeHandleProps: (
    key: string,
    setWidth: (key: string, width: number) => void,
    label: string
  ) => unknown;
  /** Resolved labels. */
  readonly labels: { readonly selectColumn?: string };
}

/**
 * A header cell's sort direction: its place in a multi-sort chain, else the
 * single sort when it is the sorted column.
 *
 * @public
 */
export function headerSortDir(
  table: Pick<
    DesktopHeaderLeafContext<unknown, LeafColumn>["table"],
    "sortBy" | "sortDir" | "source"
  >,
  key: string
): "asc" | "desc" | undefined {
  const chainDir = table.source.sortLevels.find(
    (level) => level.key === key
  )?.dir;
  return chainDir ?? (table.sortBy === key ? table.sortDir : undefined);
}

/**
 * Assembled sort, filter, pin, resize and selection state for one leaf
 * header cell. The binding builds its caption from the sort state (see
 * {@link columnHeaderControllerFor}) and turns the resize props into its own
 * handler shape.
 *
 * @public
 */
export function desktopHeaderLeaf<
  TRow,
  TColumn extends LeafColumn,
  THeaderProps extends { style?: object } = { style?: CssProperties },
  TSortProps extends LeafSortProps = LeafSortProps,
>(
  ctx: DesktopHeaderLeafContext<TRow, TColumn, THeaderProps, TSortProps>,
  column: TColumn,
  headerIndex: number,
  rowSpan: number,
  absoluteIndex: ReadonlyMap<string, number>
): {
  column: TColumn;
  headerIndex: number;
  rowSpan: number;
  headerProps: THeaderProps;
  columnHeaderProps: Record<string, unknown>;
  style: CssProperties;
  sortDir: "asc" | "desc" | undefined;
  sortActive: boolean;
  sortButtonProps: TSortProps;
  sortIndex: number | undefined;
  headerDef: FilterDef<TRow> | undefined;
  pinSide: PinOffset["side"] | undefined;
  resizeHandleProps: unknown;
  columnName: string;
  showColumnCheckbox: boolean;
  columnCheckboxChecked: boolean;
  onToggleColumn: (() => void) | undefined;
  columnSelectAriaLabel: string;
} {
  const { table, gridFocus, setWidth } = ctx;
  const localStyle = ctx.headStyle(column);
  const pinSide = ctx.pinOffset?.(column.key)?.side;
  const headerProps = {
    ...table.getHeaderCellProps(column, localStyle && { style: localStyle }),
    // Pinned header cells say which edge they hold, as body cells do.
    ...(pinSide ? { "data-pinned": pinSide } : {}),
    // A column the host closed to grouping offers no drag: the reader is
    // never handed a gesture the panel would refuse.
    ...(column.groupable === false
      ? {}
      : ctx.groupingPanel?.headerDragProps(column.key)),
  };
  const sortDir = headerSortDir(table, column.key);
  const sortButtonProps = table.getSortButtonProps(column);
  const rawIndex = sortButtonProps["data-sort-index"];
  const sortIndex = typeof rawIndex === "number" ? rawIndex : undefined;
  // A windowed header is handed its position within the rendered slice, so
  // the absolute index is what column selection, the header checkbox and
  // `aria-colindex` all have to name — windowed or not.
  const focusIndex = absoluteIndex.get(column.key) ?? headerIndex;
  const columnName =
    typeof column.header === "string" ? column.header : column.key;
  return {
    column,
    headerIndex,
    rowSpan,
    headerProps,
    columnHeaderProps:
      (gridFocus?.getColumnHeaderProps(focusIndex, {
        sortable: column.sortable,
      }) as Record<string, unknown> | undefined) ?? {},
    style: {
      ...headerProps.style,
      ...(rowSpan > 1 ? { verticalAlign: "middle" } : {}),
    },
    sortDir,
    sortActive: sortDir !== undefined,
    sortButtonProps,
    sortIndex,
    headerDef:
      ctx.headerFilters === true
        ? filterDefForColumn(ctx.filterDefs ?? [], column.key)
        : undefined,
    pinSide,
    resizeHandleProps: setWidth
      ? ctx.columnResizeHandleProps(
          column.key,
          setWidth,
          `${ctx.resizeLabel}: ${columnName}`
        )
      : undefined,
    columnName,
    showColumnCheckbox: gridFocus?.columnCheckbox === true,
    columnCheckboxChecked: gridFocus?.isColumnSelected(focusIndex) ?? false,
    onToggleColumn: gridFocus
      ? () => gridFocus.toggleColumn(focusIndex)
      : undefined,
    columnSelectAriaLabel: columnSelectLabel(ctx.labels.selectColumn, {
      key: column.key,
      header: column.header as string | undefined,
    }),
  };
}

/**
 * Each visible column's position in the FULL visible list, built once per
 * render rather than searched per header cell.
 *
 * @public
 */
export function absoluteColumnIndex(
  columns: readonly { readonly key: string }[]
): ReadonlyMap<string, number> {
  return new Map(columns.map((column, index) => [column.key, index]));
}

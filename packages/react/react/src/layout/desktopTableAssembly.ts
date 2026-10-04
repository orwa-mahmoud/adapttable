/** Shared desktop-table assembly — wiring, not pixels. */
import {
  type ConfirmHandler,
  type FilterDef,
  type PinLeads,
  type pinnedSummaryPart,
  type PinOffset,
  resolveAssembly,
  type TableLabels,
  type TreeEntry,
} from "@adapttable/core";
import {
  absoluteColumnIndex,
  type BodyCell,
  bodyCellsHaveRowSpan,
  type ChromeBodySlot,
  type ChromeExtraSlot,
  type ChromeGroupEntry,
  type ChromeGroupSlot,
  type ChromeRowSlot,
  type ChromeVirtualPadSlot,
  DESKTOP_RESIZE_HANDLE_STYLE as NEUTRAL_DESKTOP_RESIZE_HANDLE_STYLE,
  desktopBodyPinStyle as neutralDesktopBodyPinStyle,
  desktopBodySlots,
  desktopChromeMetrics,
  type DesktopChromeWidths,
  desktopEdgeBodyStyle,
  desktopEdgeHeadStyle as neutralDesktopEdgeHeadStyle,
  desktopHasPinned,
  desktopHeadCellStyle as neutralDesktopHeadCellStyle,
  desktopHeaderLeaf,
  desktopPinEdges,
  desktopRowWiring,
  type DesktopRowWiringContext as DesktopRowWiringContextModel,
  desktopRowWiringEqual as neutralDesktopRowWiringEqual,
  desktopScrollBoxStyle as neutralDesktopScrollBoxStyle,
  desktopStickyPlan,
  desktopTableStyle,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  type pinnedRowCellStyle,
  type pinnedRowPart,
  type pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
} from "@adapttable/core/binding";
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  useCallback,
  useRef,
} from "react";

import type { ColumnDef } from "../columnDef";
import {
  columnHeaderController,
  columnsHaveFooter,
  resolveColumnHeader,
} from "../columns/columnHeader";
import {
  type ReactColumnResizeHandleProps,
  toReactColumnResizeHandleProps,
} from "../columns/reactColumnResize";
import { type EditableCellEditing } from "../editing/editableCellController";
import type { GridFocusState } from "../focus/useGridFocus";
import type { RowPinSide } from "../rows/rowPinning";
import {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "../tableRenderProps";
import type {
  CellElementProps,
  SortButtonElementProps,
  UseDataTableResult,
} from "../useDataTable/useDataTable";
import type { RowPairMeasurer } from "../virtual/measureRowPair";
import { useHorizontalOverflow } from "./useHorizontalOverflow";
import { useOffsetHeight } from "./useOffsetHeight";

export type { DesktopChromeWidths } from "@adapttable/core/binding";
export {
  DESKTOP_ACTIONS_WIDTH,
  DESKTOP_EXPANSION_WIDTH,
  DESKTOP_SELECTION_WIDTH,
  desktopChromeMetrics,
  desktopHasPinned,
  desktopPinSignature,
  desktopRowMeasureRef,
} from "@adapttable/core/binding";

/** Inline style for an absolutely-positioned column-resize handle. */
export const DESKTOP_RESIZE_HANDLE_STYLE: CSSProperties =
  NEUTRAL_DESKTOP_RESIZE_HANDLE_STYLE;

export type { EditableCellEditing } from "../editing/editableCellController";
export type { GridFocusState } from "../focus/useGridFocus";
export type { RowPinSide } from "../rows/rowPinning";
export type {
  CellElementProps,
  SortButtonElementProps,
  UseDataTableResult,
} from "../useDataTable/useDataTable";
export type { GroupedFlatEntry, TreeEntry } from "@adapttable/core";

/**
 * Options for {@link useDesktopTableAssembly}.
 *
 * @public
 */
export interface DesktopAssemblyOptions {
  /** Chrome column widths. */
  widths?: DesktopChromeWidths;
}

/**
 * Group-shaped body entries adapters hand to their group header.
 *
 * @public
 */
export type DesktopGroupEntry<TRow> = ChromeGroupEntry<TRow>;

/**
 * One host-injected extra in the assembled body.
 *
 * @public
 */
export type DesktopExtraSlot = ChromeExtraSlot<ReactNode, CSSProperties>;

/**
 * Virtual-window spacer.
 *
 * @public
 */
export type DesktopVirtualPadSlot = ChromeVirtualPadSlot;

/**
 * Group header / footer / more row.
 *
 * @public
 */
export type DesktopGroupSlot<TRow> = ChromeGroupSlot<TRow>;

/**
 * A data row, with wiring already assembled.
 *
 * @public
 */
export type DesktopRowSlot<TRow> = ChromeRowSlot<DesktopRowWiring<TRow>>;

/**
 * One visual slot in the assembled tbody, in reading order.
 *
 * @public
 */
export type DesktopBodySlot<TRow> = ChromeBodySlot<
  TRow,
  DesktopRowWiring<TRow>,
  ReactNode,
  CSSProperties
>;

/**
 * Shared visual + behaviour inputs for one memoized desktop row.
 * Adapters extend this with kit extras and paint with their own tags.
 *
 * @public
 */
export interface DesktopRowWiring<TRow> {
  /** Cell-navigation state, absent when the grid is not a keyboard grid. */
  gridFocus?: GridFocusState;
  /** The row being rendered. */
  row: TRow;
  /** Position within the rendered window. */
  index: number;
  /** Stable row identity from `getRowId`. */
  id: string;
  /** The table hook's result, for prop-getters and state. */
  table: UseDataTableResult<TRow>;
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** This row's cells, already resolved and span-aware. */
  bodyCells: readonly BodyCell<TRow>[];
  /** Memo key for the row's cell spans. */
  spanSignature: string;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Selection state, `undefined` when selection is off. */
  selected: boolean | undefined;
  /** Expansion state, `undefined` when expansion is off. */
  expanded: boolean | undefined;
  /** Whether the actions column is injected. */
  showActions: boolean;
  /** Whether the reorder column is injected. */
  showReorder: boolean;
  /** Row-reorder state, passed through to the handle. */
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  /** Index of the first rendered row, so a windowed index maps back. */
  windowStart: number;
  /** Rows in the whole dataset, not just the window. */
  rowCount: number;
  /** Whether the reorder column is start-pinned. */
  reorderPinned: boolean;
  /** Memo key for reorder state, null when reordering is off. */
  reorderSignature: string | null;
  /** Which edge this row is pinned to, if any. */
  rowPinSide?: RowPinSide;
  /** Whether pinned rows can stick — a row-spanning cell prevents it. */
  pinRowSticky: boolean;
  /** Where a pinned row sits, clearing a sticky header. */
  rowPinOffset: number;
  /** Memo key for row pinning, null when it is off. */
  rowPinSignature: string | null;
  /** Index in the source rows, which is what focus and ARIA address. */
  sourceIndex: number;
  /** Per-row actions, passed through. */
  rowActions: SharedTableRenderProps<TRow>["rowActions"];
  /** How the actions column lays its controls out. */
  rowActionsLayout: SharedTableRenderProps<TRow>["rowActionsLayout"];
  /** How a spanned cell is drawn. */
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  /** Host override for the actions cell. */
  renderRowActions: SharedTableRenderProps<TRow>["renderRowActions"];
  /** Confirmation gate a destructive action must pass. */
  confirm: ConfirmHandler;
  /** Columns a full-width row covers, chrome included. */
  columnSpan: number;
  /** Widths standing in for columns outside the window. */
  columnSpacers?: { start: number; end: number };
  /** This row's place in the tree, when rows are a tree. */
  treeEntry?: TreeEntry<TRow>;
  /** Column the tree toggle lives in. */
  treeColumnKey?: string;
  /** Expand or collapse this tree row. */
  onToggleTree?: (id: string) => void;
  /** Measured column widths, by key. */
  columnWidths?: Readonly<Record<string, number>>;
  /** Pin offset for a column, absent when it is not pinned. */
  pinOffset?: (key: string) => PinOffset | undefined;
  /** Memo key for the pin layout. */
  pinSignature: string;
  /** Whether anything is pinned to the leading edge. */
  hasStartPin: boolean;
  /** Whether anything is pinned to the trailing edge. */
  hasEndPin: boolean;
  /** Whether the actions column is pinned. */
  actionsPinned: boolean;
  /** Host-supplied class for this row. */
  rowClass: string | undefined;
  /** Host-supplied style for this row. */
  rowVisualStyle: CSSProperties | undefined;
  /** Memo key for the host's row styling. */
  rowStyleSignature: string;
  /**
   * Flashing column keys for this row, joined. Memoized rows compare this
   * rather than the `isCellFlashing` function, which stays referentially
   * stable while the marks move.
   */
  flashSignature: string;
  /** Whether a given cell is mid-flash. */
  isCellFlashing: SharedTableRenderProps<TRow>["isCellFlashing"];
  /** Whether the row responds to a click. */
  clickable: boolean;
  /** Whether hovering the row prefetches anything. */
  hasPrefetch: boolean;
  /** Cell-editing state, absent when editing is off. */
  editing: EditableCellEditing<TRow> | undefined;
  /** The rendered rows, for editors that need their neighbours. */
  rows: readonly TRow[];
  /** Row identity function. */
  getRowId: (row: TRow) => string;
  /** Memo key for edit state, null when editing is off. */
  editingSignature: string | null;
  /** Row click handler. */
  onRowClick: (row: TRow) => void;
  /** Prefetch handler, fired on hover or focus. */
  onPrefetch: (row: TRow) => void;
  /** Toggle this row's selection. */
  onToggleSelect: (id: string) => void;
  /** Toggle this row's detail panel. */
  onToggleExpand: (id: string) => void;
  /** Content of the expanded detail panel. */
  renderDetail: (row: TRow) => ReactNode;
  /** Hands the row element to the virtualizer. */
  measureElement?: (element: Element | null) => void;
  /** Measures a row and its detail panel together. */
  measureRowPair?: RowPairMeasurer;
  /** Width reserved by injected chrome at each edge. */
  leads: PinLeads;
  /** Index focus and ARIA address this row by — the source index. */
  focusIndex: number;
  /** Part name for a pinned row. */
  pinPart:
    ReturnType<typeof pinnedRowPart> | ReturnType<typeof pinnedSummaryPart>;
  /** Sticky positioning for a pinned row. */
  pinSticky: ReturnType<typeof pinnedRowSticky>;
  /** Sticky style for a pinned row's edge cell. */
  edgeRowPin: ReturnType<typeof pinnedRowCellStyle>;
  /** Ref that reports the row's box, absent when unmeasured. */
  measureRef: ((element: Element | null) => void) | undefined;
  /**
   * Ref for the row's open detail panel, so the virtualizer sizes the row and
   * its panel together. Absent when nothing measures the pair.
   */
  detailMeasureRef?: (element: Element | null) => void;
  /** getRowProps plus grid / click / reorder — spread onto the kit row. */
  rowDomProps: Record<string, unknown>;
  /** Sticky offsets for one body cell, absent when unpinned. */
  bodyPinStyle: (key: string) => CSSProperties | undefined;
}

/**
 * Assembled sort / resize / filter state for one leaf header cell.
 *
 * @public
 */
export interface DesktopHeaderLeaf<TRow> {
  /** The column this header cell is for. */
  column: ColumnDef<TRow>;
  /** Position among the rendered header cells. */
  headerIndex: number;
  /** Header rows this cell spans, for grouped headers. */
  rowSpan: number;
  /** Props for the header cell element. */
  headerProps: CellElementProps;
  /** Grid-focus props for the header cell. */
  columnHeaderProps: Record<string, unknown>;
  /** Width and sticky offsets for the cell. */
  style: CSSProperties;
  /** This column's sort direction, absent when unsorted. */
  sortDir: "asc" | "desc" | undefined;
  /** Whether this column takes part in the current sort. */
  sortActive: boolean;
  /** Props for the sort control, its accessible name included. */
  sortButtonProps: SortButtonElementProps;
  /** 1-based position in a multi-column sort, absent when unsorted. */
  sortIndex: number | undefined;
  /** What the header renders. */
  caption: ReactNode;
  /** Filter definition for the header filter row, if the column has one. */
  headerDef: FilterDef<TRow> | undefined;
  /** Edge this column is pinned to, absent when it floats. */
  pinSide: PinOffset["side"] | undefined;
  /** Props for the resize handle, absent when not resizable. */
  resizeHandleProps: ReactColumnResizeHandleProps | undefined;
  /** The column's name in prose, for accessible names. */
  columnName: string;
  /** Whether the header carries a column-selection checkbox. */
  showColumnCheckbox: boolean;
  /** Whether that checkbox is checked. */
  columnCheckboxChecked: boolean;
  /** Toggles this column's selection, absent when not selectable. */
  onToggleColumn: (() => void) | undefined;
  /** Accessible name for the column-selection checkbox. */
  columnSelectAriaLabel: string;
}

/**
 * Pin / scroll / header geometry shared by every HTML-table adapter.
 *
 * @public
 */
export interface DesktopTablePin {
  /** Whether any column or injected chrome is pinned. */
  hasPinned: boolean;
  /** Whether anything is pinned to the leading edge. */
  hasStartPin: boolean;
  /** Whether anything is pinned to the trailing edge. */
  hasEndPin: boolean;
  /** Whether the actions column is user-pinned. */
  stickActions: boolean;
  /** Changes whenever the pin layout does — a memo key, not a value to read. */
  signature: string;
  /** Width reserved by injected chrome at each edge. */
  leads: PinLeads;
  /** Total width the injected chrome adds: both leads together. */
  extraMinWidth: number;
  /** Width the expansion column reserves, 0 when there is none. */
  expansionLead: number;
  /** Width the reorder column reserves, 0 when there is none. */
  reorderLead: number;
  /** Offset where the selection column starts, past expansion and reorder. */
  selectionLead: number;
  /** Whether pinned rows can stick — a body cell spanning rows prevents it. */
  pinRowSticky: boolean;
  /** Where a pinned row sits, clearing a sticky header. */
  rowPinOffset: number;
  /** Sticky positioning for the header, absent when it does not stick. */
  stickyStyle: CSSProperties | undefined;
  /** Present only when the header sticks, for styling hooks to key off. */
  stickyAttr: true | undefined;
  /** Whether the table scrolls inside a bounded box rather than the page. */
  inScrollBox: boolean;
  /** Top offset a sticky header sticks at: 0 inside a scroll box. */
  headerStickTop: number;
  /** Sticky offsets for one header cell, absent when the column is not pinned. */
  headStyle: (column: {
    key: string;
    width?: number | string;
  }) => CSSProperties | undefined;
  /** Sticky offsets for an injected header cell at one edge. */
  edgeHeadStyle: (
    side: "start" | "end",
    active: boolean
  ) => CSSProperties | undefined;
  /** Sticky offsets for an injected body cell at one edge. */
  edgeBodyStyle: (
    side: "start" | "end",
    active: boolean
  ) => CSSProperties | undefined;
}

/**
 * Result of {@link useDesktopTableAssembly}.
 *
 * @public
 */
export interface DesktopTableAssembly<TRow> {
  /** Prelude from {@link tableRenderModel} — called, not replaced. */
  model: TableRenderModel<TRow>;
  /** Footer aggregates by column key, absent when there is no footer. */
  summary: Partial<Record<string, ReactNode>> | undefined;
  /** Whether a footer row is rendered. */
  showColumnFooter: boolean;
  /** Grouped-header rows to render above the leaves, if any. */
  headerPlan: readonly (readonly HtmlGroupedHeaderCell[])[] | undefined;
  /** How many header rows the plan occupies. */
  headerBand: number;
  /** Everything the header row needs: which chrome cells to draw, and the leaves. */
  header: {
    leading: {
      expand: boolean;
      reorder: boolean;
      selection: boolean;
      spacerStart: boolean;
    };
    trailing: {
      spacerEnd: boolean;
      actions: boolean;
    };
    leaf: (
      column: ColumnDef<TRow>,
      headerIndex: number,
      rowSpan?: number
    ) => DesktopHeaderLeaf<TRow>;
    theadRef: RefCallback<HTMLElement>;
    headerRowRef: RefCallback<HTMLElement>;
    headerRowProps: Record<string, unknown>;
  };
  /** Everything pinning needs: what sticks, where, and at what offset. */
  pin: DesktopTablePin;
  /** The scroll box: whether it overflows, its style, and its ref. */
  scroll: {
    overflowing: boolean;
    boxStyle: CSSProperties | undefined;
    bindScrollBox: RefCallback<HTMLDivElement>;
  };
  /** Style for the `<table>` element, absent when it needs none. */
  tableStyle: CSSProperties | undefined;
  /** Props for the `<table>` element. */
  tableProps: ReturnType<UseDataTableResult<TRow>["getTableProps"]>;
  /** Grid role and ARIA dimensions, absent when the table is not a grid. */
  gridProps: Record<string, unknown> | undefined;
  /** Row-level handlers an adapter wires to its markup. */
  callbacks: {
    onToggleSelect: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onToggleGroup: (groupKey: string) => void;
    handleRowClick: (row: TRow) => void;
    handlePrefetch: (row: TRow) => void;
    renderDetail: (row: TRow) => ReactNode;
  };
  /** The body, in render order: rows, group headers, extras and pads. */
  bodySlots: readonly DesktopBodySlot<TRow>[];
  /** Resolved widths of the injected chrome columns. */
  widths: Required<
    Pick<DesktopChromeWidths, "expansion" | "selection" | "actions">
  > & {
    reorder: number;
    includeExpansionInLeads: boolean;
  };
  /** Style shared by every column-resize handle. */
  resizeHandleStyle: CSSProperties;
}

/**
 * Props {@link useDesktopTableAssembly} reads.
 *
 * @public
 */
export type DesktopAssemblyProps<TRow> = SharedTableRenderProps<TRow> & {
  /** Whether the injected actions column is user-pinned. */
  actionsPinned?: boolean;
};

/**
 * Scroll-box style: a maxHeight box scrolls on both axes; otherwise the
 * wrapper scrolls sideways only when something needs it.
 *
 * @param maxHeight - Bounding height, if any.
 * @param scrollX - Whether horizontal overflow is needed.
 */
export function desktopScrollBoxStyle(
  maxHeight: number | undefined,
  scrollX: boolean
): CSSProperties | undefined {
  return neutralDesktopScrollBoxStyle(maxHeight, scrollX);
}

/**
 * Body-cell pin style: column sticky + row-pin sticky, geometry only.
 *
 * @param key - Column key.
 * @param pinOffset - Pin lookup.
 * @param leads - Injected-column insets.
 * @param rowPinSide - Row pin side, if any.
 * @param rowPinOffset - Sticky header offset for a pinned row.
 */
export function desktopBodyPinStyle(
  key: string,
  pinOffset: ((key: string) => PinOffset | undefined) | undefined,
  leads: PinLeads,
  rowPinSide: RowPinSide | undefined,
  rowPinOffset: number
): CSSProperties | undefined {
  return neutralDesktopBodyPinStyle(
    key,
    pinOffset,
    leads,
    rowPinSide,
    rowPinOffset
  );
}

/**
 * Header-cell sticky / pin / width style.
 *
 * @param column - The column.
 * @param options - Pin, widths, resize, sticky.
 */
export function desktopHeadCellStyle(
  column: { key: string; width?: number | string },
  options: {
    pinOffset?: (key: string) => PinOffset | undefined;
    leads: PinLeads;
    columnWidths?: Readonly<Record<string, number>>;
    setWidth?: (key: string, width: number) => void;
    stickyStyle?: CSSProperties;
  }
): CSSProperties | undefined {
  return neutralDesktopHeadCellStyle(column, options);
}

/**
 * Sticky + edge-pin style for an injected header cell.
 *
 * @param side - Start or end.
 * @param active - Whether a data column on that side is pinned.
 * @param stickyStyle - Sticky-header style, if any.
 */
export function desktopEdgeHeadStyle(
  side: "start" | "end",
  active: boolean,
  stickyStyle: CSSProperties | undefined
): CSSProperties | undefined {
  return neutralDesktopEdgeHeadStyle(side, active, stickyStyle);
}

/**
 * Re-render a row only when a visual input changes.
 *
 * @typeParam TRow - The row type.
 * @param prev - Previous wiring.
 * @param next - Next wiring.
 */
export function desktopRowWiringEqual<TRow>(
  prev: Readonly<DesktopRowWiring<TRow>>,
  next: Readonly<DesktopRowWiring<TRow>>
): boolean {
  return neutralDesktopRowWiringEqual(prev, next);
}

/**
 * One memoized row component per DesktopTable instantiation.
 *
 * @typeParam TRow - The row type.
 * @typeParam TProps - Wiring plus kit extras.
 * @param RowBase - Kit row painter.
 * @param extraEqual - Kit-extra comparator (classNames, size, dir).
 *
 * @public
 */
export function createDesktopRow<TRow, TProps extends DesktopRowWiring<TRow>>(
  RowBase: (props: Readonly<TProps>) => ReactElement,
  extraEqual?: (prev: Readonly<TProps>, next: Readonly<TProps>) => boolean
) {
  return memo(RowBase, (prev, next) => {
    if (!desktopRowWiringEqual(prev, next)) return false;
    return extraEqual?.(prev, next) ?? true;
  });
}

/** What every desktop row of one table shares, in this binding's types. */
type DesktopRowWiringContext<TRow> = DesktopRowWiringContextModel<TRow> & {
  readonly table: UseDataTableResult<TRow>;
  readonly gridFocus: SharedTableRenderProps<TRow>["gridFocus"];
  readonly editing: SharedTableRenderProps<TRow>["editing"];
  readonly columns: readonly ColumnDef<TRow>[];
  readonly labels: Required<TableLabels>;
  readonly rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  readonly rowActions: SharedTableRenderProps<TRow>["rowActions"];
  readonly rowActionsLayout: SharedTableRenderProps<TRow>["rowActionsLayout"];
  readonly cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  readonly renderRowActions: SharedTableRenderProps<TRow>["renderRowActions"];
  readonly confirm: ConfirmHandler;
  readonly isCellFlashing: SharedTableRenderProps<TRow>["isCellFlashing"];
  readonly renderDetail: (row: TRow) => ReactNode;
  readonly rows: readonly TRow[];
};

/**
 * Shared desktop-table assembly. Calls {@link tableRenderModel} and
 * `UseDataTableResult.getRowProps`; does not replace them.
 *
 * @typeParam TRow - The row type.
 * @param props - The shared render contract plus actionsPinned.
 * @param options - Kit chrome widths.
 *
 * @public
 */
export function useDesktopTableAssembly<TRow>(
  props: DesktopAssemblyProps<TRow>,
  options: DesktopAssemblyOptions = {}
): DesktopTableAssembly<TRow> {
  const {
    gridFocus,
    table,
    rows,
    rowActions,
    confirm,
    getRowId,
    prefetch,
    onRowClick,
    rowClassName,
    isCellFlashing,
    collapsibleColumnGroups,
    collapsedColumnGroups,
    columnGroups,
    rowStyle,
    rowHeight,
    renderRowDetail,
    summaryRow,
    expansion,
    editing,
    grouping,
    groupingPanel,
    rowEntries,
    paddingTop = 0,
    paddingBottom = 0,
    measureElement,
    measureRowPair,
    stickyHeader = false,
    stickyTop = 0,
    pinOffset,
    maxHeight,
    virtualScrollRef,
    setWidth,
    columnWidths,
    resizeLabel = "Resize column",
    actionsPinned = false,
    reorderPinned = false,
    rowReorder,
    windowStart = 0,
    pinnedTopRows = [],
    pinnedBottomRows = [],
    pinnedSummaryTop = [],
    pinnedSummaryBottom = [],
    rowPinning,
    columnWindow,
    fitColumns,
    tree,
    getCellSpan,
    extraRows,
    headerFilters,
    filterDefs,
    rowActionsLayout,
    cellSpanAppearance,
    renderRowActions,
    assembly,
  } = props;
  const assemblyFns = resolveAssembly(assembly);

  const model = tableRenderModel({
    table,
    rows,
    columnWindow,
    rowActions,
    getRowId,
    rowEntries,
    renderRowDetail,
    expansion,
    editing,
    rowReorder,
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom,
    getCellSpan,
    pinOffset,
    tree,
    grouping,
    extraRows,
    assembly,
  });
  const {
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    entries,
    columnSpan,
    columnSpacers,
    cellsByRow,
  } = model;

  const pinRowSticky = !bodyCellsHaveRowSpan(cellsByRow);
  const extraFill = (key: string) =>
    assemblyFns.extraHostFillStyle(key, extraRows, rows, getRowId, rowStyle);
  const [theadRef, headerHeight] = useOffsetHeight();
  const [headerRowRef] = useOffsetHeight();
  const stickActions = showActions && actionsPinned;
  const expansionState = renderRowDetail ? expansion : undefined;
  const expandable = expansionState !== undefined;

  const live = useRef({
    selection,
    expansion: expansionState,
    grouping,
    onRowClick,
    prefetch,
    renderRowDetail,
  });
  live.current = {
    selection,
    expansion: expansionState,
    grouping,
    onRowClick,
    prefetch,
    renderRowDetail,
  };
  const onToggleSelect = useCallback(
    (id: string) => live.current.selection?.toggle(id),
    []
  );
  const onToggleExpand = useCallback(
    (id: string) => live.current.expansion?.toggle(id),
    []
  );
  const onToggleGroup = useCallback(
    (groupKey: string) => live.current.grouping?.collapsed.toggle(groupKey),
    []
  );
  const handleRowClick = useCallback(
    (row: TRow) => live.current.onRowClick?.(row),
    []
  );
  const handlePrefetch = useCallback(
    (row: TRow) => live.current.prefetch?.(row),
    []
  );
  const renderDetail = useCallback(
    (row: TRow) => live.current.renderRowDetail?.(row),
    []
  );

  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();

  const metrics = desktopChromeMetrics({
    expandable,
    showReorder,
    hasSelection: Boolean(selection),
    showActions,
    widths: options.widths,
  });
  const hasPinned = desktopHasPinned(
    columns,
    pinOffset,
    stickActions,
    showReorder && reorderPinned
  );
  const {
    inScrollBox,
    headerStickTop,
    rowPinOffset,
    stickyStyle,
    stickyAttr,
    boxStyle,
  } = desktopStickyPlan({
    maxHeight,
    hasPinned,
    overflowing,
    stickyHeader,
    stickyTop,
    headerHeight,
  });
  const {
    hasStartPin,
    hasEndPin,
    signature: pinSignature,
  } = desktopPinEdges(columns, pinOffset);
  const headStyle = (column: { key: string; width?: number | string }) =>
    desktopHeadCellStyle(column, {
      pinOffset,
      leads: metrics.leads,
      columnWidths,
      setWidth,
      stickyStyle,
    });
  const edgeHeadStyle = (side: "start" | "end", active: boolean) =>
    desktopEdgeHeadStyle(side, active, stickyStyle);
  const edgeBodyStyle = (side: "start" | "end", active: boolean) =>
    desktopEdgeBodyStyle(side, active);

  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  const summary = useSummaryCells(summaryRow, rows);
  const showColumnFooter = summary !== undefined || columnsHaveFooter(columns);

  const resolvedTableStyle: CSSProperties | undefined = desktopTableStyle(
    columns,
    { columnWidths, extraMinWidth: metrics.extraMinWidth, fitColumns }
  );

  const bindScrollBox = useCallback<RefCallback<HTMLDivElement>>(
    (node) => {
      overflowRef(node);
      virtualScrollRef?.(node);
    },
    [overflowRef, virtualScrollRef]
  );

  const wiringCtx: DesktopRowWiringContext<TRow> = {
    cellsByRow,
    rowStyle,
    rowHeight,
    leads: metrics.leads,
    pinRowSticky,
    rowPinOffset,
    measureRowPair,
    measureElement,
    rowReorder,
    table,
    gridFocus,
    onRowClick,
    handleRowClick,
    windowStart,
    selection,
    editing,
    prefetch,
    handlePrefetch,
    columns,
    labels,
    expansionState,
    showActions,
    showReorder,
    rows,
    reorderPinned,
    rowPinning,
    rowActions,
    rowActionsLayout,
    cellSpanAppearance,
    renderRowActions,
    confirm,
    columnSpan,
    columnSpacers,
    tree,
    columnWidths,
    pinOffset,
    pinSignature,
    hasStartPin,
    hasEndPin,
    stickActions,
    rowClassName,
    isCellFlashing,
    getRowId,
    summaryTopCount: pinnedSummaryTop.length,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
  };

  const bodySlots = desktopBodySlots<
    TRow,
    DesktopRowWiring<TRow>,
    ReactNode,
    CSSProperties
  >({
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom,
    extraRows,
    extraFill,
    insertExtraRows: assemblyFns.insertExtraRows,
    insertExtrasBeforeRows: assemblyFns.insertExtrasBeforeRows,
    paddingTop,
    paddingBottom,
    grouping,
    entries,
    tree,
    getRowId,
    columnSpan,
    rows,
    wiring: (args) => desktopRowWiring(wiringCtx, args),
  });

  // Focus addresses columns by their position in the FULL visible list. Built
  // once here rather than searched per header cell: the header row is the
  // hottest prop path in this file, and a scan inside it would make the cost of
  // naming a column quadratic in the number of columns.
  const absoluteIndex = absoluteColumnIndex(table.columns);
  const leafCtx = {
    table,
    headStyle,
    groupingPanel,
    gridFocus,
    headerFilters,
    filterDefs,
    pinOffset,
    setWidth,
    resizeLabel,
    columnResizeHandleProps: assemblyFns.columnResizeHandleProps,
    labels,
  };
  const leaf = (
    column: ColumnDef<TRow>,
    headerIndex: number,
    rowSpan = 1
  ): DesktopHeaderLeaf<TRow> => {
    const { resizeHandleProps, ...rest } = desktopHeaderLeaf(
      leafCtx,
      column,
      headerIndex,
      rowSpan,
      absoluteIndex
    );
    return {
      ...rest,
      caption: resolveColumnHeader(
        column,
        columnHeaderController(column, {
          sortDir: rest.sortDir,
          sortIndex: rest.sortIndex,
          toggleSort: rest.sortButtonProps.onClick,
        })
      ),
      resizeHandleProps: resizeHandleProps
        ? toReactColumnResizeHandleProps(
            resizeHandleProps as Parameters<
              typeof toReactColumnResizeHandleProps
            >[0]
          )
        : undefined,
    };
  };

  return {
    model,
    summary,
    showColumnFooter,
    headerPlan: headerPlan ?? undefined,
    headerBand,
    header: {
      leading: {
        expand: expandable,
        reorder: showReorder,
        selection: Boolean(selection),
        spacerStart: columnSpacers !== undefined,
      },
      trailing: {
        spacerEnd: columnSpacers !== undefined,
        actions: showActions,
      },
      leaf,
      theadRef,
      headerRowRef,
      headerRowProps: table.getHeaderRowProps(),
    },
    pin: {
      hasPinned,
      hasStartPin,
      hasEndPin,
      stickActions,
      signature: pinSignature,
      leads: metrics.leads,
      extraMinWidth: metrics.extraMinWidth,
      expansionLead: metrics.expansionLead,
      reorderLead: metrics.reorderLead,
      selectionLead: metrics.selectionLead,
      pinRowSticky,
      rowPinOffset,
      stickyStyle,
      stickyAttr,
      inScrollBox,
      headerStickTop,
      headStyle,
      edgeHeadStyle,
      edgeBodyStyle,
    },
    scroll: {
      overflowing,
      boxStyle,
      bindScrollBox,
    },
    tableStyle: resolvedTableStyle,
    tableProps: table.getTableProps(),
    gridProps: gridFocus?.getGridProps(),
    callbacks: {
      onToggleSelect,
      onToggleExpand,
      onToggleGroup,
      handleRowClick,
      handlePrefetch,
      renderDetail,
    },
    bodySlots,
    widths: {
      expansion: metrics.expansion,
      selection: metrics.selection,
      actions: metrics.actions,
      reorder: REORDER_COLUMN_WIDTH,
      includeExpansionInLeads: metrics.includeExpansionInLeads,
    },
    resizeHandleStyle: DESKTOP_RESIZE_HANDLE_STYLE,
  };
}

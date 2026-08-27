/** Shared desktop-table assembly — wiring, not pixels. */
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  type RefCallback,
  useCallback,
  useRef,
} from "react";

import type { ConfirmHandler } from "../actions/confirm";
import {
  columnHeaderController,
  columnsHaveFooter,
  resolveColumnHeader,
} from "../columns/columnHeader";
import type { ColumnResizeHandleProps } from "../columns/columnResize";
import { columnResizeHandleProps } from "../columns/columnResize";
import { fittedTableStyle } from "../columns/columnSizing";
import { pinnedColumnWidth, tableMinWidth } from "../columns/columnWidths";
import type { HtmlGroupedHeaderCell } from "../columns/headerGroups";
import { htmlGroupedHeaderPlan } from "../columns/headerGroups";
import {
  edgePinStyle,
  PIN_Z,
  type PinLeads,
  pinnedCellStyle,
  type PinOffset,
} from "../columns/useColumnLayout";
import type { EditableCellEditing } from "../editing/editableCellController";
import {
  rowEditingSignature,
  rowIsDirty,
} from "../editing/editableCellController";
import type { FilterDef } from "../filters/filterDefs";
import { filterDefForColumn } from "../filters/FilterHeaderRow";
import { columnSelectLabel } from "../focus/ColumnSelectCheckbox";
import type { GridFocusState } from "../focus/useGridFocus";
import type { GroupedFlatEntry } from "../grouping/groupRows";
import { rowFlashSignature } from "../rows/cellFlashPaint";
import type { BodyCell } from "../rows/cellSpan";
import {
  bodyCellsHaveRowSpan,
  cellsForRow,
  rowSpanSignature,
} from "../rows/cellSpan";
import {
  extraHostFillStyle,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
} from "../rows/extraRows";
import {
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  useOffsetHeight,
} from "../rows/pinnedRowChrome";
import { rowClickProps } from "../rows/rowClickProps";
import type { RowPinSide } from "../rows/rowPinning";
import { rowPinSignature } from "../rows/rowPinning";
import {
  REORDER_COLUMN_WIDTH,
  rowReorderDropStyle,
  rowReorderSignature,
} from "../rows/rowReorder";
import { resolveRowStyle, rowStyleSignature } from "../rows/rowStyle";
import {
  type SharedTableRenderProps,
  type TableRenderModel,
  tableRenderModel,
  useSummaryCells,
} from "../tableRenderProps";
import type { TreeEntry } from "../tree/treeRows";
import { bodyRowEntries } from "../tree/treeRows";
import type { ColumnDef, TableLabels } from "../types";
import type {
  CellElementProps,
  SortButtonElementProps,
  UseDataTableResult,
} from "../useDataTable/useDataTable";
import type { RowPairMeasurer } from "../virtual/measureRowPair";
import { useHorizontalOverflow } from "./useHorizontalOverflow";

/** Width (px) reserved for the leading selection column. */
export const DESKTOP_SELECTION_WIDTH = 48;

/** Width (px) reserved for the trailing actions column. */
export const DESKTOP_ACTIONS_WIDTH = 120;

/** Width (px) reserved for the leading expand-chevron column. */
export const DESKTOP_EXPANSION_WIDTH = 32;

/** Inline style for an absolutely-positioned column-resize handle. */
export const DESKTOP_RESIZE_HANDLE_STYLE: CSSProperties = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
};

/** Per-kit chrome column widths. */
export interface DesktopChromeWidths {
  /** Leading expand-chevron column. Default {@link DESKTOP_EXPANSION_WIDTH}. */
  expansion?: number;
  /** Leading selection column. Default {@link DESKTOP_SELECTION_WIDTH}. */
  selection?: number;
  /** Trailing actions column. Default {@link DESKTOP_ACTIONS_WIDTH}. */
  actions?: number;
  /**
   * Whether the expand column contributes to start-pin leads.
   * Most kits yes; unstyled keeps the chevron out of the pin math.
   */
  includeExpansionInLeads?: boolean;
}

/** Options for {@link useDesktopTableAssembly}. */
export interface DesktopAssemblyOptions {
  /** Chrome column widths. */
  widths?: DesktopChromeWidths;
}

/** Group-shaped body entries adapters hand to their group header. */
export type DesktopGroupEntry<TRow> = Extract<
  GroupedFlatEntry<TRow>,
  { kind: "group" | "groupFooter" | "groupMore" }
>;

/** One host-injected extra in the assembled body. */
export interface DesktopExtraSlot {
  kind: "extra";
  key: string;
  extraKind: "separator" | "fullWidth";
  colSpan: number;
  render?: () => ReactNode;
  fillStyle?: CSSProperties;
}

/** Virtual-window spacer. */
export interface DesktopVirtualPadSlot {
  kind: "virtualPad";
  key: "pad-top" | "pad-bottom";
  height: number;
  colSpan: number;
}

/** Group header / footer / more row. */
export interface DesktopGroupSlot<TRow> {
  kind: "group";
  key: string;
  entry: DesktopGroupEntry<TRow>;
}

/** A data row, with wiring already assembled. */
export interface DesktopRowSlot<TRow> {
  kind: "row";
  key: string;
  wiring: DesktopRowWiring<TRow>;
}

/** One visual slot in the assembled tbody, in reading order. */
export type DesktopBodySlot<TRow> =
  | DesktopExtraSlot
  | DesktopVirtualPadSlot
  | DesktopGroupSlot<TRow>
  | DesktopRowSlot<TRow>;

/**
 * Shared visual + behaviour inputs for one memoized desktop row.
 * Adapters extend this with kit extras and paint with their own tags.
 */
export interface DesktopRowWiring<TRow> {
  gridFocus?: GridFocusState;
  row: TRow;
  index: number;
  id: string;
  table: UseDataTableResult<TRow>;
  columns: readonly ColumnDef<TRow>[];
  bodyCells: readonly BodyCell<TRow>[];
  spanSignature: string;
  labels: Required<TableLabels>;
  selected: boolean | undefined;
  expanded: boolean | undefined;
  showActions: boolean;
  showReorder: boolean;
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  windowStart: number;
  rowCount: number;
  reorderPinned: boolean;
  reorderSignature: string | null;
  rowPinSide?: RowPinSide;
  pinRowSticky: boolean;
  rowPinOffset: number;
  rowPinSignature: string | null;
  sourceIndex: number;
  rowActions: SharedTableRenderProps<TRow>["rowActions"];
  rowActionsLayout: SharedTableRenderProps<TRow>["rowActionsLayout"];
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions: SharedTableRenderProps<TRow>["renderRowActions"];
  confirm: ConfirmHandler;
  columnSpan: number;
  columnSpacers?: { start: number; end: number };
  treeEntry?: TreeEntry<TRow>;
  treeColumnKey?: string;
  onToggleTree?: (id: string) => void;
  columnWidths?: Readonly<Record<string, number>>;
  pinOffset?: (key: string) => PinOffset | undefined;
  pinSignature: string;
  hasStartPin: boolean;
  hasEndPin: boolean;
  actionsPinned: boolean;
  rowClass: string | undefined;
  rowVisualStyle: CSSProperties | undefined;
  rowStyleSignature: string;
  /**
   * Flashing column keys for this row, joined. Memoized rows compare this
   * rather than the `isCellFlashing` function, which stays referentially
   * stable while the marks move.
   */
  flashSignature: string;
  isCellFlashing: SharedTableRenderProps<TRow>["isCellFlashing"];
  clickable: boolean;
  hasPrefetch: boolean;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
  onRowClick: (row: TRow) => void;
  onPrefetch: (row: TRow) => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  renderDetail: (row: TRow) => ReactNode;
  measureElement?: (element: Element | null) => void;
  measureRowPair?: RowPairMeasurer;
  leads: PinLeads;
  focusIndex: number;
  pinPart: ReturnType<typeof pinnedRowPart>;
  pinSticky: ReturnType<typeof pinnedRowSticky>;
  edgeRowPin: ReturnType<typeof pinnedRowCellStyle>;
  measureRef: ((element: Element | null) => void) | undefined;
  /** getRowProps plus grid / click / reorder — spread onto the kit row. */
  rowDomProps: Record<string, unknown>;
  bodyPinStyle: (key: string) => CSSProperties | undefined;
}

/** Assembled sort / resize / filter state for one leaf header cell. */
export interface DesktopHeaderLeaf<TRow> {
  column: ColumnDef<TRow>;
  headerIndex: number;
  rowSpan: number;
  headerProps: CellElementProps;
  columnHeaderProps: Record<string, unknown>;
  style: CSSProperties;
  sortDir: "asc" | "desc" | undefined;
  sortActive: boolean;
  sortButtonProps: SortButtonElementProps;
  sortIndex: number | undefined;
  caption: ReactNode;
  headerDef: FilterDef<TRow> | undefined;
  pinSide: PinOffset["side"] | undefined;
  resizeHandleProps: ColumnResizeHandleProps | undefined;
  columnName: string;
  showColumnCheckbox: boolean;
  columnCheckboxChecked: boolean;
  onToggleColumn: (() => void) | undefined;
  columnSelectAriaLabel: string;
}

/** Pin / scroll / header geometry shared by every HTML-table adapter. */
export interface DesktopTablePin {
  hasPinned: boolean;
  hasStartPin: boolean;
  hasEndPin: boolean;
  stickActions: boolean;
  signature: string;
  leads: PinLeads;
  extraMinWidth: number;
  expansionLead: number;
  reorderLead: number;
  selectionLead: number;
  pinRowSticky: boolean;
  rowPinOffset: number;
  stickyStyle: CSSProperties | undefined;
  stickyAttr: true | undefined;
  inScrollBox: boolean;
  headerStickTop: number;
  headStyle: (column: {
    key: string;
    width?: number | string;
  }) => CSSProperties | undefined;
  edgeHeadStyle: (
    side: "start" | "end",
    active: boolean
  ) => CSSProperties | undefined;
  edgeBodyStyle: (
    side: "start" | "end",
    active: boolean
  ) => CSSProperties | undefined;
}

/** Result of {@link useDesktopTableAssembly}. */
export interface DesktopTableAssembly<TRow> {
  /** Prelude from {@link tableRenderModel} — called, not replaced. */
  model: TableRenderModel<TRow>;
  summary: Partial<Record<string, ReactNode>> | undefined;
  showColumnFooter: boolean;
  headerPlan: readonly (readonly HtmlGroupedHeaderCell[])[] | undefined;
  headerBand: number;
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
  pin: DesktopTablePin;
  scroll: {
    overflowing: boolean;
    boxStyle: CSSProperties | undefined;
    bindScrollBox: RefCallback<HTMLDivElement>;
  };
  tableStyle: CSSProperties | undefined;
  tableProps: ReturnType<UseDataTableResult<TRow>["getTableProps"]>;
  gridProps: Record<string, unknown> | undefined;
  callbacks: {
    onToggleSelect: (id: string) => void;
    onToggleExpand: (id: string) => void;
    onToggleGroup: (groupKey: string) => void;
    handleRowClick: (row: TRow) => void;
    handlePrefetch: (row: TRow) => void;
    renderDetail: (row: TRow) => ReactNode;
  };
  bodySlots: readonly DesktopBodySlot<TRow>[];
  widths: Required<
    Pick<DesktopChromeWidths, "expansion" | "selection" | "actions">
  > & {
    reorder: number;
    includeExpansionInLeads: boolean;
  };
  resizeHandleStyle: CSSProperties;
}

/** Props {@link useDesktopTableAssembly} reads. */
export type DesktopAssemblyProps<TRow> = SharedTableRenderProps<TRow> & {
  /** Whether the injected actions column is user-pinned. */
  actionsPinned?: boolean;
};

/**
 * Chrome column widths and pin leads.
 *
 * @param options - Which injected columns render, and their widths.
 */
export function desktopChromeMetrics(options: {
  expandable: boolean;
  showReorder: boolean;
  hasSelection: boolean;
  showActions: boolean;
  widths?: DesktopChromeWidths;
}): {
  leads: PinLeads;
  extraMinWidth: number;
  expansionLead: number;
  reorderLead: number;
  selectionLead: number;
  expansion: number;
  selection: number;
  actions: number;
  includeExpansionInLeads: boolean;
} {
  const expansion = options.widths?.expansion ?? DESKTOP_EXPANSION_WIDTH;
  const selection = options.widths?.selection ?? DESKTOP_SELECTION_WIDTH;
  const actions = options.widths?.actions ?? DESKTOP_ACTIONS_WIDTH;
  const includeExpansionInLeads =
    options.widths?.includeExpansionInLeads ?? true;
  const expansionLead =
    options.expandable && includeExpansionInLeads ? expansion : 0;
  const reorderLead = options.showReorder ? REORDER_COLUMN_WIDTH : 0;
  const selectionWidth = options.hasSelection ? selection : 0;
  const actionsLead = options.showActions ? actions : 0;
  const start = expansionLead + reorderLead + selectionWidth;
  return {
    leads: { start, end: actionsLead },
    extraMinWidth: start + actionsLead,
    expansionLead,
    reorderLead,
    selectionLead: expansionLead + reorderLead,
    expansion,
    selection,
    actions,
    includeExpansionInLeads,
  };
}

/**
 * Whether any column or injected chrome is pinned.
 *
 * @param columns - Visible columns.
 * @param pinOffset - Pin lookup.
 * @param stickActions - Actions column is user-pinned.
 * @param reorderPinnedLead - Reorder column is start-pinned.
 */
export function desktopHasPinned(
  columns: readonly { key: string }[],
  pinOffset: ((key: string) => unknown) | undefined,
  stickActions: boolean,
  reorderPinnedLead: boolean
): boolean {
  return (
    columns.some((column) => pinOffset?.(column.key) != null) ||
    stickActions ||
    reorderPinnedLead
  );
}

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
  if (maxHeight != null) {
    return { maxHeight, overflowX: "auto", overflowY: "auto" };
  }
  return scrollX ? { overflowX: "auto" } : undefined;
}

/**
 * Value-comparable digest of every column pin side + inset.
 *
 * @param columns - Visible columns.
 * @param pinOffset - Pin lookup.
 */
export function desktopPinSignature(
  columns: readonly { key: string }[],
  pinOffset: ((key: string) => PinOffset | undefined) | undefined
): string {
  return columns
    .map((column) => {
      const pin = pinOffset?.(column.key);
      return pin ? `${column.key}:${pin.side}:${String(pin.inset)}` : "";
    })
    .join("|");
}

/**
 * Ref that measures a scroll-body row (never a pinned one).
 *
 * @param pinned - Pin side, if any.
 * @param measureRowPair - Pair measurer when details can open.
 * @param index - Row index in the window.
 * @param measureElement - Single-element measurer.
 */
export function desktopRowMeasureRef(
  pinned: RowPinSide | undefined,
  measureRowPair: RowPairMeasurer | undefined,
  index: number,
  measureElement: ((element: Element | null) => void) | undefined
): ((element: Element | null) => void) | undefined {
  if (pinned) return undefined;
  if (measureRowPair) return measureRowPair.row(index);
  return measureElement;
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
  const column = pinnedCellStyle(pinOffset?.(key), PIN_Z.body, leads);
  const rowPin = pinnedRowCellStyle(
    rowPinSide,
    rowPinOffset,
    column !== undefined
  );
  if (!column && !rowPin.position) return undefined;
  return { ...column, ...rowPin };
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
  const pin = pinnedCellStyle(
    options.pinOffset?.(column.key),
    PIN_Z.headerPinned,
    options.leads
  );
  const width = pin
    ? pinnedColumnWidth(column, options.columnWidths)
    : options.columnWidths?.[column.key];
  if (!options.stickyStyle && !pin && width == null && !options.setWidth) {
    return undefined;
  }
  const merged: CSSProperties = {
    ...options.stickyStyle,
    ...pin,
    ...(width != null && { width }),
  };
  if (options.setWidth && !merged.position) merged.position = "relative";
  return merged;
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
  const edge = edgePinStyle(side, active, PIN_Z.headerPinned);
  if (!stickyStyle && !edge) return undefined;
  return { ...stickyStyle, ...edge };
}

const WIRING_EQUAL_KEYS = [
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
] as const satisfies readonly (keyof DesktopRowWiring<unknown>)[];

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
  return WIRING_EQUAL_KEYS.every((key) => prev[key] === next[key]);
}

/**
 * One memoized row component per DesktopTable instantiation.
 *
 * @typeParam TRow - The row type.
 * @typeParam TProps - Wiring plus kit extras.
 * @param RowBase - Kit row painter.
 * @param extraEqual - Kit-extra comparator (classNames, size, dir).
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

function isGroupEntry<TRow>(
  entry: GroupedFlatEntry<TRow>
): entry is DesktopGroupEntry<TRow> {
  return (
    entry.kind === "group" ||
    entry.kind === "groupFooter" ||
    entry.kind === "groupMore"
  );
}

function extraSlot(
  slot: {
    kind: "separator" | "fullWidth";
    key: string;
    render?: () => ReactNode;
  },
  columnSpan: number,
  extraFill: (key: string) => CSSProperties | undefined
): DesktopExtraSlot {
  return {
    kind: "extra",
    key: slot.key,
    extraKind: slot.kind,
    colSpan: columnSpan,
    render: slot.kind === "fullWidth" ? slot.render : undefined,
    fillStyle: extraFill(slot.key),
  };
}

interface DesktopRowWiringContext<TRow> {
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  rowStyle: SharedTableRenderProps<TRow>["rowStyle"];
  rowHeight: SharedTableRenderProps<TRow>["rowHeight"];
  leads: PinLeads;
  pinRowSticky: boolean;
  rowPinOffset: number;
  measureRowPair: SharedTableRenderProps<TRow>["measureRowPair"];
  measureElement: SharedTableRenderProps<TRow>["measureElement"];
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  table: UseDataTableResult<TRow>;
  gridFocus: SharedTableRenderProps<TRow>["gridFocus"];
  onRowClick: SharedTableRenderProps<TRow>["onRowClick"];
  handleRowClick: (row: TRow) => void;
  windowStart: number;
  selection: TableRenderModel<TRow>["selection"];
  editing: SharedTableRenderProps<TRow>["editing"];
  prefetch: SharedTableRenderProps<TRow>["prefetch"];
  handlePrefetch: (row: TRow) => void;
  columns: readonly ColumnDef<TRow>[];
  labels: Required<TableLabels>;
  expansionState: SharedTableRenderProps<TRow>["expansion"];
  showActions: boolean;
  showReorder: boolean;
  rows: readonly TRow[];
  reorderPinned: boolean;
  rowPinning: SharedTableRenderProps<TRow>["rowPinning"];
  rowActions: SharedTableRenderProps<TRow>["rowActions"];
  rowActionsLayout: SharedTableRenderProps<TRow>["rowActionsLayout"];
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions: SharedTableRenderProps<TRow>["renderRowActions"];
  confirm: ConfirmHandler;
  columnSpan: number;
  columnSpacers: TableRenderModel<TRow>["columnSpacers"];
  tree: SharedTableRenderProps<TRow>["tree"];
  columnWidths: SharedTableRenderProps<TRow>["columnWidths"];
  pinOffset: SharedTableRenderProps<TRow>["pinOffset"];
  pinSignature: string;
  hasStartPin: boolean;
  hasEndPin: boolean;
  stickActions: boolean;
  rowClassName: SharedTableRenderProps<TRow>["rowClassName"];
  isCellFlashing: SharedTableRenderProps<TRow>["isCellFlashing"];
  getRowId: (row: TRow) => string;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  renderDetail: (row: TRow) => ReactNode;
}

interface DesktopRowWiringArgs<TRow> {
  row: TRow;
  index: number;
  id: string;
  sourceIndex: number;
  rowPinSide: RowPinSide | undefined;
  treeEntry: TreeEntry<TRow> | undefined;
  measure: boolean;
}

interface DesktopBodySlotsContext<TRow> {
  pinnedTopRows: readonly TRow[];
  pinnedBottomRows: readonly TRow[];
  extraRows: SharedTableRenderProps<TRow>["extraRows"];
  extraFill: (key: string) => CSSProperties | undefined;
  paddingTop: number;
  paddingBottom: number;
  grouping: SharedTableRenderProps<TRow>["grouping"];
  entries: TableRenderModel<TRow>["entries"];
  wiring: DesktopRowWiringContext<TRow>;
}

function buildDesktopRowWiring<TRow>(
  ctx: DesktopRowWiringContext<TRow>,
  args: DesktopRowWiringArgs<TRow>
): DesktopRowWiring<TRow> {
  const {
    cellsByRow,
    rowStyle,
    rowHeight,
    leads,
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
    onToggleSelect,
    onToggleExpand,
    renderDetail,
  } = ctx;
  const { row, index, id, sourceIndex, rowPinSide, treeEntry, measure } = args;
  const bodyCells = cellsForRow(cellsByRow, id);
  const visualStyle = resolveRowStyle(rowStyle, rowHeight, row, sourceIndex);
  const focusIndex = sourceIndex;
  const pinPart = pinnedRowPart(rowPinSide);
  const pinSticky = pinnedRowSticky(rowPinSide, pinRowSticky, rowPinOffset);
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, rowPinOffset, true);
  const measureRef = measure
    ? desktopRowMeasureRef(rowPinSide, measureRowPair, index, measureElement)
    : undefined;
  const reorderAttrs = rowReorder?.rowAttrs?.(id, index);
  const rowDomProps = {
    ...table.getRowProps(row, focusIndex),
    ...gridFocus?.getRowPropsAt(focusIndex),
    ...rowClickProps(row, onRowClick ? handleRowClick : undefined, focusIndex),
    ...rowReorder?.dropProps?.(index, row, windowStart),
    ...reorderAttrs,
    "data-row-pin": rowPinSide,
    "data-adapttable-part": pinPart ?? "row",
    "data-stagger": "",
    "data-selected": selection?.isSelected(id) ? "" : undefined,
    "data-dirty": rowIsDirty(editing, id) ? "" : undefined,
    "data-clickable": onRowClick ? "" : undefined,
    style: {
      ...visualStyle,
      ...pinSticky,
      ...rowReorderDropStyle(reorderAttrs),
    },
    onMouseEnter: prefetch ? () => handlePrefetch(row) : undefined,
  };
  return {
    gridFocus,
    row,
    index,
    id,
    table,
    columns,
    bodyCells,
    spanSignature: rowSpanSignature(bodyCells),
    labels,
    selected: selection ? selection.isSelected(id) : undefined,
    expanded: expansionState ? expansionState.isExpanded(id) : undefined,
    showActions,
    showReorder,
    rowReorder,
    windowStart,
    rowCount: rows.length,
    reorderPinned,
    reorderSignature: rowReorderSignature(rowReorder, id, index),
    rowPinSide,
    pinRowSticky,
    rowPinOffset,
    rowPinSignature: rowPinSignature(rowPinning, id),
    sourceIndex,
    rowActions,
    rowActionsLayout,
    cellSpanAppearance,
    renderRowActions,
    confirm,
    columnSpan,
    columnSpacers,
    treeEntry,
    treeColumnKey: tree?.columnKey,
    onToggleTree: tree?.expansion.toggle,
    columnWidths,
    pinOffset,
    pinSignature,
    hasStartPin,
    hasEndPin,
    actionsPinned: stickActions,
    rowClass: rowClassName?.(row, sourceIndex),
    rowVisualStyle: visualStyle,
    rowStyleSignature: rowStyleSignature(visualStyle),
    flashSignature: rowFlashSignature(isCellFlashing, id, columns),
    isCellFlashing,
    clickable: Boolean(onRowClick),
    hasPrefetch: Boolean(prefetch),
    editing,
    rows,
    getRowId,
    editingSignature: rowEditingSignature(editing, id),
    onRowClick: handleRowClick,
    onPrefetch: handlePrefetch,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    measureElement: measure ? measureElement : undefined,
    measureRowPair: measure ? measureRowPair : undefined,
    leads,
    focusIndex,
    pinPart,
    pinSticky,
    edgeRowPin,
    measureRef,
    rowDomProps,
    bodyPinStyle: (key: string) =>
      desktopBodyPinStyle(key, pinOffset, leads, rowPinSide, rowPinOffset),
  };
}

function appendPinnedDesktopSlots<TRow>(
  bodySlots: DesktopBodySlot<TRow>[],
  ctx: DesktopBodySlotsContext<TRow>,
  pinnedRows: readonly TRow[],
  side: RowPinSide
): void {
  const { extraRows, extraFill, wiring } = ctx;
  const { getRowId, columnSpan, rows } = wiring;
  for (const slot of insertExtrasBeforeRows(pinnedRows, extraRows, getRowId)) {
    if (isExtraEntry(slot)) {
      bodySlots.push(extraSlot(slot, columnSpan, extraFill));
    } else {
      const id = getRowId(slot.row);
      const found = rows.findIndex((item) => getRowId(item) === id);
      const sourceIndex = Math.max(0, found);
      bodySlots.push({
        kind: "row",
        key: slot.key,
        wiring: buildDesktopRowWiring(wiring, {
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
  }
}

function appendGroupedDesktopSlots<TRow>(
  bodySlots: DesktopBodySlot<TRow>[],
  ctx: DesktopBodySlotsContext<TRow>
): void {
  const grouping = ctx.grouping;
  if (!grouping) return;
  const { extraFill, wiring } = ctx;
  const { getRowId, columnSpan } = wiring;
  for (const entry of grouping.entries) {
    if (entry.kind === "separator" || entry.kind === "fullWidth") {
      bodySlots.push(extraSlot(entry, columnSpan, extraFill));
      continue;
    }
    if (isGroupEntry(entry)) {
      bodySlots.push({ kind: "group", key: entry.key, entry });
      continue;
    }
    const id = getRowId(entry.row);
    bodySlots.push({
      kind: "row",
      key: entry.key,
      wiring: buildDesktopRowWiring(wiring, {
        row: entry.row,
        index: entry.index,
        id,
        sourceIndex: entry.index,
        rowPinSide: undefined,
        treeEntry: undefined,
        measure: true,
      }),
    });
  }
}

function appendScrollDesktopSlots<TRow>(
  bodySlots: DesktopBodySlot<TRow>[],
  ctx: DesktopBodySlotsContext<TRow>
): void {
  const { extraRows, extraFill, entries, wiring } = ctx;
  const { getRowId, columnSpan, tree } = wiring;
  for (const slot of insertExtraRows(
    bodyRowEntries(entries, tree),
    extraRows,
    (entry) => entry.key
  )) {
    if (isExtraEntry(slot)) {
      bodySlots.push(extraSlot(slot, columnSpan, extraFill));
      continue;
    }
    const { row, index, key, treeEntry, sourceIndex } = slot;
    const id = getRowId(row);
    const resolvedSource = sourceIndex ?? index;
    bodySlots.push({
      kind: "row",
      key,
      wiring: buildDesktopRowWiring(wiring, {
        row,
        index,
        id,
        sourceIndex: resolvedSource,
        rowPinSide: undefined,
        treeEntry,
        measure: true,
      }),
    });
  }
}

function collectDesktopBodySlots<TRow>(
  ctx: DesktopBodySlotsContext<TRow>
): DesktopBodySlot<TRow>[] {
  const bodySlots: DesktopBodySlot<TRow>[] = [];
  appendPinnedDesktopSlots(bodySlots, ctx, ctx.pinnedTopRows, "top");
  if (ctx.paddingTop > 0) {
    bodySlots.push({
      kind: "virtualPad",
      key: "pad-top",
      height: ctx.paddingTop,
      colSpan: ctx.wiring.columnSpan,
    });
  }
  if (ctx.grouping) {
    appendGroupedDesktopSlots(bodySlots, ctx);
  } else {
    appendScrollDesktopSlots(bodySlots, ctx);
  }
  if (ctx.paddingBottom > 0) {
    bodySlots.push({
      kind: "virtualPad",
      key: "pad-bottom",
      height: ctx.paddingBottom,
      colSpan: ctx.wiring.columnSpan,
    });
  }
  appendPinnedDesktopSlots(bodySlots, ctx, ctx.pinnedBottomRows, "bottom");
  return bodySlots;
}

/**
 * Shared desktop-table assembly. Calls {@link tableRenderModel} and
 * {@link UseDataTableResult.getRowProps}; does not replace them.
 *
 * @typeParam TRow - The row type.
 * @param props - The shared render contract plus actionsPinned.
 * @param options - Kit chrome widths.
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
  } = props;

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
    getCellSpan,
    pinOffset,
    tree,
    grouping,
    extraRows,
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
    extraHostFillStyle(key, extraRows, rows, getRowId, rowStyle);
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
  const inScrollBox = maxHeight != null || hasPinned || overflowing;
  const headerStickTop = inScrollBox ? 0 : stickyTop;
  const rowPinOffset = stickyHeader ? headerStickTop + headerHeight : 0;
  const stickyStyle: CSSProperties | undefined = stickyHeader
    ? {
        position: "sticky",
        top: inScrollBox ? 0 : stickyTop,
        zIndex: PIN_Z.header,
      }
    : undefined;
  const stickyAttr = stickyHeader || undefined;
  const hasStartPin = columns.some(
    (column) => pinOffset?.(column.key)?.side === "start"
  );
  const hasEndPin = columns.some(
    (column) => pinOffset?.(column.key)?.side === "end"
  );
  const pinSignature = desktopPinSignature(columns, pinOffset);
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
    edgePinStyle(side, active, PIN_Z.body);

  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  const summary = useSummaryCells(summaryRow, rows);
  const showColumnFooter = summary !== undefined || columnsHaveFooter(columns);

  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra: metrics.extraMinWidth,
  });
  const mergedTableStyle: CSSProperties = {
    ...(minWidth > 0 ? { minWidth } : {}),
    ...fittedTableStyle(fitColumns),
  };
  const resolvedTableStyle =
    Object.keys(mergedTableStyle).length > 0 ? mergedTableStyle : undefined;

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
    onToggleSelect,
    onToggleExpand,
    renderDetail,
  };

  const bodySlots = collectDesktopBodySlots({
    pinnedTopRows,
    pinnedBottomRows,
    extraRows,
    extraFill,
    paddingTop,
    paddingBottom,
    grouping,
    entries,
    wiring: wiringCtx,
  });

  const leaf = (
    column: ColumnDef<TRow>,
    headerIndex: number,
    rowSpan = 1
  ): DesktopHeaderLeaf<TRow> => {
    const localStyle = headStyle(column);
    const headerProps = table.getHeaderCellProps(
      column,
      localStyle && { style: localStyle }
    );
    const chainDir = table.source.sortLevels.find(
      (level) => level.key === column.key
    )?.dir;
    const effectiveDir =
      chainDir ?? (table.sortBy === column.key ? table.sortDir : undefined);
    const sortButtonProps = table.getSortButtonProps(column);
    const sortIndex = sortButtonProps["data-sort-index"];
    // Focus addresses columns in the FULL visible list, while a windowed header
    // is handed its position within the rendered slice. Resolve the absolute
    // index so column selection, the header checkbox and `aria-colindex` all
    // name the same column whether or not the horizontal axis is windowed.
    const absoluteIndex = table.columns.findIndex(
      (candidate) => candidate.key === column.key
    );
    const focusIndex = absoluteIndex === -1 ? headerIndex : absoluteIndex;
    const headerController = columnHeaderController(column, {
      sortDir: effectiveDir,
      sortIndex: typeof sortIndex === "number" ? sortIndex : undefined,
      toggleSort: sortButtonProps.onClick,
    });
    const headerCaption = resolveColumnHeader(column, headerController);
    const headerDef =
      headerFilters === true
        ? filterDefForColumn(filterDefs ?? [], column.key)
        : undefined;
    const columnName =
      typeof column.header === "string" ? column.header : column.key;
    const style = {
      ...headerProps.style,
      ...(rowSpan > 1 ? { verticalAlign: "middle" as const } : {}),
    };
    return {
      column,
      headerIndex,
      rowSpan,
      headerProps,
      columnHeaderProps:
        gridFocus?.getColumnHeaderProps(focusIndex, {
          sortable: column.sortable,
        }) ?? {},
      style,
      sortDir: effectiveDir,
      sortActive: effectiveDir !== undefined,
      sortButtonProps,
      sortIndex: typeof sortIndex === "number" ? sortIndex : undefined,
      caption: headerCaption,
      headerDef,
      pinSide: pinOffset?.(column.key)?.side,
      resizeHandleProps: setWidth
        ? columnResizeHandleProps(
            column.key,
            setWidth,
            `${resizeLabel}: ${columnName}`
          )
        : undefined,
      columnName,
      showColumnCheckbox: gridFocus?.columnCheckbox === true,
      columnCheckboxChecked: gridFocus?.isColumnSelected(focusIndex) ?? false,
      onToggleColumn: gridFocus
        ? () => gridFocus.toggleColumn(focusIndex)
        : undefined,
      columnSelectAriaLabel: columnSelectLabel(labels.selectColumn, column),
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
      boxStyle: desktopScrollBoxStyle(maxHeight, hasPinned || overflowing),
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

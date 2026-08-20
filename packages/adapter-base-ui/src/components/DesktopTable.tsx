/** The desktop `<table>`: header, pinned columns, rows and summary. */
import {
  type ColumnDef,
  columnGroupHeaderCaption,
  columnHeaderController,
  columnResizeHandleProps,
  columnsHaveFooter,
  type ConfirmHandler,
  type Direction,
  type EditableCellEditing,
  filterDefForColumn,
  type GridFocusState,
  PIN_Z,
  type PinSide,
  resolveColumnFooter,
  resolveColumnHeader,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  type RowExpansionState,
  type RowPinSide,
  type SelectionState,
  type TableLabels,
  tableMinWidth,
  type TreeEntry,
  type UseDataTableResult,
  useHorizontalOverflow,
} from "@adapttable/core";
import {
  type BodyCell,
  cellHighlightStyle,
  cellSpanMark,
  columnFlexShares,
  columnSelectLabel,
  columnSizeStyle,
  ColumnSpacer,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  fittedTableStyle,
  groupedHeaderAlign,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  logicalAlign,
  mergedCellStyle,
  type PinLeads,
  pinnedColumnWidth,
  pinnedDataCellStyle,
  pinnedEdgeCellStyle,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  type PinOffset,
  REORDER_COLUMN_WIDTH,
  rowClickProps,
  rowIsDirty,
  type RowPairMeasurer,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  shallowEqualByKeys,
  SHARED_DESKTOP_ROW_KEYS,
  type SharedTableRenderProps,
  sortArrow,
  useDesktopTableAssembly,
  useOffsetHeight,
  useSummaryCells,
} from "@adapttable/core/adapter";
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
  type RefObject,
  useCallback,
  useMemo,
  useRef,
} from "react";

import type { BaseUiAccentColor } from "../types";
import { Box, Table, Text } from "../ui";
import { ColumnSelectCheckbox } from "./ColumnSelectCheckbox";
import { EditableDataCell } from "./EditableCell";
import { ExpandToggle } from "./ExpandToggle";
import { FillHandle } from "./FillHandle";
import { GroupHeaderRow } from "./GroupHeader";
import {
  ColumnGroupToggle,
  FilterHeaderTrigger,
  RowEditActions,
  RowReorderHandle,
  TreeCell,
} from "./kitControls";
import { Checkbox } from "./primitives";
import { RowActionButtons } from "./RowActionButtons";

function ExtraSlotRow({
  kind,
  colSpan,
  render,
  labels,
  fillStyle,
}: Readonly<{
  kind: "separator" | "fullWidth";
  colSpan: number;
  render?: () => ReactNode;
  labels: TableLabels;
  fillStyle?: CSSProperties;
}>) {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <Table.Row
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <Table.Cell
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </Table.Cell>
    </Table.Row>
  );
}

type TableSize = "1" | "2" | "3";

/** Inline style for an absolutely-positioned column-resize handle. */
const RESIZE_HANDLE_STYLE: CSSProperties = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
};

/** Width (px) reserved for the leading expand-chevron column. */
const EXPANSION_WIDTH = 32;
const SELECTION_WIDTH = 48;
const ACTIONS_WIDTH = 120;

function When({
  show,
  children,
}: Readonly<{ show: boolean; children: ReactNode }>) {
  if (!show) return null;
  return children;
}

function pinChrome(options: {
  expandable: boolean;
  showReorder: boolean;
  hasSelection: boolean;
  showActions: boolean;
  actionsPinned: boolean;
  reorderPinned: boolean;
  columns: readonly { key: string }[];
  pinOffset?: (key: string) => unknown;
}): {
  hasPinned: boolean;
  leads: PinLeads;
  extraMinWidth: number;
  expand: number;
  selectionLead: number;
  reorderSig: string;
} {
  const {
    expandable,
    showReorder,
    hasSelection,
    showActions,
    actionsPinned,
    reorderPinned,
    columns,
    pinOffset,
  } = options;
  const expand = expandable ? EXPANSION_WIDTH : 0;
  const reorder = showReorder ? REORDER_COLUMN_WIDTH : 0;
  const select = hasSelection ? SELECTION_WIDTH : 0;
  const actions = showActions ? ACTIONS_WIDTH : 0;
  return {
    hasPinned:
      actionsPinned ||
      (showReorder && reorderPinned) ||
      columns.some((c) => pinOffset?.(c.key) != null),
    leads: { start: expand + reorder + select, end: actions },
    extraMinWidth: expand + reorder + select + actions,
    expand,
    selectionLead: expand + reorder,
    reorderSig: showReorder && reorderPinned ? "reorder:start" : "",
  };
}

/** Opaque background for sticky/pinned cells (the panel surface). */
const PIN_BG = "var(--adapttable-surface, #ffffff)";

/**
 * Ensure pinned columns stick against our scroll wrapper via a min-width
 * custom property on the wrapper.
 */
const STICKY_FIX_CLASS = "adapttable-base-ui-scroll";

const STICKY_FIX_CSS = `.${STICKY_FIX_CLASS} table{overflow:visible;min-width:var(--adapttable-min-width,0)}`;

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  /** Class hook for the table (desktop) / each card (mobile). */
  className?: string;
  size: TableSize;
  accentColor?: BaseUiAccentColor;
  /** Text direction — flips the expand chevron for RTL. */
  dir?: Direction;
  /**
   * The injected actions column is end-pinned (via the Columns menu), so
   * its cells stick to the inline end even with zero data columns pinned.
   */
  actionsPinned?: boolean;
}

/** Map a column's alignment onto a cell `justify` value. */
const justifyFor = logicalAlign;

/**
 * Header sort indicator, derived from the cell's computed `aria-sort` so a
 * multi-sort chain level shows its own direction, not the single-sort one.
 * The trailing U+FE0E forces text (not emoji) presentation — Base UI's font
 * forces text (not emoji) presentation.
 */
const sortGlyph = (sort: unknown): string => sortArrow(sort) + "\uFE0E";

/**
 * Pinned data-cell style with an opaque background. A raw `style` keeps the
 * pixel insets the core layout computes from being mangled by any prop scale.
 */
const pinCellStyle = (pin: PinOffset | undefined, z: number, leads: PinLeads) =>
  pinnedDataCellStyle(pin, z, leads, PIN_BG);

/** Sticky edge-cell style (chevron / selection / actions) over that background. */
const edgeCellStyle = (side: PinSide, active: boolean, z: number, shift = 0) =>
  pinnedEdgeCellStyle(side, active, z, PIN_BG, shift);

/**
 * Everything a memoized desktop row reads through ONE identity-stable ref: the
 * latest callbacks and pin geometry. Routing them through the ref (read at
 * event/render time) keeps a changed callback identity from re-rendering every
 * row, without ever calling a stale closure.
 */
interface DesktopRowApi<TRow> {
  /**
   * Core's row prop-getter — the part name, `role`, the row id, the dataset
   * index and `aria-selected` in one spread. It rides this ref like the other
   * per-render values: core rebuilds it on every selection change, while
   * everything it emits moves only with a compared prop.
   */
  getRowProps: UseDataTableResult<TRow>["getRowProps"];
  selection: SelectionState | null;
  expansion?: RowExpansionState;
  rowActions?: RowAction<TRow>[];
  confirm: ConfirmHandler;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  renderRowDetail?: (row: TRow) => ReactNode;
  pinOffset?: (key: string) => PinOffset | undefined;
  measureElement?: (element: Element | null) => void;
  /** Measures a row together with its open detail panel. */
  measureRowPair?: RowPairMeasurer;
  leads: PinLeads;
  hasStartPin: boolean;
  /** Actions cells stick: a data column is right-pinned OR actions are end-pinned. */
  actionsStick: boolean;
  /** Headless reorder; uncompared — visual churn is `reorderSignature`. */
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  windowStart: number;
  rowCount: number;
  reorderPinned: boolean;
}

/** The visual inputs of one desktop row — exactly what the memo compares. */
interface DesktopRowProps<TRow> {
  row: TRow;
  id: string;
  index: number;
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  selected: boolean;
  expanded: boolean;
  size: TableSize;
  accentColor?: BaseUiAccentColor;
  dir?: Direction;
  columns: readonly ColumnDef<TRow>[];
  /** This row's cells — covered neighbours already omitted. */
  bodyCells: readonly BodyCell<TRow>[];
  /** Memo digest from {@link rowSpanSignature}. */
  spanSignature: string;
  columnWidths?: Readonly<Record<string, number>>;
  /** Serialized pin geometry — stands in for the `pinOffset` closure. */
  pinSignature: string;
  /** The `rowClassName(row, index)` output, compared as a plain string. */
  className?: string;
  /** Pre-computed `rowStyle` + `rowHeight` (compared via signature). */
  rowVisualStyle: CSSProperties | undefined;
  rowStyleSignature: string;
  labels: Required<TableLabels>;
  rowActionsLayout?: RowActionsLayout;
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions?: RowActionsRenderer<TRow>;
  hasSelection: boolean;
  expandable: boolean;
  showActions: boolean;
  showReorder: boolean;
  /** Memo digest from {@link rowReorderSignature}. */
  reorderSignature: string | null;
  /** Which edge this row is pinned to, if any. */
  rowPinSide?: RowPinSide;
  /** Sticky pin chrome — off when a cell span would overlay the next rows. */
  pinRowSticky: boolean;
  /** Sticky header offset for a pinned row's cells. */
  rowPinOffset: number;
  /** Memo digest from {@link rowPinSignature}. */
  rowPinSignature: string | null;
  /** Dataset index for ARIA / focus when pinning remapped the window. */
  sourceIndex: number;
  hasRowClick: boolean;
  /** Spacer/detail colSpan (selection + data + actions + expansion). */
  columnSpan: number;
  /** Widths holding open the columns outside the horizontal window. */
  columnSpacers?: { start: number; end: number };
  /** This row's place in the tree, when the table has one. */
  treeEntry?: TreeEntry<TRow>;
  /** Which column carries the chevron and the indent. */
  treeColumnKey?: string;
  /** Open or close a tree node. */
  onToggleTree?: (id: string) => void;
  /** Identity-stable ref to the latest callbacks — see {@link DesktopRowApi}. */
  api: RefObject<DesktopRowApi<TRow>>;
  /** Identity-stable ref-callback forwarding to the virtualizer's measure. */
  measureRef: (element: HTMLTableRowElement | null) => void;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The props {@link desktopRowPropsEqual} compares. `api` and `measureRef` are
 * deliberately absent: both are identity-stable by construction, and a row must
 * never re-render because some callback's identity changed.
 */
const ROW_VISUAL_KEYS = [
  ...SHARED_DESKTOP_ROW_KEYS,
  "accentColor",
  "editingSignature",
  "rowPinSide",
  "pinRowSticky",
  "rowPinOffset",
  "sourceIndex",
  "rowStyleSignature",
] as const satisfies readonly (keyof DesktopRowProps<unknown>)[];

/** Re-render a row only when one of its visual inputs changes. */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return shallowEqualByKeys(ROW_VISUAL_KEYS, prev, next);
}

/** One desktop row (+ its detail panel row while expanded). */
function DesktopRowBase<TRow>({
  row,
  id,
  index,
  gridFocus,
  selected,
  expanded,
  accentColor,
  dir,
  columns,
  bodyCells,
  className,
  rowVisualStyle,
  labels,
  rowActionsLayout,
  cellSpanAppearance,
  renderRowActions,
  hasSelection,
  expandable,
  showActions,
  showReorder,
  rowPinSide,
  pinRowSticky,
  rowPinOffset,
  sourceIndex,
  hasRowClick,
  columnSpan,
  columnSpacers,
  api,
  measureRef,
  editing,
  rows,
  getRowId,
  treeEntry,
  treeColumnKey: treeKey,
  onToggleTree,
}: Readonly<DesktopRowProps<TRow>>) {
  // Render-time geometry reads the latest ref values: whenever they change, a
  // compared prop (pinSignature / hasSelection / …) changes with them.
  const live = api.current;
  const activateRow = (r: TRow): void => {
    api.current.onRowClick?.(r);
  };
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, rowPinOffset, true);
  const dataPinStyle = (key: string) => {
    const column = pinCellStyle(live.pinOffset?.(key), 1, live.leads);
    const rowPin = pinnedRowCellStyle(
      rowPinSide,
      rowPinOffset,
      column !== undefined
    );
    if (!column && !rowPin.position) return undefined;
    return { ...column, ...rowPin };
  };
  const focusIndex = sourceIndex;
  const pinPart = pinnedRowPart(rowPinSide);
  const pinSticky = pinnedRowSticky(rowPinSide, pinRowSticky, rowPinOffset);
  return (
    <>
      <Table.Row
        {...live.getRowProps(row, focusIndex)}
        {...gridFocus?.getRowPropsAt(focusIndex)}
        {...rowClickProps(
          row,
          hasRowClick ? activateRow : undefined,
          focusIndex
        )}
        {...(live.rowReorder?.dropProps(index, row, live.windowStart) ?? {})}
        {...(live.rowReorder?.rowAttrs(id, index) ?? {})}
        ref={rowPinSide ? undefined : measureRef}
        data-row-pin={rowPinSide}
        data-adapttable-part={pinPart ?? "row"}
        data-stagger=""
        data-dirty={rowIsDirty(editing, id) ? "" : undefined}
        className={className}
        style={{
          background: selected ? "var(--gray-a3)" : undefined,
          ...rowVisualStyle,
          ...pinSticky,
          ...rowReorderDropStyle(live.rowReorder?.rowAttrs(id, index)),
        }}
        onMouseEnter={() => api.current.prefetch?.(row)}
      >
        {expandable && (
          <Table.Cell
            style={{
              ...edgeCellStyle("start", live.hasStartPin, PIN_Z.body),
              ...edgeRowPin,
            }}
          >
            <ExpandToggle
              open={expanded}
              dir={dir}
              labels={labels}
              onToggle={() => api.current.expansion?.toggle(id)}
            />
          </Table.Cell>
        )}
        {showReorder && live.rowReorder && (
          <Table.Cell
            data-adapttable-part="reorder-cell"
            style={{
              ...edgeCellStyle(
                "start",
                live.hasStartPin || live.reorderPinned,
                PIN_Z.body,
                expandable ? EXPANSION_WIDTH : 0
              ),
              ...edgeRowPin,
            }}
          >
            <RowReorderHandle
              reorder={live.rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={live.windowStart}
              rowCount={live.rowCount}
            />
          </Table.Cell>
        )}
        {hasSelection && (
          <Table.Cell
            data-adapttable-part="selection-cell"
            style={{
              ...edgeCellStyle(
                "start",
                live.hasStartPin,
                PIN_Z.body,
                (expandable ? EXPANSION_WIDTH : 0) +
                  (showReorder ? REORDER_COLUMN_WIDTH : 0)
              ),
              ...edgeRowPin,
            }}
          >
            <Checkbox
              aria-label={labels.selectRow}
              checked={selected}
              onToggle={() => api.current.selection?.toggle(id)}
            />
          </Table.Cell>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          return (
            <Table.Cell
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              {...focusProps}
              justify={
                mergedCellStyle(colSpan, rowSpan, cellSpanAppearance)
                  ? "center"
                  : justifyFor(column.align)
              }
              style={
                // This kit's own subtle fill for a selected cell, applied over the
                // pinned background so a pinned column still shows the selection.
                cellHighlightStyle(
                  focusProps,
                  {
                    ...dataPinStyle(column.key),
                    ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                  },
                  {
                    background:
                      "var(--adapttable-cell-selected, rgba(59, 130, 246, 0.14))",
                  }
                )
              }
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={labels}
                onToggle={onToggleTree}
              >
                <EditableDataCell
                  editing={editing}
                  row={row}
                  column={column}
                  rowId={id}
                  rows={rows}
                  columns={columns}
                  rowKey={getRowId}
                  editLabel={labels.editCell}
                  undoLabel={labels.undoEdit}
                  display={
                    column.Cell ? (
                      <column.Cell row={row} rowIndex={focusIndex} />
                    ) : (
                      column.accessor?.(row)
                    )
                  }
                />
              </TreeCell>
              <FillHandle
                focus={gridFocus}
                windowIndex={focusIndex}
                col={columnIndex}
              />
            </Table.Cell>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <Table.Cell
            justify="end"
            style={{
              ...edgeCellStyle("end", live.actionsStick, PIN_Z.body),
              ...edgeRowPin,
            }}
          >
            {editing?.rowEditing && (
              <RowEditActions
                rowEditing={editing.rowEditing}
                row={row}
                rowId={id}
                labels={labels}
              />
            )}
            {/* The control column also exists for row mode alone, so this is
                not the same question as `showActions`. */}
            {live.rowActions && live.rowActions.length > 0 && (
              <RowActionButtons
                row={row}
                actions={live.rowActions}
                confirm={live.confirm}
                labels={labels}
                layout={rowActionsLayout}
                render={renderRowActions}
                accentColor={accentColor}
              />
            )}
          </Table.Cell>
        )}
      </Table.Row>
      {expandable && expanded && (
        <Table.Row>
          <Table.Cell colSpan={columnSpan}>
            {api.current.renderRowDetail?.(row)}
          </Table.Cell>
        </Table.Row>
      )}
    </>
  );
}

/**
 * Materialize the memoized row for one TRow. React 18's `memo` typing drops a
 * generic component's type parameter, so each `DesktopTable` instantiates the
 * memo for its own row type (zero casts, full type safety).
 */
function createDesktopRow<TRow>() {
  return memo(DesktopRowBase<TRow>, desktopRowPropsEqual<TRow>);
}

/** Desktop Base UI table. */
export function DesktopTable<TRow>(props: Readonly<SharedProps<TRow>>) {
  const {
    rowActions,
    confirm,
    onRowClick,
    prefetch,
    renderRowDetail,
    measureElement,
    measureRowPair,
    rowReorder,
    windowStart = 0,
    gridFocus,
    table,
    rows,
    size,
    accentColor,
    dir,
    collapsibleColumnGroups,
    collapsedColumnGroups,
    columnGroups,
    onToggleColumnGroup,
    summaryRow,
    expansion,
    grouping,
    className,
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
    fitColumns,
    headerFilters,
    filterDefs,
    filterRegistry,
    closeHeaderFilterOnSelect,
  } = props;
  const assembly = useDesktopTableAssembly(props, {
    widths: {
      expansion: EXPANSION_WIDTH,
      selection: SELECTION_WIDTH,
      actions: ACTIONS_WIDTH,
    },
  });
  // Core's render model counts the expansion column in `columnSpan` when
  // `renderRowDetail` + `expansion` arrive (the chrome builds them together),
  // so spacer and detail rows span it without local `+ 1` math.
  const {
    columnSpacers,
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    leadingCells,
  } = assembly.model;
  const [theadRef] = useOffsetHeight();
  const [headerRowRef] = useOffsetHeight();
  const expandable = expansion !== undefined;
  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  const summary = useSummaryCells(summaryRow, rows);
  const showColumnFooter = summary !== undefined || columnsHaveFooter(columns);
  // End-pinned actions count as a pin too: sticking them needs the wrapper to
  // be the horizontal scroll container, exactly like a pinned data column.
  const { hasPinned, leads, extraMinWidth, expand, selectionLead, reorderSig } =
    pinChrome({
      expandable,
      showReorder,
      hasSelection: Boolean(selection),
      showActions,
      actionsPinned,
      reorderPinned,
      columns: table.columns,
      pinOffset,
    });
  // With no maxHeight and no pins the wrapper must stay a NON-scroll container
  // so page-scroll sticky headers keep working — but a table wider than the
  // card would then bleed past it. Measure, and scroll only on real overflow.
  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();
  // ANY scroll container (maxHeight, pins, measured overflow) becomes the
  // sticky context: the header must pin to ITS top — a viewport offset would
  // shove it down into the rows.
  const inScrollBox = maxHeight != null || hasPinned || overflowing;

  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions cells stick flush to the inline end when a data column is
  // pinned right (so it can't slide beneath them) OR when the actions column
  // itself is end-pinned from the Columns menu — independently, in one click.
  const actionsStick = hasEndPin || actionsPinned;
  // Add the sticky-top offset onto an (optionally pinned) header-cell style.
  const stickify = (
    base: CSSProperties | undefined
  ): CSSProperties | undefined => {
    if (!stickyHeader) return base;
    const top = inScrollBox ? 0 : stickyTop;
    if (base?.position === "sticky") return { ...base, top };
    return {
      ...base,
      position: "sticky",
      top,
      zIndex: PIN_Z.header,
      background: PIN_BG,
    };
  };
  // Header-cell style merging pin + user width; the resize handle is absolute,
  // so add a positioning context when the cell is not already sticky/pinned.
  const headCellStyle = (
    column: ColumnDef<TRow>
  ): CSSProperties | undefined => {
    const key = column.key;
    const pin = pinCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    const sizing = columnSizeStyle(column, flexShares, columnWidths?.[key]);
    if (!pin && width == null && !setWidth && !sizing) {
      return stickify(undefined);
    }
    const style: CSSProperties = { ...pin, ...sizing };
    if (width != null) style.width = width;
    if (setWidth && !stickyHeader && !pin) style.position = "relative";
    return stickify(style);
  };
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;

  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  // Each flexible column's share, from the same rule core's prop-getters
  // use — so a kit that styles its own header still sizes identically.
  const flexShares = columnFlexShares({
    columns,
    fitColumns,
    widths: columnWidths,
  });

  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra: extraMinWidth,
  });

  // The memoized row reads everything non-visual through this single ref,
  // re-assigned every render so event handlers always see the latest values
  // without their identity ever becoming a compared prop.
  const rowApi: DesktopRowApi<TRow> = {
    getRowProps: table.getRowProps,
    selection,
    expansion,
    rowActions,
    confirm,
    onRowClick,
    prefetch,
    renderRowDetail,
    pinOffset,
    measureElement,
    measureRowPair,
    leads,
    hasStartPin,
    actionsStick,
    rowReorder,
    windowStart,
    rowCount: rows.length,
    reorderPinned,
  };
  const api = useRef(rowApi);
  api.current = rowApi;
  const measureRef = useCallback((element: HTMLTableRowElement | null) => {
    api.current.measureElement?.(element);
  }, []);
  // One memoized row component per table instance — see createDesktopRow.
  const Row = useMemo(() => createDesktopRow<TRow>(), []);
  // `pinOffset` is a fresh closure whenever the layout changes, so rows compare
  // this serialized pin geometry instead of a function identity. The actions
  // edge is part of the geometry: end-pinning the actions column must re-render
  // the memoized rows so their actions cells turn sticky.
  const pinSignature = [
    actionsStick ? "actions:end" : "",
    reorderSig,
    ...columns.map((column) => {
      const pin = pinOffset?.(column.key);
      return pin ? `${column.key}:${pin.side}:${pin.inset}` : "";
    }),
  ].join("|");
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );

  const renderLeafHeader = (
    column: ColumnDef<TRow>,
    headerIndex: number,
    rowSpan = 1
  ): ReactElement => {
    const ariaSort = table.getHeaderCellProps(column)["aria-sort"] as
      | "ascending"
      | "descending"
      | "none"
      | undefined;
    // Core's sort onClick receives the click EVENT: with `multiSort` a
    // shift-click cycles the column through the sort chain while a
    // plain click keeps single-sorting.
    const sortButton = table.getSortButtonProps(column);
    const sortClick = sortButton.onClick;
    const sortIndex = sortButton["data-sort-index"];
    const caption = resolveColumnHeader(
      column,
      columnHeaderController(column, {
        sortIndex: typeof sortIndex === "number" ? sortIndex : undefined,
        toggleSort: sortClick,
      })
    );
    const actions = column.headerActions ? (
      <span data-adapttable-part="header-actions">{column.headerActions}</span>
    ) : null;
    const columnSelect =
      gridFocus?.columnCheckbox === true ? (
        <ColumnSelectCheckbox
          label={columnSelectLabel(labels.selectColumn, column)}
          checked={gridFocus.isColumnSelected(headerIndex)}
          onToggle={() => gridFocus.toggleColumn(headerIndex)}
        />
      ) : null;
    const headerDef =
      headerFilters === true
        ? filterDefForColumn(filterDefs ?? [], column.key)
        : undefined;
    const style = {
      ...headCellStyle(column),
      ...(rowSpan > 1 ? { verticalAlign: "middle" as const } : {}),
    };
    return (
      <Table.ColumnHeaderCell
        key={column.key}
        data-adapttable-part="header-cell"
        {...(gridFocus?.getColumnHeaderProps(headerIndex, {
          sortable: column.sortable,
        }) ?? {})}
        justify={justifyFor(column.align)}
        aria-sort={ariaSort}
        data-column-key={column.key}
        rowSpan={rowSpan > 1 ? rowSpan : undefined}
        style={style}
      >
        {column.sortable ? (
          <button
            type="button"
            className="adapttable-sort-btn"
            style={{
              cursor: "pointer",
              font: "inherit",
              color: "inherit",
              background: "none",
              border: 0,
              padding: 0,
              display: "inline-flex",
              alignItems: "center",
            }}
            aria-label={`${labels.sortBy}: ${columnName(column)}`}
            onClick={sortClick}
            title={column.headerTooltip}
          >
            {caption}
            <Text as="span" aria-hidden>
              {sortGlyph(ariaSort)}
            </Text>
            {sortIndex !== undefined && (
              <Text
                as="span"
                aria-hidden
                data-sort-index={sortIndex}
                size="1"
                weight="bold"
                ml="1"
                style={{
                  borderRadius: "9999px",
                  padding: "0 0.4em",
                  background: "var(--gray-a3)",
                }}
              >
                {sortIndex}
              </Text>
            )}
          </button>
        ) : (
          <span title={column.headerTooltip}>{caption}</span>
        )}
        {columnSelect}
        {actions}
        {headerDef ? (
          <FilterHeaderTrigger
            def={headerDef}
            source={table.source}
            labels={labels}
            registry={filterRegistry}
            closeOnSelect={closeHeaderFilterOnSelect}
          />
        ) : null}
        {setWidth && (
          <span
            style={RESIZE_HANDLE_STYLE}
            {...columnResizeHandleProps(
              column.key,
              setWidth,
              `${resizeLabel}: ${columnName(column)}`
            )}
          />
        )}
      </Table.ColumnHeaderCell>
    );
  };

  const renderPlanCell = (cell: HtmlGroupedHeaderCell): ReactElement => {
    if (cell.kind === "leaf") {
      return renderLeafHeader(
        columns[cell.columnIndex]!,
        cell.columnIndex,
        cell.rowSpan
      );
    }
    return (
      <Table.ColumnHeaderCell
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        justify={groupedHeaderAlign(cell.cell.align)}
        data-adapttable-part="header-group-cell"
        style={groupedHeaderCellStyle(
          cell,
          "var(--color-gray-6, color-mix(in srgb, currentColor 22%, transparent))"
        )}
      >
        <span style={groupedHeaderLabelStyle()}>
          {onToggleColumnGroup ? (
            <ColumnGroupToggle
              cell={cell.cell}
              labels={labels}
              onToggle={onToggleColumnGroup}
            />
          ) : null}
          {columnGroupHeaderCaption(cell.cell)}
        </span>
      </Table.ColumnHeaderCell>
    );
  };

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        overflowRef(node);
        virtualScrollRef?.(node);
        // Feed STICKY_FIX_CSS the fixed-column min-width as a custom property
        // (React's CSSProperties type rejects `--*` keys, so set it directly):
        // it lands on the table so pinned/edge sticky cells stick against the wrapper.
        node?.style.setProperty(
          "--adapttable-min-width",
          minWidth > 0 ? `${minWidth}px` : "0"
        );
      }}
      className={STICKY_FIX_CLASS}
      style={{
        maxHeight: maxHeight == null ? undefined : `${maxHeight}px`,
        overflowX:
          maxHeight != null || hasPinned || overflowing ? "auto" : undefined,
        overflowY: maxHeight == null ? undefined : "auto",
      }}
    >
      {/* See STICKY_FIX_CSS: push min-width onto the table so pinning sticks. */}
      <style>{STICKY_FIX_CSS}</style>
      <Table.Root
        size={size}
        variant="surface"
        data-size={size}
        className={className}
        aria-label={table.getTableProps()["aria-label"]}
        {...gridFocus?.getGridProps()}
        tableStyle={fittedTableStyle(fitColumns)}
      >
        <thead data-adapttable-part="thead" ref={theadRef}>
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <Table.Row
                  key={row.map((cell) => cell.key).join("|")}
                  ref={last ? headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? (
                    <>
                      {expandable && (
                        <Table.ColumnHeaderCell
                          aria-label={labels.expandRow}
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={stickify(
                            edgeCellStyle(
                              "start",
                              hasStartPin,
                              PIN_Z.headerPinned
                            )
                          )}
                        />
                      )}
                      <When show={showReorder}>
                        <Table.ColumnHeaderCell
                          aria-label={labels.reorderRow}
                          data-adapttable-part="reorder-header"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={stickify(
                            edgeCellStyle(
                              "start",
                              hasStartPin || reorderPinned,
                              PIN_Z.headerPinned,
                              expand
                            )
                          )}
                        />
                      </When>
                      {selection && (
                        <Table.ColumnHeaderCell
                          data-adapttable-part="selection-header"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={stickify(
                            edgeCellStyle(
                              "start",
                              hasStartPin,
                              PIN_Z.headerPinned,
                              selectionLead
                            )
                          )}
                        >
                          <Checkbox
                            aria-label={labels.selectAll}
                            checked={selection.headerState === "all"}
                            indeterminate={selection.headerState === "some"}
                            onToggle={selection.toggleAll}
                          />
                        </Table.ColumnHeaderCell>
                      )}
                      {columnSpacers && (
                        <ColumnSpacer
                          width={columnSpacers.start}
                          side="start"
                          as="th"
                        />
                      )}
                    </>
                  ) : null}
                  {row.map(renderPlanCell)}
                  {rowIndex === 0 ? (
                    <>
                      {columnSpacers && (
                        <ColumnSpacer
                          width={columnSpacers.end}
                          side="end"
                          as="th"
                        />
                      )}
                      {showActions && (
                        <Table.ColumnHeaderCell
                          justify="end"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={stickify(
                            edgeCellStyle(
                              "end",
                              actionsStick,
                              PIN_Z.headerPinned
                            )
                          )}
                        >
                          {labels.actions}
                        </Table.ColumnHeaderCell>
                      )}
                    </>
                  ) : null}
                </Table.Row>
              );
            })
          ) : (
            <Table.Row ref={headerRowRef} data-adapttable-part="header-row">
              {expandable && (
                <Table.ColumnHeaderCell
                  aria-label={labels.expandRow}
                  style={stickify(
                    edgeCellStyle("start", hasStartPin, PIN_Z.headerPinned)
                  )}
                />
              )}
              <When show={showReorder}>
                <Table.ColumnHeaderCell
                  aria-label={labels.reorderRow}
                  data-adapttable-part="reorder-header"
                  style={stickify(
                    edgeCellStyle(
                      "start",
                      hasStartPin || reorderPinned,
                      PIN_Z.headerPinned,
                      expand
                    )
                  )}
                />
              </When>
              {selection && (
                <Table.ColumnHeaderCell
                  data-adapttable-part="selection-header"
                  style={stickify(
                    edgeCellStyle(
                      "start",
                      hasStartPin,
                      PIN_Z.headerPinned,
                      selectionLead
                    )
                  )}
                >
                  <Checkbox
                    aria-label={labels.selectAll}
                    checked={selection.headerState === "all"}
                    indeterminate={selection.headerState === "some"}
                    onToggle={selection.toggleAll}
                  />
                </Table.ColumnHeaderCell>
              )}
              {columnSpacers && (
                <ColumnSpacer
                  width={columnSpacers.start}
                  side="start"
                  as="th"
                />
              )}
              {columns.map((column, headerIndex) =>
                renderLeafHeader(column, headerIndex)
              )}
              {columnSpacers && (
                <ColumnSpacer width={columnSpacers.end} side="end" as="th" />
              )}
              {showActions && (
                <Table.ColumnHeaderCell
                  justify="end"
                  style={stickify(
                    edgeCellStyle("end", actionsStick, PIN_Z.headerPinned)
                  )}
                >
                  {labels.actions}
                </Table.ColumnHeaderCell>
              )}
            </Table.Row>
          )}
        </thead>
        <tbody data-adapttable-part="tbody">
          {assembly.bodySlots.map((slot) => {
            if (slot.kind === "extra") {
              return (
                <ExtraSlotRow
                  key={slot.key}
                  kind={slot.extraKind}
                  colSpan={slot.colSpan}
                  render={slot.render}
                  labels={labels}
                  fillStyle={slot.fillStyle}
                />
              );
            }
            if (slot.kind === "virtualPad") {
              return (
                <tr key={slot.key} aria-hidden>
                  <td
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </tr>
              );
            }
            if (slot.kind === "group") {
              return (
                <GroupHeaderRow
                  key={slot.key}
                  entry={slot.entry}
                  columns={columns}
                  leadingCells={leadingCells}
                  showActions={showActions}
                  getCellProps={table.getCellProps}
                  selection={selection}
                  labels={labels}
                  dir={dir}
                  accentColor={accentColor}
                  onToggleCollapse={onToggleGroup}
                  onShowMore={grouping?.showMore ?? (() => undefined)}
                />
              );
            }
            const wiring = slot.wiring;
            return (
              <Row
                key={slot.key}
                row={wiring.row}
                id={wiring.id}
                index={wiring.index}
                gridFocus={wiring.gridFocus}
                selected={wiring.selected ?? false}
                expanded={wiring.expanded ?? false}
                size={size}
                accentColor={accentColor}
                dir={dir}
                columns={wiring.columns}
                bodyCells={wiring.bodyCells}
                spanSignature={wiring.spanSignature}
                columnWidths={wiring.columnWidths}
                pinSignature={pinSignature}
                className={wiring.rowClass}
                rowVisualStyle={wiring.rowVisualStyle}
                rowStyleSignature={wiring.rowStyleSignature}
                labels={wiring.labels}
                rowActionsLayout={wiring.rowActionsLayout}
                cellSpanAppearance={wiring.cellSpanAppearance}
                renderRowActions={wiring.renderRowActions}
                hasSelection={wiring.selected !== undefined}
                expandable={wiring.expanded !== undefined}
                showActions={wiring.showActions}
                showReorder={wiring.showReorder}
                reorderSignature={wiring.reorderSignature}
                rowPinSide={wiring.rowPinSide}
                pinRowSticky={wiring.pinRowSticky}
                rowPinOffset={wiring.rowPinOffset}
                rowPinSignature={wiring.rowPinSignature}
                sourceIndex={wiring.sourceIndex}
                hasRowClick={wiring.clickable}
                columnSpan={wiring.columnSpan}
                columnSpacers={wiring.columnSpacers}
                treeEntry={wiring.treeEntry}
                treeColumnKey={wiring.treeColumnKey}
                onToggleTree={wiring.onToggleTree}
                api={api}
                measureRef={measureRef}
                editing={wiring.editing}
                rows={wiring.rows}
                getRowId={wiring.getRowId}
                editingSignature={wiring.editingSignature}
              />
            );
          })}
          {showColumnFooter && (
            <Table.Row data-summary="">
              {expandable && <Table.Cell />}
              <When show={showReorder}>
                <Table.Cell />
              </When>
              {selection && <Table.Cell />}
              {columns.map((column) => (
                <Table.Cell key={column.key} justify={justifyFor(column.align)}>
                  {resolveColumnFooter(column, summary?.[column.key])}
                </Table.Cell>
              ))}
              {showActions && <Table.Cell />}
            </Table.Row>
          )}
        </tbody>
      </Table.Root>
    </Box>
  );
}

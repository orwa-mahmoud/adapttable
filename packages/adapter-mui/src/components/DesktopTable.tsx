/** The desktop `<table>`: header, pinned columns, rows and summary. */
import {
  bodyRowEntries,
  type ColumnDef,
  columnGroupHeaderCaption,
  columnHeaderController,
  columnResizeHandleProps,
  columnsHaveFooter,
  type ConfirmHandler,
  edgePinStyle,
  type EditableCellEditing,
  filterDefForColumn,
  type GridFocusState,
  PIN_Z,
  pinnedCellStyle,
  resolveColumnFooter,
  resolveColumnHeader,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  type RowPinSide,
  type TableLabels,
  tableMinWidth,
  type TreeEntry,
  type UseDataTableResult,
  useHorizontalOverflow,
} from "@adapttable/core";
import {
  type BodyCell,
  bodyCellsHaveRowSpan,
  cellHighlightStyle,
  cellsForRow,
  cellSpanMark,
  columnFlexShares,
  columnSelectLabel,
  columnSizeStyle,
  ColumnSpacer,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  extraHostFillStyle,
  fittedTableStyle,
  groupedHeaderCellStyle,
  groupedHeaderLabelStyle,
  type HtmlGroupedHeaderCell,
  htmlGroupedHeaderPlan,
  insertExtraRows,
  insertExtrasBeforeRows,
  isExtraEntry,
  mergedCellStyle,
  type PinLeads,
  pinnedColumnWidth,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
  resolveRowStyle,
  rowClickProps,
  rowEditingSignature,
  rowIsDirty,
  type RowPairMeasurer,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  rowStyleSignature,
  type SharedTableRenderProps,
  tableRenderModel,
  useOffsetHeight,
  useSummaryCells,
} from "@adapttable/core/adapter";
import type { CSSProperties, ReactElement, ReactNode } from "react";
import { memo, useCallback, useMemo, useRef } from "react";

import { ExpandToggle } from "./ExpandToggle";
import { FillHandle } from "./FillHandle";
import {
  ColumnGroupToggle,
  FilterHeaderTrigger,
  RowEditActions,
  RowReorderHandle,
  TreeCell,
} from "./kitControls";
import { RowActionButtons } from "./RowActionButtons";

const RESIZE_HANDLE_SX = {
  position: "absolute",
  insetInlineEnd: 0,
  top: 0,
  height: "100%",
  width: 8,
  cursor: "col-resize",
  touchAction: "none",
  userSelect: "none",
} as const;
import {
  Box,
  Checkbox,
  type SxProps,
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableRow,
  TableSortLabel,
  type Theme,
} from "@mui/material";

import { ColumnSelectCheckbox } from "./ColumnSelectCheckbox";
import { EditableDataCell } from "./EditableCell";
import { GroupHeaderRow } from "./GroupHeader";

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
    <TableRow
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <TableCell
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </TableCell>
    </TableRow>
  );
}

/** Map a destructive colour token to MUI's `"error"` palette, else default. */
export function muiColor(color: string | undefined): "default" | "error" {
  return color === "danger" || color === "red" || color === "error"
    ? "error"
    : "default";
}

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  size: "small" | "medium";
  /** Class applied to every mobile card (merged before `rowClassName`). */
  cardClassName?: string;
  /** Text direction — flips the collapsed expand chevron under RTL. */
  dir?: "ltr" | "rtl";
  /**
   * End-pin the trailing actions column on its own (the reserved "actions"
   * layout key pinned right from the Columns menu) — independent of whether
   * any DATA column is pinned right. Desktop only; cards have no columns.
   */
  actionsPinned?: boolean;
}

/** Width (px) of the leading expand-chevron column (MUI's checkbox cell). */
const EXPAND_WIDTH = 48;

/** Empty leading pad (group header / summary) — keeps DesktopTable lean. */
function ExtraCheckboxCell({ show }: Readonly<{ show: boolean }>) {
  if (!show) return null;
  return <TableCell padding="checkbox" />;
}

const SELECTION_WIDTH = 48;
const ACTIONS_WIDTH = 120;

/** Pin leads and whether the table needs a horizontal scroll box. */
function muiPinGeometry(options: {
  expandActive: boolean;
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
  leadStart: number;
  leadEnd: number;
  selectionLead: number;
  reorderLead: number;
} {
  const {
    expandActive,
    showReorder,
    hasSelection,
    showActions,
    actionsPinned,
    reorderPinned,
    columns,
    pinOffset,
  } = options;
  const expand = expandActive ? EXPAND_WIDTH : 0;
  const reorder = showReorder ? REORDER_COLUMN_WIDTH : 0;
  const start = expand + reorder + (hasSelection ? SELECTION_WIDTH : 0);
  const end = showActions ? ACTIONS_WIDTH : 0;
  return {
    hasPinned:
      actionsPinned ||
      (showReorder && reorderPinned) ||
      columns.some((c) => pinOffset?.(c.key) != null),
    leads: { start, end },
    leadStart: start,
    leadEnd: end,
    selectionLead: expand + reorder,
    reorderLead: expand,
  };
}

/**
 * Identity-stable dispatcher for `selection.toggle` / `expansion.toggle`.
 * `selection.toggle` is recreated whenever the selection changes, so handing
 * it straight to a memoized row would either defeat the memo (if compared)
 * or go stale (if not — in the controlled mode it computes from the captured
 * set). This wrapper never changes identity and always dispatches to the
 * CURRENT target, so skipped rows still toggle against fresh state.
 */
export function useStableToggle(
  target: { toggle: (id: string) => void } | null | undefined
): (id: string) => void {
  // Latest-ref pattern (same as core's useFilterOptions): a render-time
  // write so the callback reads whatever target the last render supplied.
  const ref = useRef(target);
  ref.current = target;
  return useCallback((id: string) => ref.current?.toggle(id), []);
}

/** Inline chevron pointing at the reading end; rotates down when open. */
export function ExpandChevron({
  expanded,
  dir,
}: Readonly<{ expanded: boolean; dir?: "ltr" | "rtl" }>) {
  let transform: string | undefined;
  if (expanded) transform = "rotate(90deg)";
  else if (dir === "rtl") transform = "rotate(180deg)";
  return (
    <Box
      component="span"
      aria-hidden
      sx={{ display: "inline-flex", transition: "transform 150ms", transform }}
    >
      <svg
        width="1em"
        height="1em"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M9 6l6 6-6 6" />
      </svg>
    </Box>
  );
}

/**
 * Logical (RTL-aware) `text-align` for a column. Applied via `sx` rather
 * than MUI's physical `align` prop so `"end"` follows the writing direction
 * (right in LTR, left in RTL).
 */
function muiAlign(
  align: ColumnDef<unknown>["align"]
): "start" | "center" | "end" {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/**
 * Per-render-stable sx for the memoized desktop row. Built once per
 * `DesktopTable` render (memoized on the pin/width/column inputs), so the
 * row comparator can treat one object identity as "the cell styling".
 */
interface DesktopRowSx {
  /** Body-cell sx by column key (pin stickiness + logical text-align). */
  cells: Readonly<Record<string, SxProps<Theme>>>;
  /** Leading expand-chevron cell (edge-pinned alongside left data pins). */
  expand?: SxProps<Theme>;
  /** Leading reorder-grip cell (edge-pinned just past the expand column). */
  reorder?: SxProps<Theme>;
  /** Leading selection cell (edge-pinned just past the expand column). */
  selection?: SxProps<Theme>;
  /** Trailing actions cell (edge-pinned, end-aligned). */
  actions: SxProps<Theme>;
  /** Column keys that are side-pinned — row-pin z-index depends on this. */
  pinnedColumns: ReadonlySet<string>;
}

interface DesktopRowProps<TRow> {
  /* Visual inputs — compared by the memo (see DESKTOP_ROW_COMPARED). */
  row: TRow;
  index: number;
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  selected: boolean;
  expanded: boolean;
  columns: readonly ColumnDef<TRow>[];
  /** This row's cells — covered neighbours already omitted. */
  bodyCells: readonly BodyCell<TRow>[];
  /** Memo digest from {@link rowSpanSignature}. */
  spanSignature: string;
  sx: DesktopRowSx;
  /** Full spacer span, INCLUDING the expand column when present. */
  columnSpan: number;
  /** Widths holding open the columns outside the horizontal window. */
  columnSpacers?: { start: number; end: number };
  /** This row's place in the tree, when the table has one. */
  treeEntry?: TreeEntry<TRow>;
  /** Which column carries the chevron and the indent. */
  treeColumnKey?: string;
  /** Open or close a tree node. */
  onToggleTree?: (id: string) => void;
  size: "small" | "medium";
  dir?: "ltr" | "rtl";
  className?: string;
  /** Pre-computed `rowStyle` + `rowHeight` (compared via signature). */
  rowVisualStyle: CSSProperties | undefined;
  rowStyleSignature: string;
  hasSelection: boolean;
  hasExpansion: boolean;
  showActions: boolean;
  showReorder: boolean;
  /** Headless reorder; uncompared — visual churn is `reorderSignature`. */
  rowReorder: SharedTableRenderProps<TRow>["rowReorder"];
  windowStart: number;
  rowCount: number;
  reorderPinned: boolean;
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
  labels: Required<TableLabels>;
  selectRowLabel: string;
  cancelLabel: string;
  expandLabel: string;
  collapseLabel: string;
  /* Stable wiring — excluded from the comparison (identity-stable, or at
     least latest-dispatching via useStableToggle), so a skipped row never
     holds a stale handler. */
  id: string;
  /**
   * Core's row prop-getter — the part name, `role`, the row id, the dataset
   * index and `aria-selected` in one spread. Uncompared on purpose: its
   * identity changes with the selection state, and everything it can emit is
   * already determined by a compared prop (`row`, `sourceIndex`, `selected`,
   * `hasSelection`), so a row that skips a render cannot show a stale value.
   */
  getRowProps: UseDataTableResult<TRow>["getRowProps"];
  rowActions?: RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions?: RowActionsRenderer<TRow>;
  confirm: ConfirmHandler;
  renderRowDetail?: (row: TRow) => ReactNode;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  measureElement?: (element: Element | null) => void;
  /** Measures a row together with its open detail panel. */
  measureRowPair?: RowPairMeasurer;
  editLabel: string;
  /** `labels.undoEdit` — the control a failed save offers. */
  undoLabel: string;
  /** `labels.editRow` / `labels.saveRow` — row mode's own controls. */
  editRowLabel: string;
  saveRowLabel: string;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The visual inputs a desktop row re-renders for. Deliberately NOT the
 * per-render `table` object or the handler props: handlers are stable (or
 * latest-dispatching wrappers), and everything that changes what the row
 * LOOKS like is listed here — row identity, selection/expansion flags,
 * density, column set, the precomputed sx map (pins + widths), the
 * rowClassName output, and direction.
 */
const DESKTOP_ROW_COMPARED: readonly (keyof DesktopRowProps<unknown>)[] = [
  "row",
  "index",
  "selected",
  // Cell focus and the selected range, or a row never learns that one of its
  // cells became focused or selected — the live region announced the move
  // while every row kept its previous output. One reference compare: the
  // state object is memoized as a whole.
  "gridFocus",
  "expanded",
  "columns",
  "spanSignature",
  "sx",
  "columnSpan",
  "size",
  "dir",
  "className",
  "rowStyleSignature",
  "hasSelection",
  "hasExpansion",
  "showActions",
  "showReorder",
  "reorderSignature",
  "rowPinSignature",
  "rowPinSide",
  "pinRowSticky",
  "rowPinOffset",
  "sourceIndex",
  "reorderPinned",
  "labels",
  "rowActionsLayout",
  "cellSpanAppearance",
  "renderRowActions",
  "selectRowLabel",
  "cancelLabel",
  "expandLabel",
  "collapseLabel",
  "editLabel",
  "editingSignature",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
];

function desktopRowPropsAreEqual(
  prev: DesktopRowProps<unknown>,
  next: DesktopRowProps<unknown>
): boolean {
  return DESKTOP_ROW_COMPARED.every((key) => prev[key] === next[key]);
}

function DesktopRowImpl<TRow>({
  row,
  treeEntry,
  treeColumnKey: treeKey,
  onToggleTree,
  index,
  getRowProps,
  gridFocus,
  selected,
  expanded,
  columns,
  bodyCells,
  sx,
  columnSpan,
  columnSpacers,
  dir,
  className,
  rowVisualStyle,
  hasSelection,
  hasExpansion,
  showActions,
  showReorder,
  rowReorder,
  rowPinSide,
  pinRowSticky,
  rowPinOffset,
  sourceIndex,
  windowStart,
  rowCount,
  labels,
  selectRowLabel,
  cancelLabel,
  expandLabel,
  collapseLabel,
  id,
  rowActions,
  rowActionsLayout,
  cellSpanAppearance,
  renderRowActions,
  confirm,
  renderRowDetail,
  onToggleSelect,
  onToggleExpand,
  onRowClick,
  prefetch,
  measureElement,
  measureRowPair,
  editLabel,
  undoLabel,
  editRowLabel,
  saveRowLabel,
  editing,
  rows,
  getRowId,
}: Readonly<DesktopRowProps<TRow>>) {
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, rowPinOffset, true);
  const focusIndex = sourceIndex;
  let rowMeasureRef: typeof measureElement | undefined;
  if (!rowPinSide) {
    rowMeasureRef = measureRowPair ? measureRowPair.row(index) : measureElement;
  }
  const pinPart = pinnedRowPart(rowPinSide);
  const pinSticky = pinnedRowSticky(rowPinSide, pinRowSticky, rowPinOffset);
  return (
    <>
      <TableRow
        {...getRowProps(row, focusIndex)}
        {...gridFocus?.getRowPropsAt(focusIndex)}
        {...rowClickProps(row, onRowClick, focusIndex)}
        {...(rowReorder?.dropProps(index, row, windowStart) ?? {})}
        {...(rowReorder?.rowAttrs(id, index) ?? {})}
        className={className}
        style={{
          ...rowVisualStyle,
          ...pinSticky,
          ...rowReorderDropStyle(rowReorder?.rowAttrs(id, index)),
        }}
        data-stagger=""
        data-row-pin={rowPinSide}
        data-adapttable-part={pinPart ?? "row"}
        data-dirty={rowIsDirty(editing, id) ? "" : undefined}
        ref={rowMeasureRef}
        hover
        selected={selected}
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      >
        {hasExpansion && (
          <TableCell padding="checkbox" sx={sx.expand} style={edgeRowPin}>
            <ExpandToggle
              id={id}
              expanded={expanded}
              onToggle={onToggleExpand}
              dir={dir}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
            />
          </TableCell>
        )}
        {showReorder && rowReorder && (
          <TableCell
            padding="checkbox"
            data-adapttable-part="reorder-cell"
            sx={sx.reorder}
            style={edgeRowPin}
          >
            <RowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rowCount}
            />
          </TableCell>
        )}
        {hasSelection && (
          <TableCell
            data-adapttable-part="selection-cell"
            padding="checkbox"
            sx={sx.selection}
            style={edgeRowPin}
          >
            <Checkbox
              slotProps={{ input: { "aria-label": selectRowLabel } }}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </TableCell>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          return (
            <TableCell
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              sx={sx.cells[column.key]}
              // MUI's own selected fill, from the palette so it follows the
              // theme and dark mode. Applied as a style rather than merged into
              // `sx`, whose per-column value is a union that cannot be combined
              // without a cast — and a cast here would buy nothing.
              style={{
                ...pinnedRowCellStyle(
                  rowPinSide,
                  rowPinOffset,
                  sx.pinnedColumns.has(column.key)
                ),
                ...cellHighlightStyle(
                  focusProps,
                  mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                  {
                    backgroundColor:
                      "var(--mui-palette-action-selected, rgba(0, 0, 0, 0.08))",
                  }
                ),
              }}
              {...focusProps}
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={{ expandRow: expandLabel, collapseRow: collapseLabel }}
                onToggle={onToggleTree}
              >
                <EditableDataCell
                  editing={editing}
                  row={row}
                  column={column}
                  rowId={id}
                  rowIndex={focusIndex}
                  rows={rows}
                  columns={columns}
                  rowKey={getRowId}
                  editLabel={editLabel}
                  undoLabel={undoLabel}
                />
              </TreeCell>
              <FillHandle
                focus={gridFocus}
                windowIndex={focusIndex}
                col={columnIndex}
              />
            </TableCell>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <TableCell sx={sx.actions} style={edgeRowPin}>
            {editing?.rowEditing && (
              <RowEditActions
                rowEditing={editing.rowEditing}
                row={row}
                rowId={id}
                labels={{
                  editRow: editRowLabel,
                  saveRow: saveRowLabel,
                  cancel: cancelLabel,
                }}
              />
            )}
            {/* The control column also exists for row mode alone, so this is
                not the same question as `showActions`. */}
            {rowActions && rowActions.length > 0 && (
              <RowActionButtons
                row={row}
                actions={rowActions}
                confirm={confirm}
                labels={labels}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
          </TableCell>
        )}
      </TableRow>
      {expanded && (
        <TableRow>
          {/* `expanded` is only ever true when a detail renderer exists
              (DesktopTable derives it from `expansion && renderRowDetail`). */}
          <TableCell colSpan={columnSpan}>{renderRowDetail!(row)}</TableCell>
        </TableRow>
      )}
    </>
  );
}

/**
 * Memoized desktop row: a search keystroke (or any chrome re-render) must
 * not re-run every cell accessor, and toggling one row's checkbox must
 * re-render only that row. The cast restores the generic signature `memo`
 * erases.
 */
const DesktopRow = memo(
  DesktopRowImpl,
  desktopRowPropsAreEqual
) as typeof DesktopRowImpl;

/** Desktop MUI table. */
export function DesktopTable<TRow>({
  gridFocus,
  table,
  rows,
  rowActions,
  rowActionsLayout,
  cellSpanAppearance,
  renderRowActions,
  confirm,
  getRowId,
  size,
  dir,
  prefetch,
  onRowClick,
  rowClassName,
  collapsibleColumnGroups,
  collapsedColumnGroups,
  columnGroups,
  onToggleColumnGroup,
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
  extraRows,
  getCellSpan,
  headerFilters,
  filterDefs,
  filterRegistry,
  closeHeaderFilterOnSelect,
}: Readonly<SharedProps<TRow>>) {
  // Core's span already counts the expand column (it sees `renderRowDetail`
  // + `expansion`), so spacer and detail rows use `columnSpan` as-is.
  const {
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    leadingCells,
    entries,
    columnSpan,
    columnSpacers,
    cellsByRow,
  } = tableRenderModel({
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
  const pinRowSticky = !bodyCellsHaveRowSpan(cellsByRow);
  const extraFill = (key: string) =>
    extraHostFillStyle(key, extraRows, rows, getRowId, rowStyle);
  const [theadRef, headerHeight] = useOffsetHeight();
  const [headerRowRef] = useOffsetHeight();
  // Nested like Ant: ungrouped leaves rowspan through the group band so they
  // sit beside a group and its children, not under a blank gap. `null` means
  // a single header row. Pads on the first header row span the whole band.
  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  // Footer summary cells for the CURRENT rows, keyed by column key.
  const summaryCells = useSummaryCells(summaryRow, rows);
  const showColumnFooter =
    summaryCells !== undefined || columnsHaveFooter(columns);
  // Expansion is active only when BOTH halves arrived (the chrome supplies
  // `expansion` exactly when `renderRowDetail` is set).
  const isExpanded =
    expansion && renderRowDetail ? expansion.isExpanded : undefined;
  const expandActive = isExpanded !== undefined;
  const onToggleSelect = useStableToggle(selection);
  const onToggleExpand = useStableToggle(expansion);
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );
  // `position: sticky` on a `<thead>` does not pin against the document
  // scroller, so we stick the header *cells* instead. Pinned cells also stick
  // left/right (corner-sticky in the header) with an opaque background.
  // Inside a maxHeight scroll box the box itself is the sticky context, so
  // the header pins to ITS top — a viewport offset would float it mid-box.
  const { hasPinned, leads, leadStart, leadEnd, selectionLead, reorderLead } =
    muiPinGeometry({
      expandActive,
      showReorder,
      hasSelection: Boolean(selection),
      showActions,
      actionsPinned,
      reorderPinned,
      columns: table.columns,
      pinOffset,
    });
  // Measured (ResizeObserver) horizontal overflow: with no maxHeight and no
  // pins, the wrapper only becomes a scroll container when the table is
  // actually wider than it — an unconditional `overflowX: auto` would trap
  // the page-scroll sticky header even when everything fits.
  const overflow = useHorizontalOverflow<HTMLDivElement>();
  // ANY scroll container (maxHeight, pins, measured overflow) is the sticky
  // context: pin to ITS top, not a viewport offset.
  const inScrollBox = maxHeight != null || hasPinned || overflow.overflowing;
  const headerPinTop = inScrollBox ? 0 : stickyTop;
  const rowPinOffset = stickyHeader ? headerPinTop + headerHeight : 0;
  const headSx = stickyHeader
    ? {
        position: "sticky" as const,
        top: inScrollBox ? 0 : stickyTop,
        zIndex: PIN_Z.header,
        bgcolor: "background.paper",
      }
    : undefined;
  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions cells stick to the inline end when a data column is pinned
  // right (so it never scrolls under them) OR when the actions column itself
  // is pinned from the Columns menu — one click, no data pin required.
  const stickActions = hasEndPin || actionsPinned;
  // Built with conditional spreads so no key is ever `undefined` — that keeps
  // the object assignable to MUI's strict `sx` index signature with no cast.
  const headCellSx = (column: ColumnDef<TRow>) => {
    const pin = pinnedCellStyle(
      pinOffset?.(column.key),
      PIN_Z.headerPinned,
      leads
    );
    // A pinned column renders at the width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : (columnWidths?.[column.key] ?? column.width);
    // The resize handle is absolute; an un-pinned/un-sticky cell still needs a
    // positioning context for it.
    const needsRelative = Boolean(setWidth) && !headSx && !pin;
    return {
      ...headSx,
      ...(pin && { ...pin, bgcolor: "background.paper" }),
      ...(needsRelative && { position: "relative" as const }),
      textAlign: muiAlign(column.align),
      ...(width != null && { width }),
    };
  };
  // The expand / checkbox / actions cells pin to their edge when a data
  // column on that side is pinned (corner-sticky in the header). `lead`
  // shifts the selection cell past a pinned expand column.
  const edgeHeadSx = (side: "start" | "end", active: boolean, lead = 0) => {
    const pin = edgePinStyle(side, active, PIN_Z.headerPinned);
    return {
      ...headSx,
      ...(pin && { ...pin, bgcolor: "background.paper" }),
      ...(pin && lead > 0 && { insetInlineStart: lead }),
    };
  };
  // One identity per pin/width layout: the memoized rows treat this object
  // as "the cell styling", so it must only change when the layout does.
  const rowSx = useMemo<DesktopRowSx>(() => {
    const edge = (side: "start" | "end", active: boolean, lead = 0) => {
      const pin = edgePinStyle(side, active, PIN_Z.body);
      if (!pin) return undefined;
      return {
        ...pin,
        ...(lead > 0 && { insetInlineStart: lead }),
        bgcolor: "background.paper",
      };
    };
    const cells: Record<string, SxProps<Theme>> = {};
    for (const column of columns) {
      const pin = pinnedCellStyle(pinOffset?.(column.key), PIN_Z.body, {
        start: leadStart,
        end: leadEnd,
      });
      cells[column.key] = {
        ...(pin && { ...pin, bgcolor: "background.paper" }),
        textAlign: muiAlign(column.align),
      };
    }
    return {
      cells,
      expand: edge("start", hasStartPin),
      reorder: edge("start", hasStartPin || reorderPinned, reorderLead),
      selection: edge("start", hasStartPin, selectionLead),
      actions: { ...edge("end", stickActions), textAlign: "end" },
      pinnedColumns: new Set(
        columns.filter((c) => pinOffset?.(c.key) != null).map((c) => c.key)
      ),
    };
  }, [
    columns,
    pinOffset,
    leadStart,
    leadEnd,
    hasStartPin,
    stickActions,
    selectionLead,
    reorderLead,
    reorderPinned,
  ]);

  let boxSx: SxProps<Theme> | undefined;
  if (maxHeight != null) {
    boxSx = { maxHeight, overflow: "auto" };
  } else if (hasPinned || overflow.overflowing) {
    boxSx = { overflowX: "auto" };
  }
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
    extra: leadStart + leadEnd,
  });

  const renderPinnedRow = (row: TRow, side: RowPinSide) => {
    const id = getRowId(row);
    const found = rows.findIndex((item) => getRowId(item) === id);
    const sourceIndex = Math.max(0, found);
    return (
      <DesktopRow
        key={id}
        row={row}
        index={sourceIndex}
        getRowProps={table.getRowProps}
        gridFocus={gridFocus}
        selected={selection?.isSelected(id) ?? false}
        expanded={isExpanded ? isExpanded(id) : false}
        columns={columns}
        bodyCells={cellsForRow(cellsByRow, id)}
        spanSignature={rowSpanSignature(cellsForRow(cellsByRow, id))}
        sx={rowSx}
        columnSpan={columnSpan}
        size={size}
        dir={dir}
        className={rowClassName?.(row, sourceIndex)}
        rowVisualStyle={resolveRowStyle(rowStyle, rowHeight, row, sourceIndex)}
        rowStyleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, sourceIndex)
        )}
        hasSelection={Boolean(selection)}
        hasExpansion={expandActive}
        showActions={showActions}
        showReorder={showReorder}
        rowReorder={rowReorder}
        windowStart={windowStart}
        rowCount={rows.length}
        reorderPinned={reorderPinned}
        reorderSignature={rowReorderSignature(rowReorder, id, sourceIndex)}
        rowPinSide={side}
        pinRowSticky={pinRowSticky}
        rowPinOffset={rowPinOffset}
        rowPinSignature={rowPinSignature(rowPinning, id)}
        sourceIndex={sourceIndex}
        labels={labels}
        selectRowLabel={labels.selectRow}
        cancelLabel={labels.cancel}
        expandLabel={labels.expandRow}
        collapseLabel={labels.collapseRow}
        id={id}
        rowActions={rowActions}
        rowActionsLayout={rowActionsLayout}
        cellSpanAppearance={cellSpanAppearance}
        renderRowActions={renderRowActions}
        confirm={confirm}
        renderRowDetail={renderRowDetail}
        onToggleSelect={onToggleSelect}
        onToggleExpand={onToggleExpand}
        onRowClick={onRowClick}
        prefetch={prefetch}
        editLabel={labels.editCell}
        undoLabel={labels.undoEdit}
        editRowLabel={labels.editRow}
        saveRowLabel={labels.saveRow}
        editing={editing}
        rows={rows}
        getRowId={getRowId}
        editingSignature={rowEditingSignature(editing, id)}
      />
    );
  };

  const renderLeafHeader = (
    column: ColumnDef<TRow>,
    headerIndex: number,
    rowSpan = 1
  ): ReactElement => {
    const headerCellProps = table.getHeaderCellProps(column);
    // Core reports aria-sort="none" for sortable-but-inactive
    // columns so screen readers announce them as sortable — and it
    // is chain-aware, covering every multi-sort level too.
    const ariaSort = headerCellProps["aria-sort"] as
      | "ascending"
      | "descending"
      | "none"
      | undefined;
    const active = ariaSort === "ascending" || ariaSort === "descending";
    // 1-based multi-sort chain position, when the column is in it.
    const sortIndex = headerCellProps["data-sort-index"];
    const sortProps = table.getSortButtonProps(column);
    let sortDir: "asc" | "desc" | undefined;
    if (ariaSort === "descending") sortDir = "desc";
    else if (ariaSort === "ascending") sortDir = "asc";
    const caption = resolveColumnHeader(
      column,
      columnHeaderController(column, {
        sortDir,
        sortIndex: typeof sortIndex === "number" ? sortIndex : undefined,
        toggleSort: sortProps.onClick,
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
    return (
      <TableCell
        key={column.key}
        data-adapttable-part="header-cell"
        {...(gridFocus?.getColumnHeaderProps(headerIndex, {
          sortable: column.sortable,
        }) ?? {})}
        aria-sort={ariaSort}
        data-column-key={column.key}
        data-sort-index={sortIndex}
        rowSpan={rowSpan > 1 ? rowSpan : undefined}
        sx={{
          ...headCellSx(column),
          ...(rowSpan > 1 ? { verticalAlign: "middle" } : {}),
        }}
        style={columnSizeStyle(column, flexShares, columnWidths?.[column.key])}
      >
        {column.sortable ? (
          <TableSortLabel
            active={active}
            direction={ariaSort === "descending" ? "desc" : "asc"}
            // Core's handler, with the REAL click event passed
            // through: it reads `shiftKey` to chain the column when
            // `multiSort` is on, else single-sorts as before.
            onClick={sortProps.onClick}
            title={column.headerTooltip}
          >
            {caption}
            {sortIndex !== undefined && (
              <Box component="span" sx={{ fontSize: 10, ml: 0.5 }}>
                {sortIndex}
              </Box>
            )}
          </TableSortLabel>
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
          <Box
            component="span"
            sx={RESIZE_HANDLE_SX}
            {...columnResizeHandleProps(
              column.key,
              setWidth,
              `${resizeLabel}: ${
                typeof column.header === "string" ? column.header : column.key
              }`
            )}
          />
        )}
      </TableCell>
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
      <TableCell
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        data-adapttable-part="header-group-cell"
        sx={{
          fontWeight: 600,
          ...groupedHeaderCellStyle(
            cell,
            "var(--mui-palette-divider, rgba(0, 0, 0, 0.12))"
          ),
        }}
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
      </TableCell>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {expandActive && (
        <TableCell
          padding="checkbox"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx("start", hasStartPin)}
        />
      )}
      {showReorder && (
        <TableCell
          padding="checkbox"
          aria-label={labels.reorderRow}
          data-adapttable-part="reorder-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx("start", hasStartPin || reorderPinned, reorderLead)}
        />
      )}
      {selection && (
        <TableCell
          data-adapttable-part="selection-header"
          padding="checkbox"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={edgeHeadSx("start", hasStartPin, selectionLead)}
        >
          <Checkbox
            slotProps={{ input: { "aria-label": labels.selectAll } }}
            checked={selection.headerState === "all"}
            indeterminate={selection.headerState === "some"}
            onChange={selection.toggleAll}
          />
        </TableCell>
      )}
      {columnSpacers && (
        <ColumnSpacer width={columnSpacers.start} side="start" as="th" />
      )}
    </>
  );

  const trailingHeaders = (rowSpan: number): ReactElement => (
    <>
      {columnSpacers && (
        <ColumnSpacer width={columnSpacers.end} side="end" as="th" />
      )}
      {showActions && (
        <TableCell
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          sx={{ ...edgeHeadSx("end", stickActions), textAlign: "end" }}
        >
          {labels.actions}
        </TableCell>
      )}
    </>
  );

  return (
    <Box
      ref={(node: HTMLDivElement | null) => {
        overflow.ref(node);
        virtualScrollRef?.(node);
      }}
      sx={boxSx}
    >
      <Table
        data-adapttable-part="table"
        size={size}
        aria-label={table.getTableProps()["aria-label"]}
        {...gridFocus?.getGridProps()}
        sx={minWidth > 0 ? { minWidth } : undefined}
        style={fittedTableStyle(fitColumns)}
      >
        <TableHead data-adapttable-part="thead" ref={theadRef}>
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <TableRow
                  key={row.map((cell) => cell.key).join("|")}
                  ref={last ? headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                  {row.map(renderPlanCell)}
                  {rowIndex === 0 ? trailingHeaders(headerBand) : null}
                </TableRow>
              );
            })
          ) : (
            <TableRow ref={headerRowRef} data-adapttable-part="header-row">
              {leadingHeaders(1)}
              {columns.map((column, headerIndex) =>
                renderLeafHeader(column, headerIndex)
              )}
              {trailingHeaders(1)}
            </TableRow>
          )}
        </TableHead>
        <TableBody data-adapttable-part="tbody">
          {insertExtrasBeforeRows(pinnedTopRows, extraRows, getRowId).map(
            (slot) =>
              isExtraEntry(slot) ? (
                <ExtraSlotRow
                  key={slot.key}
                  kind={slot.kind}
                  colSpan={columnSpan}
                  render={slot.kind === "fullWidth" ? slot.render : undefined}
                  labels={labels}
                  fillStyle={extraFill(slot.key)}
                />
              ) : (
                renderPinnedRow(slot.row, "top")
              )
          )}
          {paddingTop > 0 && (
            <TableRow aria-hidden>
              <TableCell
                colSpan={columnSpan}
                sx={{ height: paddingTop, p: 0 }}
              />
            </TableRow>
          )}
          {grouping
            ? grouping.entries.map((entry) => {
                if (entry.kind === "separator" || entry.kind === "fullWidth") {
                  return (
                    <ExtraSlotRow
                      key={entry.key}
                      kind={entry.kind}
                      colSpan={columnSpan}
                      render={
                        entry.kind === "fullWidth" ? entry.render : undefined
                      }
                      labels={labels}
                      fillStyle={extraFill(entry.key)}
                    />
                  );
                }
                if (
                  entry.kind === "group" ||
                  entry.kind === "groupFooter" ||
                  entry.kind === "groupMore"
                ) {
                  return (
                    <GroupHeaderRow
                      key={entry.key}
                      entry={entry}
                      columns={columns}
                      leadingCells={leadingCells}
                      showActions={showActions}
                      getCellProps={table.getCellProps}
                      selection={selection}
                      labels={labels}
                      onToggleCollapse={onToggleGroup}
                      onShowMore={grouping.showMore}
                    />
                  );
                }
                const id = getRowId(entry.row);
                return (
                  <DesktopRow
                    key={entry.key}
                    row={entry.row}
                    index={entry.index}
                    getRowProps={table.getRowProps}
                    gridFocus={gridFocus}
                    selected={selection?.isSelected(id) ?? false}
                    expanded={isExpanded ? isExpanded(id) : false}
                    columns={columns}
                    bodyCells={cellsForRow(cellsByRow, id)}
                    spanSignature={rowSpanSignature(
                      cellsForRow(cellsByRow, id)
                    )}
                    sx={rowSx}
                    columnSpan={columnSpan}
                    size={size}
                    dir={dir}
                    className={rowClassName?.(entry.row, entry.index)}
                    rowVisualStyle={resolveRowStyle(
                      rowStyle,
                      rowHeight,
                      entry.row,
                      entry.index
                    )}
                    rowStyleSignature={rowStyleSignature(
                      resolveRowStyle(
                        rowStyle,
                        rowHeight,
                        entry.row,
                        entry.index
                      )
                    )}
                    hasSelection={Boolean(selection)}
                    hasExpansion={expandActive}
                    showActions={showActions}
                    showReorder={showReorder}
                    rowReorder={rowReorder}
                    windowStart={windowStart}
                    rowCount={rows.length}
                    reorderPinned={reorderPinned}
                    reorderSignature={rowReorderSignature(
                      rowReorder,
                      id,
                      entry.index
                    )}
                    rowPinSide={undefined}
                    pinRowSticky={pinRowSticky}
                    rowPinOffset={rowPinOffset}
                    rowPinSignature={rowPinSignature(rowPinning, id)}
                    sourceIndex={entry.index}
                    labels={labels}
                    selectRowLabel={labels.selectRow}
                    cancelLabel={labels.cancel}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    id={id}
                    rowActions={rowActions}
                    rowActionsLayout={rowActionsLayout}
                    cellSpanAppearance={cellSpanAppearance}
                    renderRowActions={renderRowActions}
                    confirm={confirm}
                    renderRowDetail={renderRowDetail}
                    onToggleSelect={onToggleSelect}
                    onToggleExpand={onToggleExpand}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    measureElement={measureElement}
                    measureRowPair={measureRowPair}
                    editLabel={labels.editCell}
                    undoLabel={labels.undoEdit}
                    editRowLabel={labels.editRow}
                    saveRowLabel={labels.saveRow}
                    editing={editing}
                    rows={rows}
                    getRowId={getRowId}
                    editingSignature={rowEditingSignature(editing, id)}
                  />
                );
              })
            : // A tree renders its own flattened entries; a flat table renders the
              // (possibly windowed) rows. Both carry a row and a key.
              insertExtraRows(
                bodyRowEntries(entries, tree),
                extraRows,
                (e) => e.key
              ).map((slot) => {
                if ("kind" in slot) {
                  return (
                    <ExtraSlotRow
                      key={slot.key}
                      kind={slot.kind}
                      colSpan={columnSpan}
                      render={
                        slot.kind === "fullWidth" ? slot.render : undefined
                      }
                      labels={labels}
                      fillStyle={extraFill(slot.key)}
                    />
                  );
                }
                const { row, index, key, treeEntry, sourceIndex } = slot;
                const id = getRowId(row);
                const focusIndex = sourceIndex ?? index;
                return (
                  <DesktopRow
                    gridFocus={gridFocus}
                    getRowProps={table.getRowProps}
                    key={key}
                    row={row}
                    index={index}
                    selected={selection?.isSelected(id) ?? false}
                    expanded={isExpanded ? isExpanded(id) : false}
                    columns={columns}
                    bodyCells={cellsForRow(cellsByRow, id)}
                    spanSignature={rowSpanSignature(
                      cellsForRow(cellsByRow, id)
                    )}
                    sx={rowSx}
                    columnSpan={columnSpan}
                    size={size}
                    dir={dir}
                    className={rowClassName?.(row, focusIndex)}
                    rowVisualStyle={resolveRowStyle(
                      rowStyle,
                      rowHeight,
                      row,
                      focusIndex
                    )}
                    rowStyleSignature={rowStyleSignature(
                      resolveRowStyle(rowStyle, rowHeight, row, focusIndex)
                    )}
                    hasSelection={Boolean(selection)}
                    hasExpansion={expandActive}
                    showActions={showActions}
                    showReorder={showReorder}
                    rowReorder={rowReorder}
                    windowStart={windowStart}
                    rowCount={rows.length}
                    reorderPinned={reorderPinned}
                    reorderSignature={rowReorderSignature(
                      rowReorder,
                      id,
                      index
                    )}
                    rowPinSide={undefined}
                    pinRowSticky={pinRowSticky}
                    rowPinOffset={rowPinOffset}
                    rowPinSignature={rowPinSignature(rowPinning, id)}
                    sourceIndex={focusIndex}
                    labels={labels}
                    selectRowLabel={labels.selectRow}
                    cancelLabel={labels.cancel}
                    expandLabel={labels.expandRow}
                    collapseLabel={labels.collapseRow}
                    id={id}
                    rowActions={rowActions}
                    rowActionsLayout={rowActionsLayout}
                    cellSpanAppearance={cellSpanAppearance}
                    renderRowActions={renderRowActions}
                    confirm={confirm}
                    renderRowDetail={renderRowDetail}
                    onToggleSelect={onToggleSelect}
                    onToggleExpand={onToggleExpand}
                    onRowClick={onRowClick}
                    prefetch={prefetch}
                    measureElement={measureElement}
                    measureRowPair={measureRowPair}
                    editLabel={labels.editCell}
                    undoLabel={labels.undoEdit}
                    editRowLabel={labels.editRow}
                    saveRowLabel={labels.saveRow}
                    editing={editing}
                    rows={rows}
                    getRowId={getRowId}
                    treeEntry={treeEntry}
                    treeColumnKey={tree?.columnKey}
                    onToggleTree={tree?.expansion.toggle}
                    editingSignature={rowEditingSignature(editing, id)}
                  />
                );
              })}
          {paddingBottom > 0 && (
            <TableRow aria-hidden>
              <TableCell
                colSpan={columnSpan}
                sx={{ height: paddingBottom, p: 0 }}
              />
            </TableRow>
          )}
          {insertExtrasBeforeRows(pinnedBottomRows, extraRows, getRowId).map(
            (slot) =>
              isExtraEntry(slot) ? (
                <ExtraSlotRow
                  key={slot.key}
                  kind={slot.kind}
                  colSpan={columnSpan}
                  render={slot.kind === "fullWidth" ? slot.render : undefined}
                  labels={labels}
                  fillStyle={extraFill(slot.key)}
                />
              ) : (
                renderPinnedRow(slot.row, "bottom")
              )
          )}
        </TableBody>
        {showColumnFooter && (
          <TableFooter>
            <TableRow>
              {expandActive && <TableCell padding="checkbox" />}
              <ExtraCheckboxCell show={showReorder} />
              {selection && <TableCell padding="checkbox" />}
              {columns.map((column) => (
                // One cell per column keeps the summary aligned under its
                // column; keys absent from the result render empty cells.
                <TableCell
                  key={column.key}
                  sx={{ textAlign: muiAlign(column.align) }}
                >
                  {resolveColumnFooter(column, summaryCells?.[column.key])}
                </TableCell>
              ))}
              {showActions && <TableCell />}
            </TableRow>
          </TableFooter>
        )}
      </Table>
    </Box>
  );
}

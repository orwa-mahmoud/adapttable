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
  cellsForRow,
  cellSpanMark,
  columnSelectLabel,
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
  isCurrentMatchCell,
  isExtraEntry,
  isMatchedCell,
  isSelectedCell,
  mergedCellStyle,
  type PinLeads,
  pinnedColumnWidth,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  type PinOffset,
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
import { Fragment, memo, useCallback, useMemo, useRef } from "react";

import { cx } from "../cx";
import type { DataTableClassNames } from "../types";
import { ColumnSelectCheckbox } from "./ColumnSelectCheckbox";
import { EditableDataCell } from "./EditableCell";
import { ExpandButton } from "./ExpandToggle";
import { FillHandle } from "./FillHandle";
import { GroupHeaderRow } from "./GroupHeader";
import {
  ColumnGroupToggle,
  FilterHeaderTrigger,
  RowEditActions,
  RowReorderHandle,
  TreeCell,
} from "./kitControls";
import { RowActionButtons } from "./RowActionButtons";

function ExtraSlotRow({
  kind,
  colSpan,
  render,
  labels,
  classNames,
  fillStyle,
}: Readonly<{
  kind: "separator" | "fullWidth";
  colSpan: number;
  render?: () => ReactNode;
  labels: TableLabels;
  classNames: DataTableClassNames;
  fillStyle?: CSSProperties;
}>): ReactElement {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <tr
      data-adapttable-part={parts.row}
      className={
        kind === "separator" ? classNames.separatorRow : classNames.fullWidthRow
      }
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <td
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        className={
          kind === "separator"
            ? classNames.separatorCell
            : classNames.fullWidthCell
        }
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </td>
    </tr>
  );
}

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

// The leading checkbox (44px) and trailing actions (120px) columns pin to the
// edge alongside the data columns, which therefore start past them.
const SELECTION_WIDTH = 44;

const ACTIONS_WIDTH = 120;

/**
 * Scroll-box style: a `maxHeight`-bounded box scrolls on both axes; otherwise
 * the wrapper scrolls sideways only when something needs it (a pinned column,
 * or measured horizontal overflow). When the table fits, the wrapper carries
 * NO overflow style — `overflow-x: auto` makes `overflow-y` compute to `auto`
 * too, which would trap a page-scroll sticky header inside the box.
 */
function scrollBoxStyle(
  maxHeight: number | undefined,
  scrollX: boolean
): CSSProperties | undefined {
  if (maxHeight != null) {
    return { maxHeight, overflowX: "auto", overflowY: "auto" };
  }
  return scrollX ? { overflowX: "auto" } : undefined;
}

export interface SharedProps<TRow> extends SharedTableRenderProps<TRow> {
  classNames: DataTableClassNames;
  /**
   * Whether the user pinned the injected actions column to the inline end
   * (one click in the Columns menu) — sticks it independently of any data
   * pin on that side.
   */
  actionsPinned?: boolean;
}

/**
 * Props for the memoized desktop row. The comparator below checks ONLY the
 * visual inputs (row data, selected/expanded state, column + width + class
 * identities, the pin signature); everything else — `table`, the latest-ref
 * callback wrappers, `confirm`, `pinOffset`, `measureElement` — is either
 * stable or only consulted when one of the compared inputs re-renders the
 * row, so a fresh identity there must not (and does not) defeat the memo.
 */
interface DesktopRowProps<TRow> {
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  row: TRow;
  index: number;
  /** Stable row id (selection + expansion key). */
  id: string;
  /** Headless model (prop-getters); a fresh object every render — uncompared. */
  table: UseDataTableResult<TRow>;
  columns: readonly ColumnDef<TRow>[];
  /** This row's cells — covered neighbours already omitted. */
  bodyCells: readonly BodyCell<TRow>[];
  /** Memo digest from {@link rowSpanSignature}. */
  spanSignature: string;
  labels: Required<TableLabels>;
  classNames: DataTableClassNames;
  /** `undefined` = no selection column; otherwise the row's selected state. */
  selected: boolean | undefined;
  /** `undefined` = no expansion column; otherwise the row's expanded state. */
  expanded: boolean | undefined;
  showActions: boolean;
  /** Whether the leading reorder column renders. */
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
  rowActions?: RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions?: RowActionsRenderer<TRow>;
  confirm: ConfirmHandler;
  /** Full-width colSpan (expansion + selection + data + actions), core-computed. */
  columnSpan: number;
  /** Widths holding open the columns outside the horizontal window. */
  columnSpacers?: { start: number; end: number };
  /** This row's place in the tree, when the table has one. */
  treeEntry?: TreeEntry<TRow>;
  /** Which column carries the chevron and the indent. */
  treeColumnKey?: string;
  /** Open or close a tree node. */
  onToggleTree?: (id: string) => void;
  /**
   * Comparator-only input: body cells inherit widths from the header's table
   * layout, but a width change must still re-render pinned rows (insets).
   */
  columnWidths?: Readonly<Record<string, number>>;
  pinOffset?: (key: string) => PinOffset | undefined;
  /** Value-comparable digest of every column's pin side + inset. */
  pinSignature: string;
  hasStartPin: boolean;
  hasEndPin: boolean;
  /** Whether the actions column is user-pinned (sticks without a data pin). */
  actionsPinned: boolean;
  /** Pre-computed `rowClassName(row, index)` output (value-compared). */
  rowClass: string | undefined;
  /** Pre-computed `rowStyle` + `rowHeight` (compared via signature). */
  rowVisualStyle: CSSProperties | undefined;
  rowStyleSignature: string;
  clickable: boolean;
  hasPrefetch: boolean;
  /**
   * Opt-in editing bundle — uncompared; visual churn is fingerprinted by
   * `editingSignature` so idle rows bail out while the active draft updates.
   */
  editing: EditableCellEditing<TRow> | undefined;
  /** Page rows for Tab advance — uncompared (see `editing`). */
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  /** Memo digest from {@link rowEditingSignature}. */
  editingSignature: string | null;
  /* Latest-ref wrappers from DesktopTable — identity-stable for the mount. */
  onRowClick: (row: TRow) => void;
  onPrefetch: (row: TRow) => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  renderDetail: (row: TRow) => ReactNode;
  measureElement?: (element: Element | null) => void;
  /** Measures a row together with its open detail panel. */
  measureRowPair?: RowPairMeasurer;
}

/**
 * `React.memo` comparator: re-render a row only when one of its VISUAL
 * inputs changes. A search keystroke or another row's checkbox re-renders
 * the table shell, but every unchanged row bails out here (accessors and
 * Cell render-props are not re-invoked).
 */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return (
    prev.row === next.row &&
    prev.index === next.index &&
    prev.id === next.id &&
    prev.selected === next.selected &&
    prev.expanded === next.expanded &&
    // The tree entry carries this row's open state and depth: leaving it out
    // memoizes a chevron that never turns, which is exactly the bug cell
    // selection had before `gridFocus` joined this list.
    prev.treeEntry === next.treeEntry &&
    prev.columns === next.columns &&
    prev.spanSignature === next.spanSignature &&
    prev.labels === next.labels &&
    prev.classNames === next.classNames &&
    prev.showActions === next.showActions &&
    prev.showReorder === next.showReorder &&
    prev.reorderSignature === next.reorderSignature &&
    prev.rowPinSignature === next.rowPinSignature &&
    prev.rowPinSide === next.rowPinSide &&
    prev.pinRowSticky === next.pinRowSticky &&
    prev.rowPinOffset === next.rowPinOffset &&
    prev.sourceIndex === next.sourceIndex &&
    prev.reorderPinned === next.reorderPinned &&
    prev.rowActions === next.rowActions &&
    prev.rowActionsLayout === next.rowActionsLayout &&
    prev.cellSpanAppearance === next.cellSpanAppearance &&
    prev.renderRowActions === next.renderRowActions &&
    prev.columnSpan === next.columnSpan &&
    prev.columnWidths === next.columnWidths &&
    prev.pinSignature === next.pinSignature &&
    prev.hasStartPin === next.hasStartPin &&
    prev.hasEndPin === next.hasEndPin &&
    prev.actionsPinned === next.actionsPinned &&
    prev.rowClass === next.rowClass &&
    prev.rowStyleSignature === next.rowStyleSignature &&
    prev.clickable === next.clickable &&
    prev.hasPrefetch === next.hasPrefetch &&
    prev.editingSignature === next.editingSignature &&
    // Cell focus and the selected range, or a row never learns that one of its
    // cells became focused or selected: the live region announced the move (it
    // renders outside this memo) while every row kept its previous output, so
    // `data-cell-selected` never reached the DOM. The state object is memoized
    // as a whole, so this is one reference compare.
    prev.gridFocus === next.gridFocus
  );
}

function rowMeasureRef(
  pinned: RowPinSide | undefined,
  measureRowPair: RowPairMeasurer | undefined,
  index: number,
  measureElement: ((element: Element | null) => void) | undefined
): ((element: Element | null) => void) | undefined {
  if (pinned) return undefined;
  if (measureRowPair) return measureRowPair.row(index);
  return measureElement;
}

function desktopRowLeads(
  showReorder: boolean,
  selected: unknown,
  showActions: boolean
): PinLeads {
  return {
    start:
      (showReorder ? REORDER_COLUMN_WIDTH : 0) +
      (selected === undefined ? 0 : SELECTION_WIDTH),
    end: showActions ? ACTIONS_WIDTH : 0,
  };
}

function bodyPinStyleFor(
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

function DesktopRowBase<TRow>(
  props: Readonly<DesktopRowProps<TRow>>
): ReactElement {
  const {
    row,
    index,
    id,
    table,
    gridFocus,
    columns,
    bodyCells,
    labels,
    classNames,
    selected,
    expanded,
    showActions,
    showReorder,
    rowReorder,
    rowPinSide,
    pinRowSticky,
    rowPinOffset,
    sourceIndex,
    windowStart,
    rowCount,
    reorderPinned,
    rowActions,
    rowActionsLayout,
    cellSpanAppearance,
    renderRowActions,
    confirm,
    columnSpan,
    columnSpacers,
    treeEntry,
    treeColumnKey: treeKey,
    onToggleTree,
    pinOffset,
    hasStartPin,
    hasEndPin,
    actionsPinned,
    rowClass,
    rowVisualStyle,
    clickable,
    hasPrefetch,
    editing,
    rows,
    getRowId,
    onRowClick,
    onPrefetch,
    onToggleSelect,
    onToggleExpand,
    renderDetail,
    measureElement,
    measureRowPair,
  } = props;
  const expandable = expanded !== undefined;
  const leads = desktopRowLeads(showReorder, selected, showActions);
  const bodyPinStyle = (key: string) =>
    bodyPinStyleFor(key, pinOffset, leads, rowPinSide, rowPinOffset);
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, rowPinOffset, true);
  const focusIndex = sourceIndex;
  const pinPart = pinnedRowPart(rowPinSide);
  const pinSticky = pinnedRowSticky(rowPinSide, pinRowSticky, rowPinOffset);
  return (
    <>
      <tr
        {...table.getRowProps(row, focusIndex)}
        {...gridFocus?.getRowPropsAt(focusIndex)}
        {...rowClickProps(row, clickable ? onRowClick : undefined, focusIndex)}
        {...(rowReorder?.dropProps(index, row, windowStart) ?? {})}
        {...(rowReorder?.rowAttrs(id, index) ?? {})}
        ref={rowMeasureRef(rowPinSide, measureRowPair, index, measureElement)}
        data-row-pin={rowPinSide}
        data-adapttable-part={pinPart ?? "row"}
        data-stagger=""
        data-selected={selected ? "" : undefined}
        data-dirty={rowIsDirty(editing, id) ? "" : undefined}
        data-clickable={clickable ? "" : undefined}
        className={cx(classNames.row, rowClass)}
        style={{
          ...rowVisualStyle,
          ...pinSticky,
          ...rowReorderDropStyle(rowReorder?.rowAttrs(id, index)),
        }}
        onMouseEnter={hasPrefetch ? () => onPrefetch(row) : undefined}
      >
        {expandable && (
          <td
            data-adapttable-part="expand-cell"
            className={classNames.expandCell}
          >
            <ExpandButton
              expanded={expanded}
              labels={labels}
              classNames={classNames}
              onToggle={() => onToggleExpand(id)}
            />
          </td>
        )}
        {showReorder && rowReorder && (
          <td
            data-adapttable-part="reorder-cell"
            data-pinned={hasStartPin || reorderPinned ? "start" : undefined}
            style={{
              ...edgePinStyle(
                "start",
                hasStartPin || reorderPinned,
                PIN_Z.body
              ),
              ...edgeRowPin,
            }}
            className={cx(classNames.cell, classNames.reorderCell)}
          >
            <RowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rowCount}
              className={classNames.rowReorderHandle}
            />
          </td>
        )}
        {selected !== undefined && (
          <td
            data-adapttable-part="selection-cell"
            data-pinned={hasStartPin ? "start" : undefined}
            style={{
              ...edgePinStyle("start", hasStartPin, PIN_Z.body),
              ...edgeRowPin,
            }}
            className={cx(classNames.cell, classNames.selectionCell)}
          >
            <input
              type="checkbox"
              data-adapttable-part="checkbox"
              aria-label={labels.selectRow}
              checked={selected}
              onChange={() => onToggleSelect(id)}
              className={classNames.checkbox}
            />
          </td>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const pinStyle = bodyPinStyle(column.key);
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          const mark = cellSpanMark(colSpan, rowSpan);
          const letClassPaint =
            isSelectedCell(focusProps) ||
            isMatchedCell(focusProps) ||
            isCurrentMatchCell(focusProps);
          return (
            <td
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              {...table.getCellProps(column, {
                style: {
                  ...pinStyle,
                  ...mergedCellStyle(
                    colSpan,
                    rowSpan,
                    cellSpanAppearance,
                    letClassPaint ? "off" : "on"
                  ),
                },
                ...(mark ? { "data-cell-span": mark } : {}),
              })}
              {...focusProps}
              data-adapttable-part="cell"
              data-pinned={pinOffset?.(column.key)?.side}
              className={[
                classNames.cell,
                mark ? classNames.cellSpan : "",
                isSelectedCell(focusProps) ? classNames.cellSelected : "",
                isMatchedCell(focusProps) ? classNames.cellMatch : "",
                isCurrentMatchCell(focusProps)
                  ? classNames.cellMatchCurrent
                  : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <TreeCell
                entry={treeEntry}
                columnKey={column.key}
                treeColumnKey={treeKey}
                labels={labels}
                onToggle={onToggleTree}
                className={classNames.treeCell}
                toggleClassName={classNames.treeToggle}
                spacerClassName={classNames.treeSpacer}
              >
                <EditableDataCell
                  activateClassName={classNames.editCellActivate}
                  errorClassName={classNames.editCellError}
                  saveErrorClassName={classNames.editCellSaveError}
                  rollbackClassName={classNames.editCellRollback}
                  editorClassName={classNames.editCellEditor}
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
            </td>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <td
            data-adapttable-part="actions-cell"
            data-pinned={hasEndPin || actionsPinned ? "end" : undefined}
            style={{
              ...edgePinStyle("end", hasEndPin || actionsPinned, PIN_Z.body),
              ...edgeRowPin,
            }}
            className={cx(classNames.cell, classNames.actionsCell)}
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
            {rowActions && rowActions.length > 0 && (
              <RowActionButtons
                row={row}
                actions={rowActions}
                confirm={confirm}
                labels={labels}
                classNames={classNames}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
          </td>
        )}
      </tr>
      {expandable && expanded && (
        <tr data-adapttable-part="detail-row" className={classNames.detailRow}>
          <td
            colSpan={columnSpan}
            data-adapttable-part="detail-cell"
            className={classNames.detailCell}
          >
            {renderDetail(row)}
          </td>
        </tr>
      )}
    </>
  );
}

/**
 * One memoized row component per `DesktopTable` instantiation. A factory
 * (called once through `useMemo`) instead of a module-level `memo(...)`
 * because `React.memo` erases a generic component's type parameter — the
 * factory keeps `TRow` without a type cast.
 */
function createDesktopRow<TRow>() {
  return memo<DesktopRowProps<TRow>>(DesktopRowBase, desktopRowPropsEqual);
}

function startLeadWidth(showReorder: boolean, hasSelection: boolean): number {
  return (
    (showReorder ? REORDER_COLUMN_WIDTH : 0) +
    (hasSelection ? SELECTION_WIDTH : 0)
  );
}

function reservedChromeWidth(
  showReorder: boolean,
  hasSelection: boolean,
  showActions: boolean
): number {
  return (
    startLeadWidth(showReorder, hasSelection) +
    (showActions ? ACTIONS_WIDTH : 0)
  );
}

function desktopHasPinned(
  columns: readonly { key: string }[],
  pinOffset: ((key: string) => PinOffset | undefined) | undefined,
  stickActions: boolean,
  reorderPinnedLead: boolean
): boolean {
  return (
    columns.some((column) => pinOffset?.(column.key) != null) ||
    stickActions ||
    reorderPinnedLead
  );
}

/** Desktop semantic `<table>` rendering. */
export function DesktopTable<TRow>({
  gridFocus,
  table,
  rows,
  rowActions,
  confirm,
  getRowId,
  classNames,
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
  getCellSpan,
  extraRows,
  headerFilters,
  filterDefs,
  filterRegistry,
  closeHeaderFilterOnSelect,
  rowActionsLayout,
  cellSpanAppearance,
  renderRowActions,
}: Readonly<SharedProps<TRow>>) {
  // The model's columnSpan already counts the expand chevron column (core
  // only counts it when BOTH `renderRowDetail` and `expansion` arrive).
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
  // The actions column sticks when the user end-pins IT in the Columns menu —
  // independently of any data pin on that side (and only while it renders).
  const stickActions = showActions && actionsPinned;
  // Expansion is active only when BOTH halves arrive (the chrome only builds
  // the state when `renderRowDetail` is set).
  const expansionState = renderRowDetail ? expansion : undefined;
  const expandable = expansionState !== undefined;

  // The memoized row compares visual inputs only; callbacks reach it through
  // these identity-stable wrappers that always invoke the LATEST handler
  // (selection.toggle and friends change identity with the selection, and a
  // bailed-out row must never fire a stale closure — controlled selection
  // would otherwise compute from an outdated set).
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
  const Row = useMemo(() => createDesktopRow<TRow>(), []);

  // Measures the always-rendered scroll-box wrapper so it can turn into a
  // horizontal scroller exactly while the table is wider than it.
  const { ref: overflowRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();

  // Stick the header *cells* (a `<thead>` does not pin against the document
  // scroller). The adapter ships no colours, so consumers must give their
  // `headerCell` class an opaque background — the `data-sticky`/`data-pinned`
  // hooks make that easy to target.
  // Inside a maxHeight scroll box the box itself is the sticky context, so
  // the header pins to ITS top — a viewport offset would float it mid-box.
  // ANY scroll container (maxHeight, pins, measured overflow) is the sticky
  // context: pin to ITS top — a viewport offset would shove the header down
  // into the rows. A user-pinned actions column counts: it needs the same
  // horizontal scroll container to stick to.
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
  const leads: PinLeads = {
    start: startLeadWidth(showReorder, Boolean(selection)),
    end: showActions ? ACTIONS_WIDTH : 0,
  };
  const hasStartPin = columns.some((c) => pinOffset?.(c.key)?.side === "start");
  const hasEndPin = columns.some((c) => pinOffset?.(c.key)?.side === "end");
  // A value-comparable digest of the pin layout: while it is unchanged, a
  // memoized row's previous pin styles are still correct, so `pinOffset`'s
  // identity itself stays out of the row comparator.
  const pinSignature = columns
    .map((c) => {
      const pin = pinOffset?.(c.key);
      return pin ? `${c.key}:${pin.side}:${pin.inset}` : "";
    })
    .join("|");
  // Pinned header cells need both the sticky-top and sticky-left/right styles;
  // body cells only the side. Header pins sit above the sticky header so later
  // headers never paint over them on horizontal scroll.
  const headPinStyle = (key: string): CSSProperties | undefined =>
    pinnedCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
  const headStyle = (column: ColumnDef<TRow>): CSSProperties | undefined => {
    const key = column.key;
    const pin = headPinStyle(key);
    // A pinned column renders at the width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    if (!stickyStyle && !pin && width == null && !setWidth) return undefined;
    // Leave `width` out when unset so merging never clobbers the declared
    // column width the core prop-getter already provides.
    const merged: CSSProperties = {
      ...stickyStyle,
      ...pin,
      ...(width != null && { width }),
    };
    // The resize handle is absolutely positioned, so the cell needs a
    // positioning context when it is not already sticky/pinned.
    if (setWidth && !merged.position) merged.position = "relative";
    return merged;
  };
  // The checkbox / actions edge cells pin to their side when a data column
  // there is pinned (corner-sticky in the header).
  const edgeHeadStyle = (
    side: "start" | "end",
    active: boolean
  ): CSSProperties | undefined => {
    const edge = edgePinStyle(side, active, PIN_Z.headerPinned);
    if (!stickyStyle && !edge) return undefined;
    return { ...stickyStyle, ...edge };
  };
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;
  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra: reservedChromeWidth(showReorder, Boolean(selection), showActions),
  });

  // Nested like Ant: ungrouped leaves (Person, Load) rowspan through the
  // group band so they sit beside Delivery and its children, not under a
  // blank gap. Pads on the first header row span the whole band.
  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  const summary = useSummaryCells(summaryRow, rows);
  const showColumnFooter = summary !== undefined || columnsHaveFooter(columns);
  const summaryPad = (
    <td
      data-adapttable-part="summary-cell"
      className={classNames.summaryCell}
    />
  );

  const renderPinnedRow = (row: TRow, side: RowPinSide): ReactElement => {
    const id = getRowId(row);
    const found = rows.findIndex((item) => getRowId(item) === id);
    const sourceIndex = Math.max(0, found);
    return (
      <Row
        gridFocus={gridFocus}
        key={id}
        row={row}
        index={sourceIndex}
        id={id}
        table={table}
        columns={columns}
        bodyCells={cellsForRow(cellsByRow, id)}
        spanSignature={rowSpanSignature(cellsForRow(cellsByRow, id))}
        labels={labels}
        classNames={classNames}
        selected={selection ? selection.isSelected(id) : undefined}
        expanded={expansionState ? expansionState.isExpanded(id) : undefined}
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
        rowActions={rowActions}
        rowActionsLayout={rowActionsLayout}
        cellSpanAppearance={cellSpanAppearance}
        renderRowActions={renderRowActions}
        confirm={confirm}
        columnSpan={columnSpan}
        columnWidths={columnWidths}
        pinOffset={pinOffset}
        pinSignature={pinSignature}
        hasStartPin={hasStartPin}
        hasEndPin={hasEndPin}
        actionsPinned={stickActions}
        rowClass={rowClassName?.(row, sourceIndex)}
        rowVisualStyle={resolveRowStyle(rowStyle, rowHeight, row, sourceIndex)}
        rowStyleSignature={rowStyleSignature(
          resolveRowStyle(rowStyle, rowHeight, row, sourceIndex)
        )}
        clickable={Boolean(onRowClick)}
        hasPrefetch={Boolean(prefetch)}
        onRowClick={handleRowClick}
        onPrefetch={handlePrefetch}
        onToggleSelect={onToggleSelect}
        onToggleExpand={onToggleExpand}
        renderDetail={renderDetail}
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
    // Route the local sticky/pin/width style THROUGH the prop-getter
    // so it merges with core's alignment + declared width instead of
    // replacing them (a bare `style=` after the spread would).
    const localStyle = headStyle(column);
    const headerProps = table.getHeaderCellProps(
      column,
      localStyle && { style: localStyle }
    );
    // A multi-sort chain level counts as sorted too — data-sorted
    // and the glyph must agree with the aria-sort core reports.
    const chainDir = table.source.sortLevels.find(
      (level) => level.key === column.key
    )?.dir;
    const effectiveDir =
      chainDir ?? (table.sortBy === column.key ? table.sortDir : undefined);
    const active = effectiveDir !== undefined;
    // Spread the core prop-getter as-is so React hands the click
    // EVENT to core's onClick (shift-click chains a multi-sort
    // level). Its `data-sort-index` doubles as the badge content.
    const sortButtonProps = table.getSortButtonProps(column);
    const sortIndex = sortButtonProps["data-sort-index"];
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
    const style = {
      ...headerProps.style,
      ...(rowSpan > 1 ? { verticalAlign: "middle" as const } : {}),
    };
    return (
      <th
        key={column.key}
        {...(gridFocus?.getColumnHeaderProps(headerIndex, {
          sortable: column.sortable,
        }) ?? {})}
        {...headerProps}
        rowSpan={rowSpan > 1 ? rowSpan : undefined}
        style={style}
        data-adapttable-part="header-cell"
        data-sorted={effectiveDir}
        data-sticky={stickyAttr}
        data-pinned={pinOffset?.(column.key)?.side}
        className={classNames.headerCell}
      >
        {column.sortable ? (
          <button
            {...sortButtonProps}
            data-adapttable-part="sort-button"
            className={classNames.sortButton}
            title={column.headerTooltip}
          >
            {headerCaption}
            {typeof sortIndex === "number" && (
              <span
                data-adapttable-part="sort-index"
                className={classNames.sortIndex}
              >
                {sortIndex}
              </span>
            )}
            <span aria-hidden> {sortGlyph(active, effectiveDir)}</span>
          </button>
        ) : (
          <span title={column.headerTooltip}>{headerCaption}</span>
        )}
        {gridFocus?.columnCheckbox === true && (
          <ColumnSelectCheckbox
            label={columnSelectLabel(labels.selectColumn, column)}
            checked={gridFocus.isColumnSelected(headerIndex)}
            onToggle={() => gridFocus.toggleColumn(headerIndex)}
            className={classNames.columnSelect}
          />
        )}
        {column.headerActions ? (
          <span
            data-adapttable-part="header-actions"
            className={classNames.headerActions}
          >
            {column.headerActions}
          </span>
        ) : null}
        {headerDef ? (
          <FilterHeaderTrigger
            def={headerDef}
            source={table.source}
            labels={labels}
            registry={filterRegistry}
            closeOnSelect={closeHeaderFilterOnSelect}
            classNames={classNames}
          />
        ) : null}
        {setWidth && (
          <span
            {...columnResizeHandleProps(
              column.key,
              setWidth,
              `${resizeLabel}: ${columnName(column)}`
            )}
            data-adapttable-part="resize-handle"
            className={classNames.resizeHandle}
            style={RESIZE_HANDLE_STYLE}
          />
        )}
      </th>
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
      <th
        key={cell.key}
        colSpan={cell.colSpan}
        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
        data-adapttable-part="header-group-cell"
        className={classNames.headerGroupCell}
        style={groupedHeaderCellStyle(
          cell,
          "color-mix(in srgb, CanvasText 22%, transparent)"
        )}
      >
        <span style={groupedHeaderLabelStyle()}>
          {onToggleColumnGroup ? (
            <ColumnGroupToggle
              cell={cell.cell}
              labels={labels}
              onToggle={onToggleColumnGroup}
              className={classNames.columnGroupToggle}
            />
          ) : null}
          {columnGroupHeaderCaption(cell.cell)}
        </span>
      </th>
    );
  };

  const leadingHeaders = (rowSpan: number): ReactElement => (
    <>
      {expandable && (
        <th
          aria-label={labels.expandRow}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-adapttable-part="expand-header"
          data-sticky={stickyAttr}
          style={stickyStyle}
          className={cx(classNames.headerCell, classNames.expandHeader)}
        />
      )}
      {showReorder && (
        <th
          aria-label={labels.reorderRow}
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-adapttable-part="reorder-header"
          data-sticky={stickyAttr}
          data-pinned={hasStartPin || reorderPinned ? "start" : undefined}
          style={edgeHeadStyle("start", hasStartPin || reorderPinned)}
          className={cx(classNames.headerCell, classNames.reorderHeader)}
        />
      )}
      {selection && (
        <th
          data-adapttable-part="selection-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-sticky={stickyAttr}
          data-pinned={hasStartPin ? "start" : undefined}
          style={edgeHeadStyle("start", hasStartPin)}
          className={cx(classNames.headerCell, classNames.selectionHeader)}
        >
          <input
            type="checkbox"
            aria-label={labels.selectAll}
            checked={selection.headerState === "all"}
            ref={(el) => {
              if (el) el.indeterminate = selection.headerState === "some";
            }}
            data-adapttable-part="checkbox"
            onChange={selection.toggleAll}
            className={classNames.checkbox}
          />
        </th>
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
        <th
          data-adapttable-part="actions-header"
          rowSpan={rowSpan > 1 ? rowSpan : undefined}
          data-sticky={stickyAttr}
          data-pinned={hasEndPin || stickActions ? "end" : undefined}
          style={edgeHeadStyle("end", hasEndPin || stickActions)}
          className={cx(classNames.headerCell, classNames.actionsHeader)}
        >
          {labels.actions}
        </th>
      )}
    </>
  );

  const tableEl = (
    <table
      {...table.getTableProps()}
      {...gridFocus?.getGridProps()}
      data-adapttable-part="table"
      className={classNames.table}
      style={{
        ...(minWidth > 0 ? { minWidth } : {}),
        ...fittedTableStyle(fitColumns),
      }}
    >
      <thead
        ref={theadRef}
        data-adapttable-part="thead"
        className={classNames.thead}
      >
        {headerPlan ? (
          headerPlan.map((row, rowIndex) => {
            const last = rowIndex === headerPlan.length - 1;
            return (
              <tr
                key={row.map((cell) => cell.key).join("|")}
                {...(last ? table.getHeaderRowProps() : {})}
                ref={last ? headerRowRef : undefined}
                data-adapttable-part={last ? "header-row" : "header-group-row"}
                className={
                  last ? classNames.headerRow : classNames.headerGroupRow
                }
              >
                {rowIndex === 0 ? leadingHeaders(headerBand) : null}
                {row.map(renderPlanCell)}
                {rowIndex === 0 ? trailingHeaders(headerBand) : null}
              </tr>
            );
          })
        ) : (
          <tr
            {...table.getHeaderRowProps()}
            ref={headerRowRef}
            data-adapttable-part="header-row"
            className={classNames.headerRow}
          >
            {leadingHeaders(1)}
            {columns.map((column, headerIndex) =>
              renderLeafHeader(column, headerIndex)
            )}
            {trailingHeaders(1)}
          </tr>
        )}
      </thead>
      <tbody data-adapttable-part="tbody" className={classNames.tbody}>
        {insertExtrasBeforeRows(pinnedTopRows, extraRows, getRowId).map(
          (slot) =>
            isExtraEntry(slot) ? (
              <ExtraSlotRow
                key={slot.key}
                kind={slot.kind}
                colSpan={columnSpan}
                render={slot.kind === "fullWidth" ? slot.render : undefined}
                labels={labels}
                classNames={classNames}
                fillStyle={extraFill(slot.key)}
              />
            ) : (
              <Fragment key={slot.key}>
                {renderPinnedRow(slot.row, "top")}
              </Fragment>
            )
        )}
        {paddingTop > 0 && (
          <tr
            data-adapttable-part="virtual-spacer"
            className={classNames.virtualSpacer}
          >
            <td
              colSpan={columnSpan}
              style={{ height: paddingTop, padding: 0 }}
            />
          </tr>
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
                    classNames={classNames}
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
                    classNames={classNames}
                    onToggleCollapse={onToggleGroup}
                    onShowMore={grouping.showMore}
                  />
                );
              }
              const id = getRowId(entry.row);
              return (
                <Row
                  gridFocus={gridFocus}
                  key={entry.key}
                  row={entry.row}
                  index={entry.index}
                  id={id}
                  table={table}
                  columns={columns}
                  bodyCells={cellsForRow(cellsByRow, id)}
                  spanSignature={rowSpanSignature(cellsForRow(cellsByRow, id))}
                  labels={labels}
                  classNames={classNames}
                  selected={selection ? selection.isSelected(id) : undefined}
                  expanded={
                    expansionState ? expansionState.isExpanded(id) : undefined
                  }
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
                  rowActions={rowActions}
                  rowActionsLayout={rowActionsLayout}
                  cellSpanAppearance={cellSpanAppearance}
                  renderRowActions={renderRowActions}
                  confirm={confirm}
                  columnSpan={columnSpan}
                  columnWidths={columnWidths}
                  pinOffset={pinOffset}
                  pinSignature={pinSignature}
                  hasStartPin={hasStartPin}
                  hasEndPin={hasEndPin}
                  actionsPinned={stickActions}
                  rowClass={rowClassName?.(entry.row, entry.index)}
                  rowVisualStyle={resolveRowStyle(
                    rowStyle,
                    rowHeight,
                    entry.row,
                    entry.index
                  )}
                  rowStyleSignature={rowStyleSignature(
                    resolveRowStyle(rowStyle, rowHeight, entry.row, entry.index)
                  )}
                  clickable={Boolean(onRowClick)}
                  hasPrefetch={Boolean(prefetch)}
                  onRowClick={handleRowClick}
                  onPrefetch={handlePrefetch}
                  onToggleSelect={onToggleSelect}
                  onToggleExpand={onToggleExpand}
                  renderDetail={renderDetail}
                  measureElement={measureElement}
                  measureRowPair={measureRowPair}
                  editing={editing}
                  rows={rows}
                  getRowId={getRowId}
                  editingSignature={rowEditingSignature(editing, id)}
                />
              );
            })
          : // A tree renders its own flattened entries; a flat table renders
            // the (possibly windowed) rows. Both carry a row and a key.
            insertExtraRows(
              bodyRowEntries(entries, tree),
              extraRows,
              (e) => e.key
            ).map((slot) => {
              if (isExtraEntry(slot)) {
                return (
                  <ExtraSlotRow
                    key={slot.key}
                    kind={slot.kind}
                    colSpan={columnSpan}
                    render={slot.kind === "fullWidth" ? slot.render : undefined}
                    labels={labels}
                    classNames={classNames}
                    fillStyle={extraFill(slot.key)}
                  />
                );
              }
              const { row, index, key, treeEntry, sourceIndex } = slot;
              const id = getRowId(row);
              return (
                <Row
                  gridFocus={gridFocus}
                  key={key}
                  row={row}
                  index={index}
                  id={id}
                  table={table}
                  columns={columns}
                  bodyCells={cellsForRow(cellsByRow, id)}
                  spanSignature={rowSpanSignature(cellsForRow(cellsByRow, id))}
                  labels={labels}
                  classNames={classNames}
                  selected={selection ? selection.isSelected(id) : undefined}
                  expanded={
                    expansionState ? expansionState.isExpanded(id) : undefined
                  }
                  showActions={showActions}
                  showReorder={showReorder}
                  rowReorder={rowReorder}
                  windowStart={windowStart}
                  rowCount={rows.length}
                  reorderPinned={reorderPinned}
                  reorderSignature={rowReorderSignature(rowReorder, id, index)}
                  rowPinSide={undefined}
                  pinRowSticky={pinRowSticky}
                  rowPinOffset={rowPinOffset}
                  rowPinSignature={rowPinSignature(rowPinning, id)}
                  sourceIndex={sourceIndex ?? index}
                  rowActions={rowActions}
                  rowActionsLayout={rowActionsLayout}
                  cellSpanAppearance={cellSpanAppearance}
                  renderRowActions={renderRowActions}
                  confirm={confirm}
                  columnSpan={columnSpan}
                  columnWidths={columnWidths}
                  pinOffset={pinOffset}
                  pinSignature={pinSignature}
                  hasStartPin={hasStartPin}
                  hasEndPin={hasEndPin}
                  actionsPinned={stickActions}
                  rowClass={rowClassName?.(row, sourceIndex ?? index)}
                  rowVisualStyle={resolveRowStyle(
                    rowStyle,
                    rowHeight,
                    row,
                    sourceIndex ?? index
                  )}
                  rowStyleSignature={rowStyleSignature(
                    resolveRowStyle(
                      rowStyle,
                      rowHeight,
                      row,
                      sourceIndex ?? index
                    )
                  )}
                  clickable={Boolean(onRowClick)}
                  hasPrefetch={Boolean(prefetch)}
                  onRowClick={handleRowClick}
                  onPrefetch={handlePrefetch}
                  onToggleSelect={onToggleSelect}
                  onToggleExpand={onToggleExpand}
                  renderDetail={renderDetail}
                  measureElement={measureElement}
                  measureRowPair={measureRowPair}
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
          <tr
            data-adapttable-part="virtual-spacer"
            className={classNames.virtualSpacer}
          >
            <td
              colSpan={columnSpan}
              style={{ height: paddingBottom, padding: 0 }}
            />
          </tr>
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
                classNames={classNames}
                fillStyle={extraFill(slot.key)}
              />
            ) : (
              <Fragment key={slot.key}>
                {renderPinnedRow(slot.row, "bottom")}
              </Fragment>
            )
        )}
      </tbody>
      {showColumnFooter && (
        <tfoot data-adapttable-part="summary" className={classNames.summary}>
          <tr
            data-adapttable-part="summary-row"
            className={classNames.summaryRow}
          >
            {expandable && summaryPad}
            {showReorder && summaryPad}
            {selection && summaryPad}
            {columns.map((column) => (
              <td
                key={column.key}
                data-adapttable-part="summary-cell"
                className={classNames.summaryCell}
              >
                {resolveColumnFooter(column, summary?.[column.key])}
              </td>
            ))}
            {showActions && summaryPad}
          </tr>
        </tfoot>
      )}
    </table>
  );

  // The wrapper ALWAYS renders so the overflow hook has an element to
  // measure, but it gains a scroll style only when something needs one: a
  // pinned column (which needs a horizontal scroll container to stick to), a
  // table measurably wider than its container, or a bounding `maxHeight`.
  // While the table fits, the wrapper carries NO overflow style — see
  // `scrollBoxStyle` for the page-scroll sticky-header trap that avoids.
  return (
    <div
      ref={(node) => {
        overflowRef(node);
        virtualScrollRef?.(node);
      }}
      data-adapttable-part="scroll-box"
      className={classNames.scrollBox}
      style={scrollBoxStyle(maxHeight, hasPinned || overflowing)}
    >
      {tableEl}
    </div>
  );
}

function sortGlyph(active: boolean, dir: "asc" | "desc" | undefined): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

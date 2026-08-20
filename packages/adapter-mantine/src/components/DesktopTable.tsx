import {
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
  cellHighlightStyle,
  cellSpanMark,
  columnSelectLabel,
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
  mergedCellStyle,
  type PinLeads,
  pinnedColumnWidth,
  pinnedRowCellStyle,
  pinnedRowPart,
  pinnedRowSticky,
  REORDER_COLUMN_WIDTH,
  rowClickProps,
  rowIsDirty,
  type RowPairMeasurer,
  rowPinSignature,
  rowReorderDropStyle,
  rowReorderSignature,
  rowSpanSignature,
  type SharedTableRenderProps,
  useDesktopTableAssembly,
  useOffsetHeight,
  useSummaryCells,
} from "@adapttable/core/adapter";
import { Badge, Checkbox, Group, Table, VisuallyHidden } from "@mantine/core";
import type { CSSProperties, ReactElement, ReactNode, RefObject } from "react";
import { memo, useCallback, useMemo, useRef } from "react";

import { type Density, DENSITY_SPACING } from "../density";
import { ChevronDownIcon, ChevronUpIcon, SelectorIcon } from "../icons";
import { HAIRLINE, SURFACE } from "../surface";
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
}>): ReactElement {
  const parts = EXTRA_ROW_PARTS[kind];
  return (
    <Table.Tr
      data-adapttable-part={parts.row}
      style={EXTRA_OVER_SPAN_ROW_STYLE}
    >
      <Table.Td
        colSpan={colSpan}
        data-adapttable-part={parts.cell}
        role={kind === "separator" ? "separator" : undefined}
        aria-label={kind === "separator" ? labels.rowSeparator : undefined}
        style={{ ...EXTRA_OVER_SPAN_STYLE, ...fillStyle }}
      >
        {kind === "fullWidth" ? render?.() : null}
      </Table.Td>
    </Table.Tr>
  );
}

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

function When({
  show,
  children,
}: Readonly<{ show: boolean; children: ReactNode }>) {
  if (!show) return null;
  return children;
}

function isPinnedTable(
  hasColumnPin: boolean,
  actionsEdgePinned: boolean,
  showReorder: boolean,
  reorderPinned: boolean
): boolean {
  return hasColumnPin || actionsEdgePinned || (showReorder && reorderPinned);
}

function startLeads(
  expandable: boolean,
  showReorder: boolean,
  hasSelection: boolean,
  showActions: boolean,
  expansionWidth: number,
  selectionWidth: number,
  actionsWidth: number
): {
  expansionLead: number;
  reorderLead: number;
  leads: PinLeads;
} {
  const expansionLead = expandable ? expansionWidth : 0;
  const reorderLead = showReorder ? REORDER_COLUMN_WIDTH : 0;
  return {
    expansionLead,
    reorderLead,
    leads: {
      start: expansionLead + reorderLead + (hasSelection ? selectionWidth : 0),
      end: showActions ? actionsWidth : 0,
    },
  };
}

/**
 * Props for {@link DesktopTable}: the shared render contract from core
 * (minus `stickyTop` — the resolved `stickyHeaderOffset` replaces it) plus
 * the Mantine-specific extras.
 */
export interface DesktopTableProps<TRow> extends Omit<
  SharedTableRenderProps<TRow>,
  "stickyTop"
> {
  bodyRef: RefObject<HTMLTableSectionElement | null>;
  className?: string;
  /** Resolved sticky-header top inset (page `stickyTop` + toolbar height). */
  stickyHeaderOffset?: number;
  /** The injected actions column is pinned to the inline end on its own. */
  actionsPinned?: boolean;
  density?: Density;
}

function SortIcon({
  active,
  dir,
}: Readonly<{
  active: boolean;
  dir: "asc" | "desc" | undefined;
}>) {
  if (!active) return <SelectorIcon size={12} />;
  return dir === "asc" ? (
    <ChevronUpIcon size={12} />
  ) : (
    <ChevronDownIcon size={12} />
  );
}

function HeaderCell<TRow>({
  table,
  column,
  stickyStyle,
  resizeHandle,
  columnProps,
  columnSelect,
  filterTrigger,
  rowSpan = 1,
}: Readonly<{
  table: UseDataTableResult<TRow>;
  column: ColumnDef<TRow>;
  stickyStyle: CSSProperties;
  resizeHandle?: ReactNode;
  /** Cell-navigation props for this header — column selection. */
  columnProps?: Record<string, unknown>;
  /** The column-selection checkbox, when the table asked for one. */
  columnSelect?: ReactNode;
  /** Per-column filter icon, when `headerFilters` is on. */
  filterTrigger?: ReactNode;
  /** Ungrouped leaves rowspan through the group band (Ant-style). */
  rowSpan?: number;
}>) {
  // The part name is added here rather than taken from the prop-getter:
  // the kits that pull only `aria-sort` out of it would not get one, so the
  // name lives on each kit's header element and stays consistent.
  const cellProps = {
    "data-adapttable-part": "header-cell",
    ...table.getHeaderCellProps(column),
    ...columnProps,
  };
  const headerStyle = {
    ...cellProps.style,
    ...stickyStyle,
    ...(rowSpan > 1 ? { verticalAlign: "middle" as const } : {}),
  };
  const spanProps = rowSpan > 1 ? { rowSpan } : {};
  const buttonProps = table.getSortButtonProps(column);
  const sortIndex = buttonProps["data-sort-index"];
  const level = table.source.sortLevels.find((l) => l.key === column.key);
  const caption = resolveColumnHeader(
    column,
    columnHeaderController(column, {
      sortDir:
        level?.dir ?? (table.sortBy === column.key ? table.sortDir : undefined),
      sortIndex: typeof sortIndex === "number" ? sortIndex : undefined,
      toggleSort: buttonProps.onClick,
    })
  );
  const actions = column.headerActions ? (
    <span data-adapttable-part="header-actions">{column.headerActions}</span>
  ) : null;
  if (!column.sortable) {
    return (
      <Table.Th {...cellProps} {...spanProps} style={headerStyle}>
        <span title={column.headerTooltip}>{caption}</span>
        {columnSelect}
        {actions}
        {filterTrigger}
        {resizeHandle}
      </Table.Th>
    );
  }
  // Core's onClick receives the click event as-is (no zero-arg wrapper), so
  // shift-clicks reach the multi-sort branch inside `getSortButtonProps`.
  // 1-based chain position from core (always > 0 when defined) — drives the
  // multi-sort badge; the chain level also wins the icon's active/dir state,
  // because chaining clears the single-sort `sortBy`.
  const active = level !== undefined || table.sortBy === column.key;
  return (
    <Table.Th {...cellProps} {...spanProps} style={headerStyle}>
      <Group
        component="button"
        gap={6}
        wrap="nowrap"
        display="inline-flex"
        title={column.headerTooltip}
        style={{
          background: "none",
          border: 0,
          cursor: "pointer",
          font: "inherit",
          padding: 0,
          color: active ? "var(--mantine-primary-color-filled)" : "inherit",
        }}
        {...buttonProps}
      >
        <span>{caption}</span>
        <SortIcon active={active} dir={level?.dir ?? table.sortDir} />
        {typeof sortIndex === "number" && (
          <Badge component="span" size="xs" variant="light">
            {sortIndex}
          </Badge>
        )}
      </Group>
      {columnSelect}
      {actions}
      {filterTrigger}
      {resizeHandle}
    </Table.Th>
  );
}

/**
 * Props for the memoized {@link DesktopRowBase}. Everything the row's visual
 * output depends on is a primitive, a stable identity, or is fingerprinted
 * by `pinSignature` — so {@link desktopRowPropsEqual} can hold the row
 * across unrelated table re-renders (search keystrokes, other rows'
 * selection) without ever capturing a stale event handler.
 */
interface DesktopRowProps<TRow> {
  row: TRow;
  /** Absolute row index (virtual windows keep source indices). */
  index: number;
  /** Stable row id from `getRowId`. */
  id: string;
  columns: readonly ColumnDef<TRow>[];
  /** This row's cells — covered neighbours already omitted. */
  bodyCells: readonly BodyCell<TRow>[];
  /** Memo digest from {@link rowSpanSignature}. */
  spanSignature: string;
  /** Core's cell prop-getter — identity-stable for the table's lifetime. */
  getCellProps: UseDataTableResult<TRow>["getCellProps"];
  /**
   * Core's row prop-getter — the part name, `role`, the row id, the dataset
   * index and `aria-selected` in one spread. Uncompared (see
   * {@link UncomparedRowProp}): its identity changes with every selection
   * change, while everything it emits is already determined by a compared
   * prop, so a held row can never show a stale value.
   */
  getRowProps: UseDataTableResult<TRow>["getRowProps"];
  /** Cell-navigation getters; absent unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  /** Selected state; `undefined` when selection is off (no checkbox cell). */
  selected?: boolean;
  selectLabel: string;
  /** Identity-stable select toggle (latest-ref wrapped in the parent). */
  onToggleSelect: (id: string) => void;
  /** Expanded state; `undefined` when expansion is off (no chevron cell). */
  expanded?: boolean;
  expandLabel: string;
  collapseLabel: string;
  /** Core's expansion toggle — identity-stable. */
  onToggleExpand?: (id: string) => void;
  renderRowDetail?: (row: TRow) => ReactNode;
  /** Detail-cell span: expansion + selection + data + actions columns. */
  columnSpan: number;
  /** Widths holding open the columns outside the horizontal window. */
  columnSpacers?: { start: number; end: number };
  /** This row's place in the tree, when the table has one. */
  treeEntry?: TreeEntry<TRow>;
  /** Which column carries the chevron and the indent. */
  treeColumnKey?: string;
  /** Open or close a tree node. */
  onToggleTree?: (id: string) => void;
  rowActions?: RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  cellSpanAppearance: SharedTableRenderProps<TRow>["cellSpanAppearance"];
  renderRowActions?: RowActionsRenderer<TRow>;
  confirm: ConfirmHandler;
  cancelLabel: string;
  /** `labels.editRow` / `labels.saveRow` — row mode's own controls. */
  editRowLabel: string;
  saveRowLabel: string;
  editLabel: string;
  /** `labels.undoEdit` — the control a failed save offers. */
  undoLabel: string;
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
  /** Resolved table labels — the reorder handle reads its own strings. */
  labels: Required<TableLabels>;
  onRowClick?: (row: TRow) => void;
  prefetch?: (row: TRow) => void;
  /** Resolved `rowClassName(row, index)` output. */
  className?: string;
  /** Resolved `rowStyle` + `rowHeight`. Compared via `rowStyleSignature`. */
  rowVisualStyle?: CSSProperties;
  rowStyleSignature: string;
  measureElement?: (element: Element | null) => void;
  /** Measures a row together with its open detail panel. */
  measureRowPair?: RowPairMeasurer;
  /** Pinned-cell style for a data column (output covered by `pinSignature`). */
  pinStyleFor: (key: string) => CSSProperties | undefined;
  selectionCellStyle?: CSSProperties;
  expansionCellStyle?: CSSProperties;
  reorderCellStyle?: CSSProperties;
  actionsCellStyle?: CSSProperties;
  /** Fingerprint of the pin layout, compared instead of the styles above. */
  pinSignature: string;
  editing: EditableCellEditing<TRow> | undefined;
  rows: readonly TRow[];
  getRowId: (row: TRow) => string;
  editingSignature: string | null;
}

/**
 * The style-ish props the comparator deliberately skips: they are rebuilt
 * every parent render, and their visual output is exactly determined by
 * `pinSignature` (plus the compared inputs) — comparing their identities
 * would only defeat the memo. `getRowProps` joins them for the same reason:
 * core rebuilds it on every selection change, and its output moves only with
 * `row`, `sourceIndex`, `selected` and `hasSelection`, all compared.
 */
type UncomparedRowProp =
  | "getRowProps"
  | "pinStyleFor"
  | "selectionCellStyle"
  | "expansionCellStyle"
  | "reorderCellStyle"
  | "actionsCellStyle"
  | "editing"
  | "rows"
  | "getRowId"
  | "rowReorder"
  | "windowStart"
  | "rowCount"
  | "bodyCells"
  | "rowVisualStyle";

/** Every row prop the memo comparator checks with `Object.is`. */
const COMPARED_ROW_PROPS: readonly Exclude<
  keyof DesktopRowProps<unknown>,
  UncomparedRowProp
>[] = [
  "row",
  "index",
  "id",
  // Cell focus and the selected range, or a row never learns that one of its
  // cells became focused or selected — the live region announced the move
  // while every row kept its previous output. One reference compare: the
  // state object is memoized as a whole.
  "gridFocus",
  "columns",
  "spanSignature",
  "getCellProps",
  "selected",
  "selectLabel",
  "onToggleSelect",
  "expanded",
  "expandLabel",
  "collapseLabel",
  "onToggleExpand",
  "renderRowDetail",
  "columnSpan",
  "rowActions",
  "rowActionsLayout",
  "cellSpanAppearance",
  "renderRowActions",
  "confirm",
  "cancelLabel",
  "editLabel",
  "showReorder",
  "reorderSignature",
  "rowPinSignature",
  "rowPinSide",
  "pinRowSticky",
  "rowPinOffset",
  "sourceIndex",
  "reorderPinned",
  "labels",
  "onRowClick",
  "prefetch",
  "className",
  "rowStyleSignature",
  "measureElement",
  "pinSignature",
  "editingSignature",
  // Or a folder opens and its own chevron never turns.
  "treeEntry",
  "treeColumnKey",
];

/**
 * Row memo comparator: `Object.is` over every prop except the per-render
 * style derivations excluded above. All event handlers passed to the row
 * are identity-stable (or compared here, so a changed handler re-renders
 * the row and is captured fresh) — a held row can never fire a stale
 * closure.
 */
function desktopRowPropsEqual<TRow>(
  prev: Readonly<DesktopRowProps<TRow>>,
  next: Readonly<DesktopRowProps<TRow>>
): boolean {
  return COMPARED_ROW_PROPS.every((key) => Object.is(prev[key], next[key]));
}

/**
 * Sticky style for a leading chrome cell (chevron / checkbox) pinned
 * `inset` px past the inline-start edge, active only while a data column is
 * pinned on that side. Body cells pass a `background` so scrolled data
 * never shows through.
 */
function leadingPinStyle(
  active: boolean,
  inset: number,
  zIndex: number,
  background?: string
): CSSProperties | undefined {
  if (!active) return undefined;
  const style = pinnedCellStyle({ side: "start", inset }, zIndex);
  return background ? { ...style, background } : style;
}

/**
 * Visual fingerprint of the pin layout (sides, insets, edge-pinned chrome
 * columns). Memoized rows compare this one string instead of the per-render
 * style objects derived from it.
 */
function pinLayoutSignature<TRow>(
  columns: readonly ColumnDef<TRow>[],
  pinOffset: SharedTableRenderProps<TRow>["pinOffset"],
  hasStartPin: boolean,
  actionsEdgePinned: boolean
): string {
  const perColumn = columns.map((column) => {
    const pin = pinOffset?.(column.key);
    return pin ? `${column.key}:${pin.side}${pin.inset}` : column.key;
  });
  return `${perColumn.join("|")}|${String(hasStartPin)}|${String(actionsEdgePinned)}`;
}

/**
 * One desktop row (plus its detail row when expanded), extracted so it can
 * be memoized: typing in the search box or toggling another row's checkbox
 * re-renders the table chrome but leaves untouched rows alone.
 */
function DesktopRowBase<TRow>({
  row,
  index,
  id,
  columns,
  bodyCells,
  getCellProps,
  getRowProps,
  gridFocus,
  selected,
  selectLabel,
  onToggleSelect,
  expanded,
  expandLabel,
  collapseLabel,
  onToggleExpand,
  renderRowDetail,
  columnSpan,
  columnSpacers,
  rowActions,
  rowActionsLayout,
  cellSpanAppearance,
  renderRowActions,
  confirm,
  cancelLabel,
  editLabel,
  undoLabel,
  showReorder,
  rowReorder,
  rowPinSide,
  pinRowSticky,
  rowPinOffset,
  sourceIndex,
  windowStart,
  rowCount,
  labels,
  onRowClick,
  prefetch,
  className,
  rowVisualStyle,
  measureElement,
  measureRowPair,
  pinStyleFor,
  selectionCellStyle,
  expansionCellStyle,
  reorderCellStyle,
  actionsCellStyle,
  editing,
  rows,
  getRowId,
  treeEntry,
  treeColumnKey: treeKey,
  onToggleTree,
  editRowLabel,
  saveRowLabel,
}: Readonly<DesktopRowProps<TRow>>) {
  // The trailing control column also carries row mode's save / cancel.
  const showActions =
    (rowActions?.length ?? 0) > 0 || editing?.rowEditing !== undefined;
  const edgeRowPin = pinnedRowCellStyle(rowPinSide, rowPinOffset, true);
  const focusIndex = sourceIndex;
  const bodyPinStyle = (key: string): CSSProperties | undefined => {
    const column = pinStyleFor(key);
    const rowPin = pinnedRowCellStyle(
      rowPinSide,
      rowPinOffset,
      column !== undefined
    );
    if (!column && !rowPin.position) return undefined;
    return { ...column, ...rowPin };
  };
  let rowMeasureRef: typeof measureElement | undefined;
  if (!rowPinSide) {
    rowMeasureRef = measureRowPair ? measureRowPair.row(index) : measureElement;
  }
  const pinPart = pinnedRowPart(rowPinSide);
  const pinSticky = pinnedRowSticky(rowPinSide, pinRowSticky, rowPinOffset);
  return (
    <>
      <Table.Tr
        {...getRowProps(row, focusIndex)}
        {...gridFocus?.getRowPropsAt(focusIndex)}
        data-row-pin={rowPinSide}
        data-adapttable-part={pinPart ?? "row"}
        {...rowClickProps(row, onRowClick, focusIndex)}
        {...(rowReorder?.dropProps(index, row, windowStart) ?? {})}
        {...(rowReorder?.rowAttrs(id, index) ?? {})}
        className={className}
        style={{
          ...rowVisualStyle,
          ...pinSticky,
          ...rowReorderDropStyle(rowReorder?.rowAttrs(id, index)),
        }}
        ref={rowMeasureRef}
        data-stagger=""
        data-dirty={rowIsDirty(editing, id) ? "" : undefined}
        onMouseEnter={prefetch ? () => prefetch(row) : undefined}
      >
        {expanded !== undefined && (
          <Table.Td
            ta="center"
            style={{ ...expansionCellStyle, ...edgeRowPin }}
          >
            <ExpandToggle
              expanded={expanded}
              expandLabel={expandLabel}
              collapseLabel={collapseLabel}
              onToggle={() => onToggleExpand!(id)}
            />
          </Table.Td>
        )}
        {showReorder && rowReorder && (
          <Table.Td
            data-adapttable-part="reorder-cell"
            ta="center"
            style={{ ...reorderCellStyle, ...edgeRowPin }}
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
          </Table.Td>
        )}
        {selected !== undefined && (
          <Table.Td
            data-adapttable-part="selection-cell"
            ta="center"
            style={{ ...selectionCellStyle, ...edgeRowPin }}
          >
            <Checkbox
              aria-label={selectLabel}
              checked={selected}
              onChange={() => onToggleSelect(id)}
            />
          </Table.Td>
        )}
        {columnSpacers && (
          <ColumnSpacer width={columnSpacers.start} side="start" />
        )}
        {bodyCells.map((cell) => {
          const { column, columnIndex, colSpan, rowSpan } = cell;
          const focusProps = gridFocus?.getCellPropsAt(focusIndex, columnIndex);
          return (
            <Table.Td
              key={column.key}
              colSpan={colSpan > 1 ? colSpan : undefined}
              rowSpan={rowSpan > 1 ? rowSpan : undefined}
              data-column-key={column.key}
              data-adapttable-part="cell"
              data-cell-span={cellSpanMark(colSpan, rowSpan)}
              {...getCellProps(column)}
              {...focusProps}
              style={
                // A selected cell takes Mantine's own primary-light fill, applied
                // OVER the pinned background so a pinned column still shows the
                // selection rather than hiding it behind its opaque surface.
                cellHighlightStyle(
                  focusProps,
                  {
                    ...bodyPinStyle(column.key),
                    ...mergedCellStyle(colSpan, rowSpan, cellSpanAppearance),
                  },
                  {
                    background: "var(--mantine-primary-color-light)",
                  }
                )
              }
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
                  rows={rows}
                  columns={columns}
                  rowKey={getRowId}
                  editLabel={editLabel}
                  undoLabel={undoLabel}
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
            </Table.Td>
          );
        })}
        {columnSpacers && <ColumnSpacer width={columnSpacers.end} side="end" />}
        {showActions && (
          <Table.Td ta="end" style={{ ...actionsCellStyle, ...edgeRowPin }}>
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
          </Table.Td>
        )}
      </Table.Tr>
      {expanded === true && (
        <Table.Tr>
          <Table.Td colSpan={columnSpan}>{renderRowDetail!(row)}</Table.Td>
        </Table.Tr>
      )}
    </>
  );
}

/** Desktop table rendering driven by core prop-getters. */
export function DesktopTable<TRow>(props: Readonly<DesktopTableProps<TRow>>) {
  const {
    gridFocus,
    table,
    rows,
    collapsibleColumnGroups,
    collapsedColumnGroups,
    columnGroups,
    onToggleColumnGroup,
    summaryRow,
    expansion,
    grouping,
    bodyRef,
    className,
    stickyHeaderOffset = 0,
    stickyHeader = false,
    pinOffset,
    maxHeight,
    virtualScrollRef,
    setWidth,
    columnWidths,
    resizeLabel = "Resize column",
    actionsPinned = false,
    reorderPinned = false,
    density = "comfortable",
    fitColumns,
    headerFilters,
    filterDefs,
    filterRegistry,
    closeHeaderFilterOnSelect,
  } = props;
  const assembly = useDesktopTableAssembly(
    { ...props, stickyTop: props.stickyHeaderOffset },
    { widths: { expansion: 36, selection: 40, actions: 120 } }
  );
  // The shared render prelude from core — including `columnSpan` for the
  // spacer/detail cells, which counts the expansion column itself when
  // `renderRowDetail` + `expansion` are wired.
  const { columns, selection, labels, showActions, showReorder, leadingCells } =
    assembly.model;
  const [theadRef] = useOffsetHeight();
  const [headerRowRef] = useOffsetHeight();
  // Expansion state only exists when `renderRowDetail` is set (the chrome
  // couples them), so its presence alone decides the leading chevron column.
  const expandable = expansion !== undefined;
  // Grouped header row over the VISIBLE columns (`null` → no extra row) and
  // the per-column footer summary cells (`undefined` → no footer).
  const headerPlan = htmlGroupedHeaderPlan(
    columns,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    columnGroups
  );
  const headerBand = headerPlan?.length ?? 1;
  const summaryCells = useSummaryCells(summaryRow, rows);
  const showColumnFooter =
    summaryCells !== undefined || columnsHaveFooter(columns);
  const hasEndPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "end"
  );
  // The actions column sticks to the inline end either because a data column
  // is pinned right (it must stay outermost past it) or because the user
  // pinned the actions column itself — one click, no data column involved.
  const actionsEdgePinned = showActions && (hasEndPin || actionsPinned);
  const hasPinned = isPinnedTable(
    table.columns.some((c) => pinOffset?.(c.key) != null),
    actionsEdgePinned,
    showReorder,
    reorderPinned
  );
  // Pinning needs horizontal scroll, and a `maxHeight` needs vertical scroll;
  // either makes the wrapper a scroll container (setting one overflow axis to
  // `auto` computes the other to `auto` too). Inside that container the page
  // toolbar is irrelevant, so the sticky header sticks to the box top (0).
  // Only against the document scroller must it clear the toolbar via
  // `stickyHeaderOffset`.
  // Without a `maxHeight`, the wrapper becomes a horizontal scroller only
  // when it must: pinned columns always need one, otherwise only while the
  // table is measurably wider than the wrapper (so wide tables scroll instead
  // of bleeding over the card border). When the table fits, the wrapper stays
  // a NON-scroll container — any `overflow` would trap the page-scroll sticky
  // header inside it.
  const { ref: wrapperRef, overflowing } =
    useHorizontalOverflow<HTMLDivElement>();
  const inScrollBox = maxHeight != null || hasPinned || overflowing;
  // `position: sticky` on `<thead>` does not engage against the document
  // scroller (only inside an overflow container) — so we stick the header
  // *cells* instead. Each th carries its own opaque background so scrolled
  // rows never show through.
  const headerCellStyle: CSSProperties = stickyHeader
    ? {
        position: "sticky",
        top: inScrollBox ? 0 : stickyHeaderOffset,
        zIndex: PIN_Z.header,
        background: SURFACE,
        boxShadow: `0 1px 0 ${HAIRLINE}`,
      }
    : { background: SURFACE };

  // The leading chevron (36px) + checkbox (40px) and trailing actions
  // (120px) columns pin to the edge alongside the data columns, which
  // therefore start past them.
  const expansionWidth = 36;
  const selectionWidth = 40;
  const actionsWidth = 120;
  const { expansionLead, reorderLead, leads } = startLeads(
    expandable,
    showReorder,
    Boolean(selection),
    showActions,
    expansionWidth,
    selectionWidth,
    actionsWidth
  );
  const hasStartPin = table.columns.some(
    (c) => pinOffset?.(c.key)?.side === "start"
  );

  // Pinned cells stick to the left/right edge (corner-sticky in the header,
  // which also sticks to the top). They need an opaque background.
  const pinBg = SURFACE;
  const headerStyleFor = (column: ColumnDef<TRow>): CSSProperties => {
    const key = column.key;
    const pin = pinnedCellStyle(pinOffset?.(key), PIN_Z.headerPinned, leads);
    // A pinned column renders at the same width its sticky inset assumed, so
    // stacked pins stay flush even with no declared width. Written only when
    // there IS one: an explicit `width: undefined` spread over core's computed
    // size would erase it.
    const width = pin
      ? pinnedColumnWidth(column, columnWidths)
      : columnWidths?.[key];
    const merged: CSSProperties = {
      ...headerCellStyle,
      ...pin,
      ...(width == null ? {} : { width }),
    };
    if (setWidth && !merged.position) merged.position = "relative";
    return merged;
  };
  // The chevron / checkbox / actions cells become corner-sticky (top + edge
  // in the header, edge in the body) when a data column on their side is
  // pinned. The checkbox column sits AFTER the chevron column, so its edge
  // inset starts past the chevron's width.
  const expansionHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...leadingPinStyle(hasStartPin, 0, PIN_Z.headerPinned),
  };
  const reorderHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...leadingPinStyle(
      hasStartPin || reorderPinned,
      expansionLead,
      PIN_Z.headerPinned
    ),
  };
  const selectionHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...leadingPinStyle(
      hasStartPin,
      expansionLead + reorderLead,
      PIN_Z.headerPinned
    ),
  };
  const actionsHeaderStyle: CSSProperties = {
    ...headerCellStyle,
    ...edgePinStyle("end", actionsEdgePinned, PIN_Z.headerPinned),
  };
  const edgeBodyStyle = (
    side: "start" | "end",
    active: boolean
  ): CSSProperties | undefined => {
    const pin = edgePinStyle(side, active, PIN_Z.body);
    return pin ? { ...pin, background: pinBg } : undefined;
  };
  const columnName = (column: ColumnDef<TRow>): string =>
    typeof column.header === "string" ? column.header : column.key;
  const resizeHandleFor = (column: ColumnDef<TRow>): ReactNode =>
    setWidth ? (
      <span
        {...columnResizeHandleProps(
          column.key,
          setWidth,
          `${resizeLabel}: ${columnName(column)}`
        )}
        style={RESIZE_HANDLE_STYLE}
      />
    ) : undefined;
  const renderMantineLeaf = (
    cell: Extract<HtmlGroupedHeaderCell, { kind: "leaf" }>
  ): ReactElement => {
    const column = columns[cell.columnIndex];
    if (!column) return <></>;
    const headerIndex = cell.columnIndex;
    const headerDef =
      headerFilters === true
        ? filterDefForColumn(filterDefs ?? [], column.key)
        : undefined;
    return (
      <HeaderCell
        key={column.key}
        table={table}
        column={column}
        stickyStyle={headerStyleFor(column)}
        resizeHandle={resizeHandleFor(column)}
        rowSpan={cell.rowSpan}
        columnProps={gridFocus?.getColumnHeaderProps(headerIndex, {
          sortable: column.sortable,
        })}
        columnSelect={
          gridFocus?.columnCheckbox === true ? (
            <ColumnSelectCheckbox
              label={columnSelectLabel(labels.selectColumn, column)}
              checked={gridFocus.isColumnSelected(headerIndex)}
              onToggle={() => gridFocus.toggleColumn(headerIndex)}
            />
          ) : undefined
        }
        filterTrigger={
          headerDef ? (
            <FilterHeaderTrigger
              def={headerDef}
              source={table.source}
              labels={labels}
              registry={filterRegistry}
              closeOnSelect={closeHeaderFilterOnSelect}
            />
          ) : undefined
        }
      />
    );
  };
  // Row separators, but drawn on the CELLS. A sticky header forces the table
  // into `border-collapse: separate` (below), and the separated model tells
  // the browser to ignore borders declared on a `<tr>` — which is exactly
  // where Mantine's `withRowBorders` puts them, so every row divider silently
  // disappears. Mantine solves the same problem for its own sticky mode by
  // shadowing the cell; we do the same here. Collapsed tables keep the row's
  // real border, so this must stay off in that path or every line doubles.
  const rowSeparator: CSSProperties | undefined = stickyHeader
    ? { boxShadow: `inset 0 -1px 0 ${HAIRLINE}` }
    : undefined;
  // A pinned cell already carries a `boxShadow`; merging blindly would drop
  // one of the two, so compose them into a single value.
  const withRowSeparator = (
    style: CSSProperties | undefined
  ): CSSProperties | undefined => {
    if (!rowSeparator) return style;
    if (!style) return rowSeparator;
    return {
      ...style,
      boxShadow: style.boxShadow
        ? `${String(style.boxShadow)}, ${String(rowSeparator.boxShadow)}`
        : rowSeparator.boxShadow,
    };
  };
  const bodyPinStyle = (key: string): CSSProperties | undefined => {
    const pin = pinnedCellStyle(pinOffset?.(key), PIN_Z.body, leads);
    return withRowSeparator(pin ? { ...pin, background: pinBg } : undefined);
  };
  const expansionCellStyle = withRowSeparator(
    leadingPinStyle(hasStartPin, 0, PIN_Z.body, pinBg)
  );
  const reorderCellStyle = withRowSeparator(
    leadingPinStyle(
      hasStartPin || reorderPinned,
      expansionLead,
      PIN_Z.body,
      pinBg
    )
  );
  const selectionCellStyle = withRowSeparator(
    leadingPinStyle(hasStartPin, expansionLead + reorderLead, PIN_Z.body, pinBg)
  );
  const actionsCellStyle = withRowSeparator(
    edgeBodyStyle("end", actionsEdgePinned)
  );

  const { verticalSpacing, horizontalSpacing } = DENSITY_SPACING[density];

  // Fixed-width columns get a real table min-width (their sum), so the table
  // overflows and scrolls horizontally instead of squishing columns to fit.
  const minWidth = tableMinWidth(columns, {
    widths: columnWidths,
    extra:
      expansionLead +
      reorderLead +
      (selection ? 40 : 0) +
      (showActions ? 120 : 0),
  });

  // Latest-ref select toggle: the controlled selection mode rebuilds
  // `selection.toggle` around the current ids on every change, so memoized
  // rows hold this FIXED identity that always dispatches to the live one.
  const selectionRef = useRef(selection);
  selectionRef.current = selection;
  const groupingRef = useRef(grouping);
  groupingRef.current = grouping;
  const onToggleGroup = useCallback(
    (groupKey: string) => groupingRef.current?.collapsed.toggle(groupKey),
    []
  );

  // `memo` erases generics at module level, so the memoized row is
  // instantiated here (once — the identity is stable for the table's life).
  const Row = useMemo(
    () => memo(DesktopRowBase<TRow>, desktopRowPropsEqual),
    []
  );

  const pinSignature = pinLayoutSignature(
    columns,
    pinOffset,
    hasStartPin,
    actionsEdgePinned
  );
  const wrapperStyle: CSSProperties =
    maxHeight == null
      ? {
          width: "100%",
          ...(hasPinned || overflowing ? { overflowX: "auto" } : {}),
        }
      : { width: "100%", maxHeight, overflow: "auto" };

  return (
    <div
      ref={(node) => {
        wrapperRef(node);
        virtualScrollRef?.(node);
      }}
      style={wrapperStyle}
    >
      <Table
        data-adapttable-part="table"
        {...table.getTableProps()}
        {...gridFocus?.getGridProps()}
        className={className}
        highlightOnHover
        verticalSpacing={verticalSpacing}
        horizontalSpacing={horizontalSpacing}
        // Chromium cannot stick a <th
        // <thead> inside a border-collapsed table, so
        // the sticky header opts into separate borders. That model ignores
        // borders on a <tr>, which is where the row dividers live — so the
        // sticky path draws them on the cells instead (`rowSeparator` above).
        style={{
          // Set here rather than through Mantine's `miw`: that prop runs every
          // value through `rem()`, so a pixel sum becomes
          // `calc(Xrem * var(--mantine-scale))` and computes to 0 wherever that
          // variable is out of scope — the table then collapses to its
          // container, nothing scrolls sideways, and a pinned column has
          // nothing to stick against. These are the columns' own pixel widths.
          minWidth: Math.max(480, minWidth),
          ...(stickyHeader
            ? { borderCollapse: "separate" as const, borderSpacing: 0 }
            : {}),
          ...fittedTableStyle(fitColumns),
        }}
      >
        <Table.Thead
          data-adapttable-part="thead"
          ref={theadRef}
          style={{ background: SURFACE }}
        >
          {headerPlan ? (
            headerPlan.map((row, rowIndex) => {
              const last = rowIndex === headerPlan.length - 1;
              return (
                <Table.Tr
                  key={row.map((cell) => cell.key).join("|")}
                  {...(last ? table.getHeaderRowProps() : {})}
                  ref={last ? headerRowRef : undefined}
                  data-adapttable-part={
                    last ? "header-row" : "header-group-row"
                  }
                >
                  {rowIndex === 0 ? (
                    <>
                      {expandable && (
                        <Table.Th
                          w={expansionWidth}
                          ta="center"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={expansionHeaderStyle}
                        >
                          <VisuallyHidden>{labels.expandRow}</VisuallyHidden>
                        </Table.Th>
                      )}
                      <When show={showReorder}>
                        <Table.Th
                          w={REORDER_COLUMN_WIDTH}
                          ta="center"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          aria-label={labels.reorderRow}
                          data-adapttable-part="reorder-header"
                          style={reorderHeaderStyle}
                        />
                      </When>
                      {selection && (
                        <Table.Th
                          data-adapttable-part="selection-header"
                          w={selectionWidth}
                          ta="center"
                          rowSpan={headerBand > 1 ? headerBand : undefined}
                          style={selectionHeaderStyle}
                        >
                          <Checkbox
                            aria-label={labels.selectAll}
                            checked={selection.headerState === "all"}
                            indeterminate={selection.headerState === "some"}
                            onChange={selection.toggleAll}
                          />
                        </Table.Th>
                      )}
                    </>
                  ) : null}
                  {row.map((cell) =>
                    cell.kind === "group" ? (
                      <Table.Th
                        key={cell.key}
                        colSpan={cell.colSpan}
                        rowSpan={cell.rowSpan > 1 ? cell.rowSpan : undefined}
                        ta={groupedHeaderAlign(cell.cell.align)}
                        fw={600}
                        data-adapttable-part="header-group-cell"
                        style={groupedHeaderCellStyle(cell, HAIRLINE)}
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
                      </Table.Th>
                    ) : (
                      renderMantineLeaf(cell)
                    )
                  )}
                  {rowIndex === 0 && showActions ? (
                    <Table.Th
                      ta="end"
                      w={actionsWidth}
                      rowSpan={headerBand > 1 ? headerBand : undefined}
                      style={actionsHeaderStyle}
                    >
                      {labels.actions}
                    </Table.Th>
                  ) : null}
                </Table.Tr>
              );
            })
          ) : (
            <Table.Tr
              {...table.getHeaderRowProps()}
              ref={headerRowRef}
              data-adapttable-part="header-row"
            >
              {expandable && (
                <Table.Th
                  w={expansionWidth}
                  ta="center"
                  style={expansionHeaderStyle}
                >
                  <VisuallyHidden>{labels.expandRow}</VisuallyHidden>
                </Table.Th>
              )}
              <When show={showReorder}>
                <Table.Th
                  w={REORDER_COLUMN_WIDTH}
                  ta="center"
                  aria-label={labels.reorderRow}
                  data-adapttable-part="reorder-header"
                  style={reorderHeaderStyle}
                />
              </When>
              {selection && (
                <Table.Th
                  data-adapttable-part="selection-header"
                  w={selectionWidth}
                  ta="center"
                  style={selectionHeaderStyle}
                >
                  <Checkbox
                    aria-label={labels.selectAll}
                    checked={selection.headerState === "all"}
                    indeterminate={selection.headerState === "some"}
                    onChange={selection.toggleAll}
                  />
                </Table.Th>
              )}
              {columns.map((column, headerIndex) =>
                renderMantineLeaf({
                  kind: "leaf",
                  key: column.key,
                  columnIndex: headerIndex,
                  rowSpan: 1,
                })
              )}
              {showActions && (
                <Table.Th ta="end" w={actionsWidth} style={actionsHeaderStyle}>
                  {labels.actions}
                </Table.Th>
              )}
            </Table.Tr>
          )}
        </Table.Thead>
        <Table.Tbody ref={bodyRef} data-adapttable-part="tbody">
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
                <Table.Tr key={slot.key} aria-hidden>
                  <Table.Td
                    colSpan={slot.colSpan}
                    style={{ height: slot.height, padding: 0 }}
                  />
                </Table.Tr>
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
                index={wiring.index}
                id={wiring.id}
                columns={wiring.columns}
                bodyCells={wiring.bodyCells}
                spanSignature={wiring.spanSignature}
                getCellProps={table.getCellProps}
                getRowProps={table.getRowProps}
                gridFocus={wiring.gridFocus}
                selected={wiring.selected}
                selectLabel={labels.selectRow}
                onToggleSelect={wiring.onToggleSelect}
                expanded={wiring.expanded}
                expandLabel={labels.expandRow}
                collapseLabel={labels.collapseRow}
                onToggleExpand={wiring.onToggleExpand}
                renderRowDetail={props.renderRowDetail}
                columnSpan={wiring.columnSpan}
                columnSpacers={wiring.columnSpacers}
                rowActions={wiring.rowActions}
                rowActionsLayout={wiring.rowActionsLayout}
                cellSpanAppearance={wiring.cellSpanAppearance}
                renderRowActions={wiring.renderRowActions}
                confirm={wiring.confirm}
                cancelLabel={labels.cancel}
                editRowLabel={labels.editRow}
                saveRowLabel={labels.saveRow}
                editLabel={labels.editCell}
                undoLabel={labels.undoEdit}
                showReorder={wiring.showReorder}
                rowReorder={wiring.rowReorder}
                windowStart={wiring.windowStart}
                rowCount={wiring.rowCount}
                reorderPinned={wiring.reorderPinned}
                reorderSignature={wiring.reorderSignature}
                rowPinSide={wiring.rowPinSide}
                pinRowSticky={wiring.pinRowSticky}
                rowPinOffset={wiring.rowPinOffset}
                rowPinSignature={wiring.rowPinSignature}
                sourceIndex={wiring.sourceIndex}
                labels={wiring.labels}
                onRowClick={props.onRowClick}
                prefetch={props.prefetch}
                className={wiring.rowClass}
                rowVisualStyle={wiring.rowVisualStyle}
                rowStyleSignature={wiring.rowStyleSignature}
                measureElement={wiring.measureElement}
                measureRowPair={wiring.measureRowPair}
                pinStyleFor={bodyPinStyle}
                selectionCellStyle={selectionCellStyle}
                expansionCellStyle={expansionCellStyle}
                reorderCellStyle={reorderCellStyle}
                actionsCellStyle={actionsCellStyle}
                pinSignature={pinSignature}
                editing={wiring.editing}
                rows={wiring.rows}
                getRowId={wiring.getRowId}
                editingSignature={wiring.editingSignature}
                treeEntry={wiring.treeEntry}
                treeColumnKey={wiring.treeColumnKey}
                onToggleTree={wiring.onToggleTree}
              />
            );
          })}
        </Table.Tbody>
        {showColumnFooter && (
          <Table.Tfoot>
            <Table.Tr>
              {expandable && <Table.Td />}
              <When show={showReorder}>
                <Table.Td />
              </When>
              {selection && <Table.Td />}
              {columns.map((column) => (
                <Table.Td
                  key={column.key}
                  {...table.getCellProps(column)}
                  fw={600}
                  c="dimmed"
                >
                  {resolveColumnFooter(column, summaryCells?.[column.key])}
                </Table.Td>
              ))}
              {showActions && <Table.Td />}
            </Table.Tr>
          </Table.Tfoot>
        )}
      </Table>
    </div>
  );
}

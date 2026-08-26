import {
  ACTIONS_COLUMN_KEY,
  type CellSpanAppearance,
  type ColumnDef,
  columnHeaderController,
  columnResizeHandleProps,
  type ConfirmHandler,
  type EditableCellEditing,
  type FilterDef,
  filterDefForColumn,
  type FilterFormSource,
  type FilterTypeRegistry,
  type GridFocusState,
  type GroupCollapseState,
  type PinSide,
  REORDER_COLUMN_KEY,
  resolveColumnHeader,
  type RowAction,
  type RowActionsLayout,
  type RowActionsRenderer,
  type SortDirection,
  type SortLevel,
  type TableLabels,
  type TreeEntry,
} from "@adapttable/core";
import {
  type BodyCell,
  cellFlashAttr,
  cellHighlightStyle,
  cellsForRow,
  cellSpanMark,
  columnFlexShares,
  columnGroupHeaderCaption,
  columnSelectLabel,
  columnSizeStyle,
  EXTRA_OVER_SPAN_STYLE,
  EXTRA_ROW_PARTS,
  groupedHeaderAlign,
  groupedHeaderChildRule,
  groupedHeaderLabelStyle,
  type HeaderGroupCell,
  headerGroupRows,
  isColumnGroupSummaryKey,
  mergedCellStyle,
  REORDER_COLUMN_WIDTH,
  type RowReorderState,
} from "@adapttable/core/adapter";
import { type TableColumnsType, Typography } from "antd";
import type {
  CSSProperties,
  HTMLAttributes,
  KeyboardEvent,
  MouseEvent,
  ReactElement,
  ReactNode,
} from "react";

import { ColumnSelectCheckbox } from "./components/ColumnSelectCheckbox";
import { EditableDataCell } from "./components/EditableCell";
import { FillHandle } from "./components/FillHandle";
import {
  type AdaptTableGroupRow,
  type GroupedDataRecord,
  GroupHeaderCell,
  isAdaptTableExtraRow,
  isAdaptTableGroupRow,
} from "./components/grouping";
import {
  ColumnGroupToggle,
  FilterHeaderTrigger,
  RowEditActions,
  RowReorderHandle,
  TreeCell,
} from "./components/kitControls";
import { RowActionButtons } from "./components/RowActionButtons";

/**
 * Map a logical pin side to antd's native physical `fixed` value. antd mirrors
 * `fixed: "left"/"right"` under RTL itself (via `ConfigProvider` direction), so
 * `"start"` → `"left"` and `"end"` → `"right"` lands on the correct edge in
 * both writing directions.
 */
function antdFixed(side: PinSide | undefined): "left" | "right" | undefined {
  if (side === "start") return "left";
  if (side === "end") return "right";
  return undefined;
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

/**
 * Ant's sticky header is a separate fixed-layout table. A content-sized
 * sentinel width (for example `1`) collapses in that clone, wraps "Actions"
 * one character per line, and makes the whole header abnormally tall.
 */
export const ANTD_ACTIONS_COLUMN_WIDTH = 120;

/** Readable column label for the resize handle's accessible name. */
function columnLabel<TRow>(column: ColumnDef<TRow>): string {
  return typeof column.header === "string" ? column.header : column.key;
}

/** Logical (RTL-aware) text alignment for a column. */
export type LogicalTextAlign = "start" | "center" | "end";

export function logicalAlign(
  align: ColumnDef<unknown>["align"]
): LogicalTextAlign {
  if (align === "center") return "center";
  if (align === "end") return "end";
  return "start";
}

/** antd cell/header props applying logical alignment. */
function cellStyle(align: ColumnDef<unknown>["align"]): {
  style: { textAlign: LogicalTextAlign };
} {
  return { style: { textAlign: logicalAlign(align) } };
}

/** Map our sort state onto antd's `sortOrder` for a column. */
function sortOrderFor(
  columnKey: string,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascend" | "descend" | null {
  if (sortBy !== columnKey) return null;
  return sortDir === "desc" ? "descend" : "ascend";
}

/** `aria-sort` for a sortable header — antd's `<Table>` doesn't emit it. */
function ariaSortFor(
  columnKey: string,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined
): "ascending" | "descending" | "none" {
  if (sortBy !== columnKey) return "none";
  return sortDir === "desc" ? "descending" : "ascending";
}

/** The column's direction within the multi-sort chain, if it has one. */
function chainDir(
  sortLevels: readonly SortLevel[],
  key: string
): SortDirection | undefined {
  return sortLevels.find((level) => level.key === key)?.dir;
}

/** 1-based chain position for the header badge, or `undefined`. */
function chainIndex(
  sortLevels: readonly SortLevel[],
  key: string
): number | undefined {
  const index = sortLevels.findIndex((level) => level.key === key);
  return index === -1 ? undefined : index + 1;
}

/**
 * The visible 1-based chain badge for a multi-sorted header (the rendered
 * counterpart of the `data-sort-index` attribute core's headless headers
 * expose). Presentational only — `aria-sort` + `data-sort-index` on the
 * header cell carry the machine-readable state.
 */
function SortIndexBadge({ index }: Readonly<{ index: number | undefined }>) {
  if (index === undefined) return null;
  return (
    <Typography.Text
      aria-hidden="true"
      style={{
        fontSize: "0.75em",
        verticalAlign: "super",
        marginInlineStart: 4,
      }}
    >
      {index}
    </Typography.Text>
  );
}

/** Header-cell props: HTML attributes plus the shared sort-badge data hook. */
interface HeaderCellProps extends HTMLAttributes<HTMLElement> {
  "data-sort-index"?: number;
}

/**
 * Per-header-cell props: logical alignment, `aria-sort` (chain-aware), the
 * `data-sort-index` badge hook, and — when multi-sort is on — the
 * shift-click interceptor.
 *
 * antd-specific multi-sort approach: antd renders its own header cells and
 * composes its sort trigger IN FRONT of any user `onClick` returned from
 * `onHeaderCell`, so a bubble-phase handler can never veto the built-in
 * single-sort. Shift-clicks are therefore intercepted in the CAPTURE phase:
 * `stopPropagation()` there keeps the native event from ever reaching antd's
 * bubble listener, so shift-click feeds OUR sort chain
 * (`source.toggleSortLevel`) while a plain click still drives antd's native
 * single-sort UI (reported back through `onChange`).
 */
function headerCellProps<TRow>(
  column: ColumnDef<TRow>,
  sortBy: string | undefined,
  sortDir: SortDirection | undefined,
  sortIndex: number | undefined,
  hasResizeHandle: boolean,
  isPinned: boolean,
  onToggleSortLevel: ((key: string) => void) | undefined
): HeaderCellProps {
  const style: CSSProperties = { textAlign: logicalAlign(column.align) };
  // The absolute resize handle needs a positioning context — but only set
  // `position: relative` when the column is NOT pinned. A pinned column gets
  // `position: sticky` from antd's native fixed-column styling (itself a
  // positioning context); forcing `relative` here would override that sticky,
  // so a left-pinned column would scroll away instead of sticking.
  if (hasResizeHandle && !isPinned) style.position = "relative";
  if (!column.sortable) return { style };
  const props: HeaderCellProps = {
    style,
    "aria-sort": ariaSortFor(column.key, sortBy, sortDir),
    "data-sort-index": sortIndex,
  };
  if (onToggleSortLevel) {
    props.onClickCapture = (event: MouseEvent<HTMLElement>) => {
      if (!event.shiftKey) return;
      event.stopPropagation();
      onToggleSortLevel(column.key);
    };
    // Keyboard parity for the shift-click chain: Shift+Enter on the
    // focused header toggles the column's multi-sort level (plain Enter
    // stays antd's single sort).
    props.onKeyDownCapture = (event: KeyboardEvent<HTMLElement>) => {
      if (!event.shiftKey || event.key !== "Enter") return;
      event.stopPropagation();
      event.preventDefault();
      onToggleSortLevel(column.key);
    };
  }
  return props;
}

/** Title for one antd group parent — label plus an optional collapse toggle. */
function groupTitle(
  cell: HeaderGroupCell,
  labels: Required<TableLabels>,
  onToggle?: (id: string) => void
): ReactElement {
  return (
    <span style={groupedHeaderLabelStyle()}>
      {onToggle ? (
        <ColumnGroupToggle cell={cell} labels={labels} onToggle={onToggle} />
      ) : null}
      {columnGroupHeaderCaption(cell)}
    </span>
  );
}

/**
 * Walk one depth of {@link headerGroupRows} into antd parent columns.
 * Gap cells flatten; labelled cells nest their next depth (or the leaves).
 */
function nestGroupLevel<TRow>(
  rows: HeaderGroupCell[][],
  leaves: TableColumnsType<TRow>,
  depth: number,
  start: number,
  end: number,
  titleFor: (cell: HeaderGroupCell) => ReactNode
): TableColumnsType<TRow> {
  if (depth >= rows.length) return leaves.slice(start, end);
  const row = rows[depth]!;
  const out: TableColumnsType<TRow> = [];
  let col = 0;
  for (const cell of row) {
    const cellStart = col;
    const cellEnd = col + cell.span;
    col = cellEnd;
    if (cellEnd <= start || cellStart >= end) continue;
    // Clamp to the parent's range. A deeper row merges adjacent unlabelled
    // cells across the boundaries above it — one gap can span several parents
    // — so descending on the cell's own range would hand every one of those
    // parents the whole span, and the leaves inside it would render once per
    // parent.
    const children = nestGroupLevel(
      rows,
      leaves,
      depth + 1,
      Math.max(cellStart, start),
      Math.min(cellEnd, end),
      titleFor
    );
    if (cell.label === null) {
      out.push(...children);
      continue;
    }
    // A collapsedRender / stub group has no child header to show — flatten
    // so antd rowspans the title like an ungrouped leaf.
    if (
      children.length > 0 &&
      children.every((child) =>
        isColumnGroupSummaryKey(String(child.key ?? ""))
      )
    ) {
      const leaf = children[0];
      if (leaf) out.push({ ...leaf, title: titleFor(cell) });
      continue;
    }
    out.push({
      key: cell.key,
      title: titleFor(cell),
      children,
      onHeaderCell: () => ({
        "data-adapttable-part": "header-group-cell",
        style: {
          textAlign: groupedHeaderAlign(cell.align),
          ...groupedHeaderChildRule(
            "var(--ant-color-split, rgba(5, 5, 5, 0.06))"
          ),
        },
      }),
    });
  }
  return out;
}

/**
 * Fold contiguous same-`group` leaves into antd's NATIVE grouped columns.
 * Core's `headerGroupRows` owns the ordering rules (adjacency-based, a
 * reorder splits the group), so the antd column tree always mirrors the
 * shared group-row model: labelled cells become parent columns with
 * `children`, unlabelled gap cells leave their leaves at the top level.
 */
function groupColumns<TRow>(
  columns: readonly ColumnDef<TRow>[],
  leaves: TableColumnsType<TRow>,
  labels: Required<TableLabels>,
  collapsedIds: readonly string[] = [],
  collapsible = false,
  onToggle?: (id: string) => void,
  groups?: ReadonlyMap<string, { readonly align?: "start" | "center" | "end" }>
): TableColumnsType<TRow> {
  const rows = headerGroupRows(columns, collapsedIds, collapsible, groups);
  if (!rows) return leaves;
  return nestGroupLevel(rows, leaves, 0, 0, leaves.length, (cell) =>
    groupTitle(cell, labels, onToggle)
  );
}

/** Opt-in grouping chrome passed into {@link buildColumns} when armed. */
export interface BuildColumnsGrouping {
  collapsed: GroupCollapseState;
  /** Number of leaf data columns (for group-header colSpan). */
  dataColumnCount: number;
  /** Reveal the next page of groups, or of one group's rows. */
  showMore?: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
}

/** Options for {@link buildColumns}. */
/**
 * What a cell needs to draw the tree: which column carries the chevron, the
 * entry behind a given row, and how to open it. antd flattens the hierarchy
 * into its own `dataSource`, so the row is the only handle a cell has.
 */
export interface BuildColumnsTree<TRow> {
  /** The column that renders the chevron and the indent. */
  columnKey?: string;
  /** This row's place in the tree, if it is in one. */
  entryFor: (row: TRow) => TreeEntry<TRow> | undefined;
  /** Open or close a node. */
  toggle: (id: string) => void;
}

export interface BuildColumnsOptions<TRow> {
  /** Hierarchy, when the host declared one. */
  tree?: BuildColumnsTree<TRow>;
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  columns: readonly ColumnDef<TRow>[];
  rowActions?: readonly RowAction<TRow>[];
  rowActionsLayout?: RowActionsLayout;
  renderRowActions?: RowActionsRenderer<TRow>;
  sortBy: string | undefined;
  sortDir: SortDirection | undefined;
  confirm: ConfirmHandler;
  labels: Required<TableLabels>;
  /** Opt-in editing bundle — omit and cells stay display-only. */
  editing?: EditableCellEditing<TRow>;
  /** Current page rows (Tab advance); required when editing is set. */
  rows?: readonly TRow[];
  getRowId?: (row: TRow) => string;
  /** Per-column edge pinning (logical start/end), mapped to antd's native
   *  physical `fixed` via {@link antdFixed}. */
  pinned?: Readonly<Record<string, PinSide>>;
  /** Layout width mutator; enables a resize handle when provided. */
  setWidth?: (key: string, width: number) => void;
  /** Per-column pixel widths from the layout state. */
  columnWidths?: Readonly<Record<string, number>>;
  /** Accessible label prefix for the resize handle. */
  resizeLabel?: string;
  /** The active multi-sort chain (drives badges + chain-aware sort state). */
  sortLevels?: readonly SortLevel[];
  /** Shift-click chain toggler; provided only when `multiSort` is on. */
  onToggleSortLevel?: (key: string) => void;
  /**
   * When set, column cells detect synthetic group rows and render a spanning
   * group header (or per-column aggregates). Omit and grouping stays dormant.
   */
  grouping?: BuildColumnsGrouping;
  /** Whether the table fits its container rather than overflowing it. */
  fitColumns?: boolean;
  /** Headless row-reorder; omit and no reorder column is injected. */
  rowReorder?: RowReorderState<TRow>;
  /** Dataset offset of the first rendered row (page / virtual window). */
  windowStart?: number;
  /** Per-row body cells so `onCell` can apply col/row spans. */
  cellsByRow?: ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /** Spreadsheet merge paint; omit / `"merged"` is the default look. */
  cellSpanAppearance?: CellSpanAppearance;
  /** When true, group parents render a collapse toggle. */
  collapsibleColumnGroups?: boolean;
  /** Collapsed column-group ids from the layout. */
  collapsedColumnGroups?: readonly string[];
  /** Tree groups for the declared columns — header align lives here. */
  columnGroups?: ReadonlyMap<
    string,
    { readonly align?: "start" | "center" | "end" }
  >;
  /** Toggle one column group. No-op unless collapse is armed. */
  onToggleColumnGroup?: (id: string) => void;
  /**
   * Compact filter under the caption. antd keeps it in the header cell
   * so `fixed` columns stay on antd's own header.
   */
  headerFilters?: boolean;
  filterDefs?: readonly FilterDef<TRow>[];
  filterSource?: FilterFormSource<TRow>;
  /** Type registry so a custom `filterTypes` entry can render in the header. */
  filterRegistry?: FilterTypeRegistry;
  closeHeaderFilterOnSelect?: boolean;
  /**
   * Mark cells a patch just changed — `data-flash` on the cell. Omit and
   * nothing is marked.
   */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
}

/**
 * Translate AdaptTable {@link ColumnDef}s into antd's `columns` config,
 * wiring sort order, logical alignment, custom `Cell` renderers, and an
 * optional trailing actions column. antd's `<Table>` then drives the header
 * sort carets and (via the parent's `onChange`) reports clicks back.
 *
 * @typeParam TRow - The row type.
 * @returns The antd column definitions.
 */
/** Whether a group header should span every data column (no aggregates). */
function groupSpansAll(group: AdaptTableGroupRow): boolean {
  const cells = group.aggregateCells;
  if (!cells) return true;
  return Object.keys(cells).length === 0;
}

/** Cell props for a data column when grouping may produce synthetic rows. */
function groupedOnCell<TRow>(
  columnKey: string,
  columnIndex: number,
  align: ColumnDef<unknown>["align"],
  grouping: BuildColumnsGrouping | undefined,
  record: GroupedDataRecord<TRow>,
  rowIndex?: number,
  gridFocus?: GridFocusState
): Record<string, unknown> {
  // Focus props first: antd merges whatever this returns onto the <td>, so
  // this is the one place per-cell attributes exist in this adapter.
  const focus =
    gridFocus && rowIndex !== undefined && !isAdaptTableGroupRow(record)
      ? gridFocus.getCellPropsAt(rowIndex, columnIndex)
      : {};
  // antd's own active-item fill for a selected cell, from its design token so
  // it follows the theme and dark algorithm rather than a hard-coded colour —
  // and core's amber for a find hit, which is a browser convention rather than
  // a kit's choice.
  const styled = cellStyle(align);
  const highlighted = cellHighlightStyle(focus, styled.style, {
    background: "var(--ant-control-item-bg-active, rgba(0, 0, 0, 0.06))",
  });
  const base = {
    ...styled,
    ...focus,
    // Which column this cell belongs to — what auto-sizing measures by.
    "data-column-key": columnKey,
    ...(highlighted ? { style: highlighted } : {}),
  };
  if (!grouping || !isAdaptTableGroupRow(record)) return base;
  if (groupSpansAll(record)) {
    if (columnIndex === 0) {
      return { ...base, colSpan: grouping.dataColumnCount };
    }
    return { ...base, colSpan: 0 };
  }
  return base;
}

/** Normalize optional aggregate content to a ReactNode (never bare `false`). */
function aggregateCellContent(value: ReactNode | undefined): ReactNode {
  if (value == null || value === false) return null;
  return value;
}

/** Render group-header cell content for a data column. */
function renderGroupDataCell<TRow>(
  column: ColumnDef<TRow>,
  columnIndex: number,
  record: AdaptTableGroupRow,
  options: {
    labels: Required<TableLabels>;
    grouping?: BuildColumnsGrouping;
  }
): ReactNode {
  let content: ReactNode = null;
  if (groupSpansAll(record)) {
    if (columnIndex === 0) {
      content = (
        <GroupHeaderCell
          group={record}
          labels={options.labels}
          onToggle={() => options.grouping?.collapsed.toggle(record.key)}
          onShowMore={options.grouping?.showMore}
        />
      );
    }
  } else if (columnIndex === 0) {
    content = (
      <GroupHeaderCell
        group={record}
        labels={options.labels}
        onToggle={() => options.grouping?.collapsed.toggle(record.key)}
        onShowMore={options.grouping?.showMore}
        aggregate={record.aggregateCells?.[column.key]}
      />
    );
  } else {
    content = aggregateCellContent(record.aggregateCells?.[column.key]);
  }
  return content;
}

/** Render a normal editable leaf cell. */
function renderLeafDataCell<TRow>(
  column: ColumnDef<TRow>,
  record: TRow,
  index: number,
  options: {
    editing?: EditableCellEditing<TRow>;
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    labels: Required<TableLabels>;
    gridFocus?: GridFocusState;
    tree?: BuildColumnsTree<TRow>;
  },
  columnIndex: number
): ReactNode {
  return (
    <>
      <TreeCell
        entry={options.tree?.entryFor(record)}
        columnKey={column.key}
        treeColumnKey={options.tree?.columnKey}
        labels={options.labels}
        onToggle={options.tree?.toggle}
      >
        <EditableDataCell
          editing={options.editing}
          row={record}
          column={column}
          rowId={options.getRowId(record)}
          rowIndex={index}
          rows={options.rows}
          columns={options.columns}
          rowKey={options.getRowId}
          editLabel={options.labels.editCell}
          undoLabel={options.labels.undoEdit}
        />
      </TreeCell>
      <FillHandle
        focus={options.gridFocus}
        windowIndex={index}
        col={columnIndex}
      />
    </>
  );
}

/** Render a group header or a normal editable leaf cell. */
function renderDataCell<TRow>(
  column: ColumnDef<TRow>,
  columnIndex: number,
  record: GroupedDataRecord<TRow>,
  index: number,
  options: {
    editing?: EditableCellEditing<TRow>;
    rows: readonly TRow[];
    columns: readonly ColumnDef<TRow>[];
    getRowId: (row: TRow) => string;
    labels: Required<TableLabels>;
    grouping?: BuildColumnsGrouping;
    gridFocus?: GridFocusState;
    tree?: BuildColumnsTree<TRow>;
  }
): ReactNode {
  if (isAdaptTableExtraRow(record)) {
    return record.extraKind === "fullWidth" ? record.render?.() : null;
  }
  if (isAdaptTableGroupRow(record)) {
    return renderGroupDataCell(column, columnIndex, record, options);
  }
  return renderLeafDataCell(column, record, index, options, columnIndex);
}

export function buildColumns<TRow>({
  gridFocus,
  columns,
  rowActions,
  rowActionsLayout,
  renderRowActions,
  sortBy,
  sortDir,
  confirm,
  labels,
  editing,
  rows = [],
  getRowId = () => "",
  pinned,
  setWidth,
  columnWidths,
  resizeLabel = "Resize column",
  sortLevels = [],
  onToggleSortLevel,
  grouping,
  fitColumns,
  tree,
  rowReorder,
  windowStart = 0,
  cellsByRow,
  cellSpanAppearance,
  collapsibleColumnGroups,
  collapsedColumnGroups,
  columnGroups,
  onToggleColumnGroup,
  headerFilters,
  filterDefs,
  filterSource,
  filterRegistry,
  closeHeaderFilterOnSelect,
  isCellFlashing,
}: BuildColumnsOptions<TRow>): TableColumnsType<GroupedDataRecord<TRow>> {
  const cellOpts = {
    editing,
    rows,
    columns,
    getRowId,
    labels,
    grouping,
    gridFocus,
    tree,
  };
  // Each flexible column's share, from the same rule every other kit uses.
  const flexShares = columnFlexShares({
    columns,
    fitColumns,
    widths: columnWidths,
  });

  const leaves: TableColumnsType<GroupedDataRecord<TRow>> = columns.map(
    (column, columnIndex) => {
      // An active chain level supersedes the single sort for this column's
      // caret and `aria-sort`, mirroring core's headless header cells.
      const dir = chainDir(sortLevels, column.key);
      const effectiveSortBy = dir ? column.key : sortBy;
      const effectiveSortDir = dir ?? sortDir;
      const sortIndex = chainIndex(sortLevels, column.key);
      const headerDef =
        headerFilters && filterSource
          ? filterDefForColumn(filterDefs ?? [], column.key)
          : undefined;
      return {
        key: column.key,
        // A real element (not a Fragment): antd v6 attaches a `ref` to the
        // column title to measure it, which logs "ref on React.Fragment" in
        // dev. The wrapper takes the ref; the absolute resize handle still
        // anchors to the (positioned) header cell, so the layout is unchanged.
        title: (
          <span title={column.headerTooltip}>
            {resolveColumnHeader(
              column,
              columnHeaderController(column, {
                sortDir: effectiveSortDir,
                sortIndex:
                  typeof sortIndex === "number" ? sortIndex : undefined,
              })
            )}
            {gridFocus?.columnCheckbox === true ? (
              <ColumnSelectCheckbox
                label={columnSelectLabel(labels.selectColumn, column)}
                checked={gridFocus.isColumnSelected(columnIndex)}
                onToggle={() => gridFocus.toggleColumn(columnIndex)}
              />
            ) : null}
            {column.headerActions ? (
              <span data-adapttable-part="header-actions">
                {column.headerActions}
              </span>
            ) : null}
            <SortIndexBadge index={sortIndex} />
            {setWidth && (
              <span
                {...columnResizeHandleProps(
                  column.key,
                  setWidth,
                  `${resizeLabel}: ${columnLabel(column)}`
                )}
                style={RESIZE_HANDLE_STYLE}
              />
            )}
            {headerDef && filterSource ? (
              <FilterHeaderTrigger
                def={headerDef}
                source={filterSource}
                labels={labels}
                registry={filterRegistry}
                closeOnSelect={closeHeaderFilterOnSelect}
              />
            ) : null}
          </span>
        ),
        width: columnWidths?.[column.key] ?? column.width,
        // Bounds and flex shares reach antd through the header cell's style,
        // which is the one place this adapter can put per-column CSS.
        fixed: antdFixed(pinned?.[column.key]),
        sorter: column.sortable ? true : undefined,
        sortOrder: column.sortable
          ? sortOrderFor(column.key, effectiveSortBy, effectiveSortDir)
          : undefined,
        showSorterTooltip: false,
        onCell: (record: GroupedDataRecord<TRow>, rowIndex?: number) => {
          if (isAdaptTableExtraRow(record)) {
            if (columnIndex === 0) {
              return {
                colSpan: grouping?.dataColumnCount ?? columns.length,
                "data-adapttable-part": EXTRA_ROW_PARTS[record.extraKind].cell,
                role:
                  record.extraKind === "separator" ? "separator" : undefined,
                "aria-label":
                  record.extraKind === "separator"
                    ? labels.rowSeparator
                    : undefined,
                style: EXTRA_OVER_SPAN_STYLE,
              };
            }
            return { colSpan: 0 };
          }
          const grouped = groupedOnCell(
            column.key,
            columnIndex,
            column.align,
            grouping,
            record,
            rowIndex,
            gridFocus
          );
          if (isAdaptTableGroupRow(record) || !cellsByRow) return grouped;
          const cells = cellsForRow(cellsByRow, getRowId(record));
          const cell = cells.find((c) => c.column.key === column.key);
          if (!cell) return { colSpan: 0 };
          const mark = cellSpanMark(cell.colSpan, cell.rowSpan);
          const spanPaint = mergedCellStyle(
            cell.colSpan,
            cell.rowSpan,
            cellSpanAppearance
          );
          const focus =
            gridFocus && rowIndex !== undefined
              ? gridFocus.getCellPropsAt(rowIndex, columnIndex)
              : {};
          return {
            ...grouped,
            colSpan: cell.colSpan,
            rowSpan: cell.rowSpan,
            "data-adapttable-part": "cell",
            "data-column-key": column.key,
            "data-flash": cellFlashAttr(
              isCellFlashing,
              getRowId(record),
              column.key
            ),
            ...(mark ? { "data-cell-span": mark } : {}),
            style: cellHighlightStyle(
              focus,
              { ...cellStyle(column.align).style, ...spanPaint },
              {
                background:
                  "var(--ant-control-item-bg-active, rgba(0, 0, 0, 0.06))",
              }
            ),
          };
        },
        onHeaderCell: () => {
          // Column selection rides along with the sort/resize/pin props: antd
          // merges whatever this returns onto the <th>, so this is the one
          // place a header attribute can exist in this adapter.
          const head = headerCellProps(
            column,
            effectiveSortBy,
            effectiveSortDir,
            sortIndex,
            Boolean(setWidth),
            pinned?.[column.key] != null,
            onToggleSortLevel
          );
          return {
            "data-adapttable-part": "header-cell",
            "data-column-key": column.key,
            ...gridFocus?.getColumnHeaderProps(columnIndex, {
              sortable: column.sortable,
            }),
            ...head,
            // The sizing merges INTO whatever style the header already has,
            // rather than being overwritten by it.
            style: {
              ...head.style,
              ...columnSizeStyle(
                column,
                flexShares,
                columnWidths?.[column.key]
              ),
            },
          };
        },
        render: (
          _value: unknown,
          record: GroupedDataRecord<TRow>,
          index: number
        ) => renderDataCell(column, columnIndex, record, index, cellOpts),
      };
    }
  );
  const cols = groupColumns(
    columns,
    leaves as TableColumnsType<TRow>,
    labels,
    collapsedColumnGroups,
    collapsibleColumnGroups,
    onToggleColumnGroup,
    columnGroups
  ) as TableColumnsType<GroupedDataRecord<TRow>>;

  if (rowReorder) {
    const reorderFixed =
      pinned?.[REORDER_COLUMN_KEY] === "start" ||
      columns.some((column) => pinned?.[column.key] === "start");
    cols.unshift({
      key: "__reorder__",
      // Empty like the other kits: the header is a grip slot, named by
      // aria-label. Visible "Reorder row" text collided with the Columns
      // menu row of the same name.
      title: "",
      width: REORDER_COLUMN_WIDTH,
      fixed: reorderFixed ? "left" : undefined,
      onCell: (record: GroupedDataRecord<TRow>) => {
        if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) {
          return { colSpan: 0 };
        }
        return {};
      },
      onHeaderCell: () => ({
        "data-adapttable-part": "reorder-header",
        "aria-label": labels.reorderRow,
      }),
      render: (
        _value: unknown,
        record: GroupedDataRecord<TRow>,
        index: number
      ) => {
        if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) {
          return null;
        }
        const row = record;
        const id = getRowId(row);
        return (
          <span data-adapttable-part="reorder-cell">
            <RowReorderHandle
              reorder={rowReorder}
              labels={labels}
              rowId={id}
              localIndex={index}
              row={row}
              windowStart={windowStart}
              rowCount={rows.length}
            />
          </span>
        );
      },
    });
  }

  // The trailing control column also carries row mode's save / cancel, so it
  // exists when either is armed.
  const rowMode = editing?.rowEditing;
  if ((rowActions && rowActions.length > 0) || rowMode) {
    // The actions column rides antd's `fixed: "right"` when the user pins it
    // from the Columns menu (its reserved layout key, one click, no data pins
    // required) — OR'd with any end-pinned data column, which drags it
    // along so antd's right-fixed run stays contiguous through the trailing
    // edge.
    const actionsFixed =
      pinned?.[ACTIONS_COLUMN_KEY] === "end" ||
      columns.some((column) => pinned?.[column.key] === "end");
    cols.push({
      key: "__actions__",
      title: labels.actions,
      width: ANTD_ACTIONS_COLUMN_WIDTH,
      fixed: actionsFixed ? "right" : undefined,
      onCell: (record: GroupedDataRecord<TRow>) => {
        if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) {
          return { colSpan: 0 };
        }
        return cellStyle("end");
      },
      onHeaderCell: () => cellStyle("end"),
      render: (_value: unknown, record: GroupedDataRecord<TRow>) => {
        if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) {
          return null;
        }
        const row = record;
        return (
          <div style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}>
            {rowMode && (
              <RowEditActions
                rowEditing={rowMode}
                row={row}
                rowId={getRowId(row)}
                labels={labels}
              />
            )}
            {(rowActions ?? []).length > 0 && (
              <RowActionButtons
                row={row}
                actions={rowActions ?? []}
                confirm={confirm}
                labels={labels}
                layout={rowActionsLayout}
                render={renderRowActions}
              />
            )}
          </div>
        );
      },
    });
  }

  return cols;
}

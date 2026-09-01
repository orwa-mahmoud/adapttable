import {
  asGesture,
  autoSizeColumns as autoSizeAllColumns,
  cellFillHandler,
  cellPasteHandler,
  type ColumnDef,
  columnsHaveFooter,
  type ConfirmHandler,
  type EditHistoryState,
  type FilterRuntime,
  type GridFocusState,
  type GroupByInput,
  type GroupCollapseState,
  type GroupedFlatEntry,
  isDeclarativeFilters,
  makeExportCsvHandler,
  pageSizeOptions,
  partitionPinnedRows,
  resolveColumnFooter,
  resolveExportCsv,
  resolveFilterMode,
  resolveLabels,
  type RowExpansionState,
  type RowPinningState,
  type RowPinSide,
  type RowPinState,
  type SelectionState,
  selectionStats,
  showSimpleFilterFields,
  type TableErrorState,
  type TableLabels,
  tableMinWidth,
  type TableSource,
  toolbarShowsFilters,
  type TreeEntry,
  type UrlStateAdapter,
  useChromeScrollReset,
  type UseColumnLayoutResult,
  type UseDataTableResult,
  useFilterTriggerToggle,
  useFindFocus,
  useFindInTable,
  useGridFocus,
  useInfiniteScroll,
  useRowPinningUrlState,
  type UseSavedViewsOptions,
  useTableChrome,
  useTableData,
  useTableEditHistory,
  type VirtualTableRow,
  windowGroupedEntries,
} from "@adapttable/core";
import {
  ACTIVE_FILTER_CHIPS,
  BATCH_EDIT_BAR,
  bindFeatureHostFn,
  bodyCellsHaveRowSpan,
  BULK_BAR,
  ChromeExtrasGate,
  COLUMN_MENU,
  type ColumnMenuSlotProps,
  COMMAND_PALETTE_LIVE,
  type ContextMenuLiveSlotProps,
  DEFAULT_CARD_SIZE_PX,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_ROW_PARTS,
  featureHostOf,
  FeatureHostProvider,
  type FeatureProps,
  FeatureProviders,
  FeatureSlot,
  fillSlot,
  FILTER_DRAWER,
  FILTERS_FORM,
  type FiltersFormSlotProps,
  FIND_BAR,
  flattenColumnTree,
  GRID_FOCUS_ANNOUNCER,
  insertExtraRows,
  isExtraEntry,
  KEYED_WINDOW,
  type KeyedVirtualization,
  type KeyedWindowSlotProps,
  mobileCardListStyle,
  pinnedRowPart,
  pinnedRowStickyStyle,
  printToolbar,
  rememberFeatureHost,
  REORDER_COLUMN_WIDTH,
  resolveRowStyle,
  resolveStickyToolbar,
  ROW_REORDER_ANNOUNCER,
  rowClickProps,
  rowIsDirty,
  rowReorderDropStyle,
  type RowReorderState,
  SAVED_VIEWS,
  SIDE_PANEL,
  STATUS_BAR,
  tableRenderModel,
  TableStatusAnnouncer,
  undoRedoToolbar,
  useExportHandler,
  useFeatureSlotFilled,
  useFullscreen,
  useMountStagger,
  useOffsetHeight,
  useResolvedAdapter,
  useStickyToolbarLayout,
  useTableFeatures,
  useTableStatusAnnouncement,
  viewControlsToolbar,
} from "@adapttable/core/adapter";
import {
  Button,
  Checkbox,
  Empty,
  Flex,
  Pagination,
  Select,
  Space,
  Table,
  type TableProps,
  Typography,
} from "antd";
import {
  cloneElement,
  type CSSProperties,
  type HTMLAttributes,
  isValidElement,
  type ReactElement,
  type ReactNode,
  type Ref,
  type UIEventHandler,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  ANTD_ACTIONS_COLUMN_WIDTH,
  buildColumns,
  logicalAlign,
} from "./columns";
import { ErrorState } from "./components/ErrorState";
import { OptionalExpandToggle } from "./components/featureSlots";
import {
  ADAPTTABLE_EXTRA,
  buildGroupedDataSource,
  type GroupedDataRecord,
  groupedRowKey,
  GroupSelectionCheckbox,
  isAdaptTableExtraRow,
  isAdaptTableGroupRow,
} from "./components/grouping";
import { MobileCards } from "./components/MobileCards";
import { SkeletonTable } from "./components/SkeletonTable";
import { Toolbar } from "./components/Toolbar";
import { ContextMenuLiveGate, OptionalSidePanel } from "./featureRoot";
import type { DataTableProps } from "./types";

/**
 * antd renders virtual rows inside its own fixed-height scroll container, so
 * the page-level infinite-scroll sentinel never reaches the viewport. This
 * pages in the next slice when that internal scroll nears its end instead.
 */
function virtualScrollEndHandler<TRow>(
  source: TableSource<TRow>,
  active: boolean
): UIEventHandler<HTMLElement> {
  return (event) => {
    if (!active) return;
    const el = event.currentTarget;
    if (
      source.hasNextPage &&
      !source.isFetchingNextPage &&
      el.scrollHeight - el.scrollTop - el.clientHeight <= 80
    ) {
      source.fetchNextPage();
    }
  };
}

/**
 * Adapt the shared `(row, index) => string | undefined` contract to antd's
 * `rowClassName`, which expects a string for every row. Group header rows
 * get a stable class and skip the host callback (they are not leaf rows).
 */
function buildRowClassName<TRow>(
  rowClassName: ((row: TRow, index: number) => string | undefined) | undefined
): (record: GroupedDataRecord<TRow>, index: number) => string {
  return (record, index) => {
    if (isAdaptTableExtraRow(record)) return "adapttable-extra-row";
    if (isAdaptTableGroupRow(record)) return "adapttable-group-row";
    return rowClassName?.(record, index) ?? "";
  };
}

/**
 * Variant-aware empty state: `"noResults"` (zero rows under an active
 * search/filter) names the cause and offers a clear-filters CTA;
 * `"noData"` stays the plain antd `Empty`.
 */
function EmptyState({
  variant,
  labels,
  onClearFilters,
}: Readonly<{
  variant: "noData" | "noResults";
  labels: Required<TableLabels>;
  onClearFilters: () => void;
}>) {
  if (variant === "noData") return <Empty description={labels.noData} />;
  return (
    <Empty description={labels.noResults}>
      <Button onClick={onClearFilters}>{labels.clearAll}</Button>
    </Empty>
  );
}

/** Map antd's `onChange` sort event back onto the source's sort state. */
function sortChangeHandler<TRow>(
  source: TableSource<TRow>
): NonNullable<TableProps<TRow>["onChange"]> {
  // Sorting is the only antd-internal feature left wired (pagination is the
  // split footer, filtering is ours), so every onChange IS a sort event.
  return (_pagination, _filters, sorter) => {
    // antd passes an array only under multi-column sort, which buildColumns
    // never enables — flat() folds both shapes without a dead branch.
    const next = [sorter].flat()[0];
    const key =
      typeof next?.columnKey === "string" ? next.columnKey : undefined;
    if (!key || !next?.order) {
      source.setSort(undefined);
      return;
    }
    source.setSort(key, next.order === "descend" ? "desc" : "asc");
  };
}

/** Summed min-width of fixed-width columns, plus the selection/actions cols. */
function antdMinWidth<TRow>(
  columns: readonly ColumnDef<TRow>[],
  widths: Readonly<Record<string, number>>,
  hasSelection: boolean,
  hasActions: boolean,
  hasReorder: boolean
): number {
  return tableMinWidth(columns, {
    widths,
    extra:
      (hasSelection ? 48 : 0) +
      (hasActions ? ANTD_ACTIONS_COLUMN_WIDTH : 0) +
      (hasReorder ? REORDER_COLUMN_WIDTH : 0),
  });
}

// antd's virtual table requires explicit x/y; these bound the scroller
// when neither maxHeight nor a measured column width supplies one.
const VIRTUAL_FALLBACK_HEIGHT = 480;
const VIRTUAL_FALLBACK_WIDTH = 960;

/** antd scroll config: virtual sizing, else x for pinning + y for the box. */
function resolveScroll(
  virtualize: boolean,
  hasPinned: boolean,
  maxHeight: number | undefined,
  minWidth: number
): NonNullable<TableProps<unknown>["scroll"]> {
  // Virtual rows need explicit x/y so antd can size its internal scroller —
  // the shared maxHeight model bounds the box, content width drives x.
  if (virtualize) {
    return {
      x: minWidth > 0 ? minWidth : VIRTUAL_FALLBACK_WIDTH,
      y: maxHeight ?? VIRTUAL_FALLBACK_HEIGHT,
    };
  }
  // Pinning needs content-driven width; otherwise a fixed-width column set
  // gets its summed min-width so the table scrolls instead of squishing.
  let x: number | "max-content" | undefined;
  if (hasPinned) x = "max-content";
  else if (minWidth > 0) x = minWidth;
  return { x, y: maxHeight };
}

/**
 * antd owns a single tbody, so pin chrome lives on the row: sticky style,
 * `data-row-pin`, and the section marker tests query via `part(...)`.
 */
type AntdRowHtmlAttrs = HTMLAttributes<HTMLElement> & {
  "data-row-pin"?: RowPinSide;
  "data-adapttable-part"?: string;
  "data-row-id"?: string;
  "data-stagger"?: string;
  "data-dirty"?: string;
  "data-collapsed"?: string;
};

function antdPinnedRowAttrs(
  pinSide: RowPinSide | undefined,
  headerOffset: number,
  sticky: boolean
): AntdRowHtmlAttrs {
  if (!pinSide) return {};
  return {
    ...(sticky ? { style: pinnedRowStickyStyle(pinSide, headerOffset) } : {}),
    "data-row-pin": pinSide,
    "data-adapttable-part": pinnedRowPart(pinSide),
  };
}

function antdOnRow<TRow>(options: {
  record: GroupedDataRecord<TRow>;
  rowIndex: number | undefined;
  getRowId: (row: TRow) => string;
  rowPinning: RowPinningState<TRow> | undefined;
  headerOffset: number;
  /** Sticky pin chrome — off when a cell span would overlay the next rows. */
  pinRowSticky: boolean;
  rowReorder: RowReorderState<TRow> | undefined;
  windowStart: number;
  gridFocus: GridFocusState | undefined;
  onRowClick: DataTableProps<TRow>["onRowClick"];
  editing: NonNullable<ReturnType<typeof useTableChrome<TRow>>>["editing"];
  prefetch: DataTableProps<TRow>["prefetch"];
  rowStyle: ComposedProps<TRow>["rowStyle"];
  rowHeight: ComposedProps<TRow>["rowHeight"];
}): AntdRowHtmlAttrs {
  const {
    record,
    rowIndex,
    getRowId,
    rowPinning,
    headerOffset,
    pinRowSticky,
    rowReorder,
    windowStart,
    gridFocus,
    onRowClick,
    editing,
    prefetch,
    rowStyle,
    rowHeight,
  } = options;
  if (isAdaptTableExtraRow(record)) {
    return {
      "data-adapttable-part": EXTRA_ROW_PARTS[record.extraKind].row,
      role: record.extraKind === "separator" ? "separator" : undefined,
      style: EXTRA_OVER_SPAN_ROW_STYLE,
    };
  }
  if (isAdaptTableGroupRow(record)) {
    return {
      "data-adapttable-part":
        record.footer === true ? "group-footer-row" : "group-row",
      "data-collapsed": record.collapsed ? "true" : undefined,
    };
  }
  const id = getRowId(record);
  const pin = antdPinnedRowAttrs(
    rowPinning?.sideOf(id),
    headerOffset,
    pinRowSticky
  );
  const visual = resolveRowStyle(rowStyle, rowHeight, record, rowIndex ?? 0);
  const reorderStyle =
    rowReorder && rowIndex !== undefined
      ? rowReorderDropStyle(rowReorder.rowAttrs(id, rowIndex))
      : undefined;
  return {
    ...rowClickProps(record, onRowClick, rowIndex),
    ...(rowReorder && rowIndex !== undefined
      ? {
          ...rowReorder.dropProps(rowIndex, record, windowStart),
          ...rowReorder.rowAttrs(id, rowIndex),
        }
      : {}),
    // antd builds its own <tr>, so the absolute aria-rowindex arrives
    // here rather than through a spread on the element.
    ...(rowIndex === undefined ? {} : gridFocus?.getRowPropsAt(rowIndex)),
    // The other seven adapters state it through core's row props, which antd
    // does not spread because it assembles its own <tr>. A <tr> is implicitly a
    // row, so this restates rather than changes anything — but a row that is
    // silent about its role in one kit and not the others is a difference
    // waiting to be mistaken for a bug.
    role: "row",
    // antd builds its own <tr>, so the part name and the row id arrive here
    // rather than through a spread on the element. The part goes BEFORE the
    // pin attrs on purpose: antd owns one tbody, so a pinned row marks its
    // section through this same attribute and has to keep winning it.
    "data-adapttable-part": "row",
    "data-row-id": id,
    ...pin,
    style: { ...visual, ...reorderStyle, ...pin.style },
    "data-stagger": "",
    // antd builds its own <tr>, so the dirty mark arrives here too.
    "data-dirty": rowIsDirty(editing, getRowId(record)) ? "" : undefined,
    onMouseEnter: prefetch ? () => prefetch(record) : undefined,
  };
}

function antdPinnedDataSource<TRow>(
  grouping: unknown,
  treeEntries: unknown,
  rowPinning: RowPinningState<TRow> | undefined,
  rows: readonly TRow[],
  getRowId: (row: TRow) => string,
  dataSourceBase: readonly GroupedDataRecord<TRow>[]
): {
  dataSource: readonly GroupedDataRecord<TRow>[];
  pinnedTopRows: readonly TRow[];
  pinnedBottomRows: readonly TRow[];
} {
  if (grouping || treeEntries || !rowPinning) {
    return {
      dataSource: dataSourceBase,
      pinnedTopRows: [],
      pinnedBottomRows: [],
    };
  }
  const parts = partitionPinnedRows(rows, rowPinning.state, getRowId);
  return {
    dataSource: [...parts.top, ...parts.scroll, ...parts.bottom],
    pinnedTopRows: parts.top,
    pinnedBottomRows: parts.bottom,
  };
}

/** Splice host extras into a flat antd dataSource. Grouping already did this. */
function resolveAntdDataSource<TRow>(
  grouping: unknown,
  rows: readonly GroupedDataRecord<TRow>[],
  extraRows: ComposedProps<TRow>["extraRows"],
  getRowId: (row: TRow) => string
): readonly GroupedDataRecord<TRow>[] {
  if (grouping) return rows;
  return insertExtraRows(
    (rows as readonly TRow[]).map((row) => ({
      kind: "row" as const,
      key: getRowId(row),
      row,
    })),
    extraRows,
    (e) => e.key
  ).map((slot) =>
    isExtraEntry(slot)
      ? {
          [ADAPTTABLE_EXTRA]: true as const,
          key: slot.key,
          extraKind: slot.kind,
          render: slot.kind === "fullWidth" ? slot.render : undefined,
        }
      : slot.row
  );
}

/** Same URL/controlled pin wiring the batteries-included shell applies. */
function useAntdPinChrome<TRow>(props: {
  pinnedRowIds: ComposedProps<TRow>["pinnedRowIds"];
  onPinnedRowIdsChange: ComposedProps<TRow>["onPinnedRowIdsChange"];
  urlSync: DataTableProps<TRow>["urlSync"];
  urlKey: DataTableProps<TRow>["urlKey"];
  urlAdapter: UrlStateAdapter | undefined;
}): {
  pinnedRowIds: RowPinState | undefined;
  onPinnedRowIdsChange: ((next: RowPinState) => void) | undefined;
} {
  const pinningRequested =
    props.pinnedRowIds !== undefined ||
    props.onPinnedRowIdsChange !== undefined;
  const pinUrl = useRowPinningUrlState({
    urlAdapter: props.urlAdapter,
    urlSync:
      props.urlSync !== false &&
      pinningRequested &&
      props.pinnedRowIds === undefined,
    urlKey: props.urlKey,
  });
  if (!pinningRequested) {
    return { pinnedRowIds: undefined, onPinnedRowIdsChange: undefined };
  }
  const pinnedRowIds = props.pinnedRowIds ?? pinUrl.pinnedRowIds;
  const onPinnedRowIdsChange = props.onPinnedRowIdsChange;
  return {
    pinnedRowIds,
    onPinnedRowIdsChange: (next: RowPinState) => {
      if (props.pinnedRowIds === undefined) {
        pinUrl.onPinnedRowIdsChange(next);
      }
      onPinnedRowIdsChange?.(next);
    },
  };
}

/** Uniform shape for antd row-selection checkbox props. */
interface RowSelectionCheckboxProps {
  disabled?: boolean;
  style?: CSSProperties;
  title?: string;
}

/** Selection column cell: group tri-state or antd's leaf checkbox node. */
function selectionCellNode<TRow>(
  record: GroupedDataRecord<TRow>,
  selection: SelectionState,
  labels: Required<TableLabels>,
  originNode: ReactNode
): ReactNode {
  if (isAdaptTableExtraRow(record)) return null;
  if (isAdaptTableGroupRow(record)) {
    // A group's footer closes the group its header opened, so a checkbox here
    // would be a second control toggling the same rows. The header owns it.
    if (record.footer === true) return null;
    return (
      <GroupSelectionCheckbox
        group={record}
        selection={selection}
        labels={labels}
      />
    );
  }
  return <>{originNode}</>;
}

/** Build antd's rowSelection from the headless selection state. */
function buildRowSelection<TRow>(
  selection: SelectionState | null | undefined,
  getRowId: (row: TRow) => string,
  labels: Required<TableLabels>,
  fixedLeft: boolean
): TableProps<GroupedDataRecord<TRow>>["rowSelection"] {
  if (!selection) return undefined;
  return {
    // Pin the checkbox column alongside any left-fixed data column.
    fixed: fixedLeft ? "left" : undefined,
    selectedRowKeys: [...selection.selectedIds],
    onSelect: (record) => {
      if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) return;
      selection.toggle(getRowId(record));
    },
    getCheckboxProps: (record): RowSelectionCheckboxProps => {
      const skip = isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record);
      return {
        disabled: skip || undefined,
        style: skip ? { display: "none" } : undefined,
        title: skip ? undefined : labels.selectRow,
      };
    },
    // Group headers render a tri-state over leaf ids; leaf rows keep antd's node.
    //
    // The part goes on a wrapper INSIDE the cell, not on the cell: antd owns
    // the selection column's <td> and `rowSelection` exposes only its content.
    // Every other adapter tags the cell itself, so this is the one placement
    // that differs — findable, but one element in.
    renderCell: (_checked, record, _index, originNode) => (
      <span data-adapttable-part="selection-cell">
        {selectionCellNode(record, selection, labels, originNode)}
      </span>
    ),
    // Select-all is driven by the custom `columnTitle` checkbox below; with
    // `columnTitle` set antd never renders its own header checkbox, so an
    // `onSelectAll` callback could never fire.
    columnTitle: (
      <Checkbox
        data-adapttable-part="selection-header"
        aria-label={labels.selectAll}
        checked={selection.headerState === "all"}
        indeterminate={selection.headerState === "some"}
        onChange={() => selection.toggleAll()}
      />
    ),
  };
}

/**
 * Map the shared row-expansion contract onto antd's NATIVE `expandable` API:
 * chrome's id-keyed state drives `expandedRowKeys` (so an open panel survives
 * sorting and paging), the icon toggles back through chrome, and the detail
 * panel renders via `expandedRowRender`. antd's built-in expand icon does
 * carry `aria-expanded` and an `aria-label`, but the label comes from antd's
 * ConfigProvider locale — a custom `expandIcon` keeps the configurable
 * `labels.expandRow` / `labels.collapseRow` contract instead.
 */
function buildExpandable<TRow>(
  renderRowDetail: ((row: TRow) => ReactNode) | undefined,
  expansion: RowExpansionState | undefined,
  getRowId: (row: TRow) => string,
  labels: Required<TableLabels>
): TableProps<GroupedDataRecord<TRow>>["expandable"] {
  if (!renderRowDetail || !expansion) return undefined;
  return {
    expandedRowKeys: [...expansion.expandedIds],
    onExpand: (_open, row) => {
      if (isAdaptTableGroupRow(row) || isAdaptTableExtraRow(row)) return;
      expansion.toggle(getRowId(row));
    },
    rowExpandable: (row) =>
      !isAdaptTableGroupRow(row) && !isAdaptTableExtraRow(row),
    expandedRowRender: (row) =>
      isAdaptTableGroupRow(row) || isAdaptTableExtraRow(row)
        ? null
        : renderRowDetail(row),
    expandIcon: ({ expanded, onExpand, record }) => {
      if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) {
        return null;
      }
      return (
        <OptionalExpandToggle
          id={getRowId(record)}
          expanded={expanded}
          onToggle={() => {
            // antd hands its own icon the click event; ours is a button that
            // already consumed one, so `onExpand` gets a stand-in that has the
            // two methods it calls and nothing to cancel.
            onExpand(record, {
              stopPropagation() {
                // Nothing above this is listening.
              },
              preventDefault() {
                // The toggle has no default action to prevent.
              },
            } as Parameters<typeof onExpand>[1]);
          }}
          expandLabel={labels.expandRow}
          collapseLabel={labels.collapseRow}
        />
      );
    },
  };
}

/**
 * The column-management menu, gated to desktop + opt-in. Rendered as a
 * component (not an inline ternary) so the `DataTable` body stays flat.
 */
function ColumnMenuSlot<TRow>({
  enabled,
  allColumns,
  layout,
  labels,
  dir,
  hasRowActions,
  hasRowReorder,
  onAutoSize,
  onAutoSizeColumn,
  onSortColumn,
  onFilterColumn,
  sortBy,
  sortDir,
}: Readonly<{
  enabled: boolean;
  allColumns: ColumnDef<TRow>[];
  layout: UseColumnLayoutResult<TRow>;
  labels: Required<TableLabels>;
  dir?: "ltr" | "rtl";
  hasRowActions: boolean;
  hasRowReorder: boolean;
  /** Size every rendered column to its content. */
  onAutoSize: () => void;
  onAutoSizeColumn?: (key: string) => void;
  onSortColumn?: (key: string, dir: "asc" | "desc") => void;
  onFilterColumn?: (key: string) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}>) {
  if (!enabled) return null;
  return (
    <FeatureSlot
      slot={COLUMN_MENU}
      props={
        {
          allColumns,
          onAutoSize,
          onAutoSizeColumn,
          onSortColumn,
          onFilterColumn,
          sortBy,
          sortDir,
          layout,
          labels,
          hasRowActions,
          hasRowReorder,
          dir,
        } as ColumnMenuSlotProps<never>
      }
    />
  );
}

/**
 * The saved-views menu, mounted when the `savedViews` prop opts in. The
 * table's own `urlAdapter` / `urlKey` are the defaults so a captured view
 * holds THIS table's params; explicit options win.
 */
function SavedViewsSlot({
  options,
  urlAdapter,
  urlKey,
  labels,
}: Readonly<{
  options: UseSavedViewsOptions | undefined;
  urlAdapter: UrlStateAdapter | undefined;
  urlKey: string | undefined;
  labels: Required<TableLabels>;
}>) {
  if (!options) return null;
  return (
    <FeatureSlot
      slot={SAVED_VIEWS}
      props={{
        options: {
          urlAdapter,
          urlKey,
          ...options,
        },
        labels,
      }}
    />
  );
}

/**
 * Whether the page-level load-more sentinel should stay armed. It disarms
 * only while the antd virtual table renders (desktop): there the rows live in
 * antd's own fixed-height scroll container, and `handleVirtualScroll` drives
 * paging instead. Mobile cards window through core virtualization but still
 * flow in the page (no inner scroll box), so the sentinel stays the single
 * load-more trigger there even with `virtualize` set.
 */
function sentinelEnabled(
  isPaged: boolean,
  error: Error | null,
  virtualize: boolean,
  body: string
): boolean {
  return !isPaged && !error && !(virtualize && body === "desktop");
}

/**
 * Map the shared `summaryRow` contract onto antd's NATIVE `summary` slot: one
 * `Table.Summary.Row` whose cells line up under the data columns. antd
 * injects its expand/selection columns at the START of the grid, so the row
 * first pads with one empty cell per injected column, then renders a cell per
 * visible column (keys absent from the result stay empty, logical alignment
 * preserved for RTL), then pads for the trailing actions column.
 */
function buildSummary<TRow>(
  summaryRow:
    ((rows: readonly TRow[]) => Partial<Record<string, ReactNode>>) | undefined,
  columns: readonly ColumnDef<TRow>[],
  leadingCells: number,
  hasActions: boolean
): TableProps<GroupedDataRecord<TRow>>["summary"] {
  if (!summaryRow && !columnsHaveFooter(columns)) return undefined;
  return function SummaryCells(pageData) {
    const leafRows = pageData.filter(
      (record): record is TRow =>
        !isAdaptTableGroupRow(record) && !isAdaptTableExtraRow(record)
    );
    const cells = summaryRow?.(leafRows) ?? {};
    return (
      <Table.Summary.Row>
        {Array.from({ length: leadingCells }, (_, i) => (
          <Table.Summary.Cell key={`lead-${i}`} index={i} />
        ))}
        {columns.map((column, i) => (
          <Table.Summary.Cell key={column.key} index={leadingCells + i}>
            <div style={{ textAlign: logicalAlign(column.align) }}>
              {resolveColumnFooter(column, cells[column.key])}
            </div>
          </Table.Summary.Cell>
        ))}
        {hasActions && (
          <Table.Summary.Cell index={leadingCells + columns.length} />
        )}
      </Table.Summary.Row>
    );
  };
}

/** How many non-data columns antd injects ahead of ours (expand, selection). */
function summaryLeadingCells(
  rowSelection: unknown,
  expandable: unknown,
  hasReorder: boolean
) {
  return (rowSelection ? 1 : 0) + (expandable ? 1 : 0) + (hasReorder ? 1 : 0);
}

/** The shift-click chain toggler — only when `multiSort` is opted in. */
function chainToggler<TRow>(
  multiSort: boolean | undefined,
  source: TableSource<TRow>
): ((key: string) => void) | undefined {
  if (!multiSort) return undefined;
  return (key) => source.toggleSortLevel(key);
}

/**
 * The split footer every kit shares — rows-per-page + showing on the start
 * side, the pager on the end side — built from antd's own Select and
 * Pagination instead of the table-internal pagination (which crams
 * everything, size changer included, onto one end).
 */
function PagedFooter<TRow>({
  table,
  source,
  labels,
  showRowsPerPage = true,
}: Readonly<{
  table: UseDataTableResult<TRow>;
  source: TableSource<TRow>;
  labels: Required<TableLabels>;
  /** Hidden in the grouped full-set view, where page size has no effect. */
  showRowsPerPage?: boolean;
}>) {
  const from = (table.pagination.safePage - 1) * source.limit + 1;
  const to = Math.min(table.pagination.safePage * source.limit, source.total);
  return (
    <Flex justify="space-between" align="center" wrap gap={8}>
      <Flex align="center" gap={8}>
        {showRowsPerPage && (
          <>
            <Typography.Text type="secondary">
              {labels.rowsPerPage}
            </Typography.Text>
            <Select
              size="small"
              aria-label={labels.rowsPerPage}
              value={source.limit}
              onChange={(value: number) => source.setLimit(value)}
              options={pageSizeOptions([source.limit, source.defaultLimit]).map(
                (n) => ({
                  value: n,
                  label: n,
                })
              )}
            />
          </>
        )}
        {source.total > 0 && (
          <Typography.Text type="secondary">
            {labels.showing({ from, to, total: source.total })}
          </Typography.Text>
        )}
      </Flex>
      <Pagination
        current={table.pagination.safePage}
        pageSize={source.limit}
        total={source.total}
        showSizeChanger={false}
        onChange={(page: number) => source.setPage(page)}
        // antd's pager exposes neither aria-current nor per-arrow names by
        // default — clone its own items with the missing attributes.
        itemRender={(page, type, original) => {
          let extra: Record<string, unknown> | null = null;
          if (isValidElement(original)) {
            if (type === "page") {
              extra = {
                "aria-current":
                  page === table.pagination.safePage ? "page" : undefined,
              };
            } else if (type === "prev" || type === "next") {
              extra = {
                "aria-label":
                  type === "prev" ? labels.previousPage : labels.nextPage,
              };
            }
          }
          return extra
            ? cloneElement(
                original as ReactElement<Record<string, unknown>>,
                extra
              )
            : original;
        }}
      />
    </Flex>
  );
}

/**
 * The auto-built form for a declarative `filters` array — nothing when the
 * runtime resolved zero definitions (no column shorthands, empty array).
 */
function autoFilterForm<TRow>(
  runtime: FilterRuntime<TRow>,
  source: TableSource<TRow>,
  labels: Required<TableLabels>,
  header: boolean,
  filterFields?: boolean
) {
  if (runtime.defs.length === 0) return undefined;
  const simpleFiltersOn = showSimpleFilterFields(header, filterFields);
  const formProps = {
    defs: runtime.defs,
    source,
    registry: runtime.registry,
    labels,
    defaultExpanded: !simpleFiltersOn,
    showSimpleFields: simpleFiltersOn,
  } as unknown as FiltersFormSlotProps<never>;
  return <FeatureSlot slot={FILTERS_FORM} props={formProps} />;
}

/** Declarative `filters` become the auto form; JSX passes through. */
function resolveFiltersNode<TRow>(
  filters: ComposedProps<TRow>["filters"],
  runtime: FilterRuntime<TRow>,
  source: TableSource<TRow>,
  labels: Required<TableLabels>,
  header: boolean,
  filterFields?: boolean
): ReactNode {
  let node: ReactNode;
  if (isDeclarativeFilters(filters) || filters === undefined) {
    node = autoFilterForm(runtime, source, labels, header, filterFields);
  } else {
    node = filters;
  }
  return node;
}

/** antd `<Table>` size tokens. */
type AntdTableSize = "small" | "middle" | "large";

/**
 * antd table size from the shared `density` contract (independent of column
 * pinning): "compact" → the small table, "comfortable" (default) → the middle
 * one. An explicit `size` prop wins so callers can opt into "large".
 */
function resolveSize(
  size: AntdTableSize | undefined,
  density: "comfortable" | "compact" | undefined
): AntdTableSize {
  if (size) return size;
  return (density ?? "comfortable") === "compact" ? "small" : "middle";
}

/**
 * Windowing props for the mobile card list. Desktop rows window through antd's
 * own native virtual `<Table>`, so this is gated to the card body and never
 * touches that path. Without `maxHeight` the cards flow in the page and the
 * page-level sentinel stays the load-more trigger. With `maxHeight` the list
 * itself is the scroll box, matching every other kit.
 */
/** What the mobile card list needs to draw itself, windowed or whole. */
interface CardWindow<TRow> {
  rowEntries: readonly VirtualTableRow<TRow>[] | undefined;
  paddingTop: number;
  paddingBottom: number;
  measureElement?: (node: Element | null) => void;
  listRef: (node: HTMLElement | null) => void;
  listStyle: ReturnType<typeof mobileCardListStyle>;
}

/**
 * Window the mobile card list, when a window is on offer.
 *
 * Same seam as the grouped list: the TanStack hooks arrive with `virtualize`
 * and nowhere else, so a plain antd table renders every card and never
 * downloads them.
 */
function AntdCardWindow<TRow>({
  rows,
  rowKey,
  props,
  virtualize,
  isPaged,
  error,
  body,
  children,
}: Readonly<{
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  props: Readonly<ComposedProps<TRow>>;
  /** The resolved decision: antd's own virtual Table owns the desktop path. */
  virtualize: boolean;
  isPaged: boolean;
  error: Error | null;
  body: string;
  children: (window: CardWindow<TRow>) => ReactNode;
}>): ReactNode {
  const filled = useFeatureSlotFilled(KEYED_WINDOW);
  const scrollRef = useRef<HTMLElement | null>(null);
  const listRef = useCallback((node: HTMLElement | null) => {
    scrollRef.current = node;
  }, []);
  const listStyle = mobileCardListStyle(props.maxHeight);
  const inBox = props.maxHeight != null;
  const finish = (window: KeyedVirtualization) =>
    children({
      rowEntries: window.enabled
        ? window.indices.map((index) => ({
            row: rows[index]!,
            index,
            key: rowKey(rows[index]!),
          }))
        : undefined,
      paddingTop: window.paddingTop,
      paddingBottom: window.paddingBottom,
      measureElement: window.measureElement,
      listRef,
      listStyle,
    });
  const slotProps: KeyedWindowSlotProps = {
    keys: rows.map((row) => rowKey(row)),
    enabled: virtualize && !isPaged && !error && body === "mobile",
    estimateSize: props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX,
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
    getScrollElement: inBox ? () => scrollRef.current : undefined,
    children: finish,
  };
  return filled ? (
    <FeatureSlot slot={KEYED_WINDOW} props={slotProps} />
  ) : (
    finish({
      enabled: false,
      indices: rows.map((_, index) => index),
      paddingTop: 0,
      paddingBottom: 0,
    })
  );
}

/** Row-grouping bundle from `useTableChrome` (opt-in when `groupBy` is set). */
interface GroupingBundle<TRow> {
  groupBy: readonly string[];
  /** Reveal the next page of groups, or of one group's rows. */
  showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  collapsed: GroupCollapseState;
  entries: readonly GroupedFlatEntry<TRow>[];
  setGroupBy: (key: GroupByInput) => void;
}

/**
 * Window grouped flat entries when virtualization is eligible. Grouping stays
 * dormant when chrome does not supply a bundle (no effective `groupBy`).
 */
/**
 * Window the flat group/leaf list, when a window is on offer.
 *
 * antd renders through its own `<Table>`, so it cannot take the shared
 * `CHROME_BODY`; it asks `KEYED_WINDOW` instead, which only `virtualize`
 * fills. Nothing here reaches TanStack: a table that never imported the
 * feature gets every index and renders the whole list.
 */
function AntdGroupingWindow<TRow>({
  grouping,
  props,
  isPaged,
  error,
  body,
  isMobile,
  children,
}: Readonly<{
  grouping: GroupingBundle<TRow> | undefined;
  props: Readonly<ComposedProps<TRow>>;
  isPaged: boolean;
  error: Error | null;
  body: string;
  isMobile: boolean;
  children: (grouping: GroupingBundle<TRow> | undefined) => ReactNode;
}>): ReactNode {
  const filled = useFeatureSlotFilled(KEYED_WINDOW);
  const keys = grouping?.entries.map((entry) => entry.key) ?? [];
  const eligible =
    grouping !== undefined &&
    !isPaged &&
    !error &&
    (body === "desktop" || body === "mobile");
  const windowed = (indices: readonly number[]) => {
    if (!grouping) return children(undefined);
    return children({
      ...grouping,
      entries: windowGroupedEntries(grouping.entries, indices),
    });
  };
  const slotProps: KeyedWindowSlotProps = {
    keys,
    enabled: Boolean(props.virtualize) && eligible,
    estimateSize: isMobile
      ? (props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
      : 56,
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
    children: (window) => windowed(window.indices),
  };
  return filled ? (
    <FeatureSlot slot={KEYED_WINDOW} props={slotProps} />
  ) : (
    windowed(keys.map((_, index) => index))
  );
}

/** Props shared by mobile and desktop body regions. */
interface DataTableBodyRegionProps<TRow> {
  chromeBody: string;
  /** The load failure to show instead of the body, when there is one. */
  errorState?: TableErrorState;
  source: TableSource<TRow>;
  /** Editing row universe from chrome — grouped leaf set or page slice. */
  editingRows: readonly TRow[];
  table: UseDataTableResult<TRow>;
  slots: DataTableProps<TRow>["slots"];
  columns: ReturnType<typeof buildColumns<TRow>>;
  rowActions: ComposedProps<TRow>["rowActions"];
  rowActionsLayout: DataTableProps<TRow>["rowActionsLayout"];
  renderRowActions: DataTableProps<TRow>["renderRowActions"];
  confirm: ConfirmHandler;
  getRowId: (row: TRow) => string;
  labels: Required<TableLabels>;
  emptyNode: ReactNode;
  grouping: GroupingBundle<TRow> | undefined;
  tree: ReturnType<typeof useTableChrome<TRow>>["tree"];
  detailRender: ((row: TRow) => ReactNode) | undefined;
  detailExpansion: RowExpansionState | undefined;
  editing: NonNullable<ReturnType<typeof useTableChrome<TRow>>>["editing"];
  cardWindow: CardWindow<TRow>;
  tableLabel: string | undefined;
  density: "comfortable" | "compact" | undefined;
  prefetch: DataTableProps<TRow>["prefetch"];
  onRowClick: DataTableProps<TRow>["onRowClick"];
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  rowClassName: ComposedProps<TRow>["rowClassName"];
  isCellFlashing: DataTableProps<TRow>["isCellFlashing"];
  rowStyle: ComposedProps<TRow>["rowStyle"];
  rowHeight: ComposedProps<TRow>["rowHeight"];
  cardClassName: string | undefined;
  summaryRow: DataTableProps<TRow>["summaryRow"];
  renderCard: DataTableProps<TRow>["renderCard"];
  skeletonRows: number | undefined;
  size: AntdTableSize;
  bordered: boolean;
  virtualize: boolean;
  maxHeight: number | undefined;
  sticky: TableProps<unknown>["sticky"];
  dataSource: readonly GroupedDataRecord<TRow>[];
  rowSelection: TableProps<GroupedDataRecord<TRow>>["rowSelection"];
  expandable: TableProps<GroupedDataRecord<TRow>>["expandable"];
  summary: TableProps<GroupedDataRecord<TRow>>["summary"];
  handleVirtualScroll: UIEventHandler<HTMLElement>;
  handleChange: TableProps<TRow>["onChange"];
  minWidth: number;
  hasPinned: boolean;
  hasRowActions: boolean;
  rowReorder: RowReorderState<TRow> | undefined;
  windowStart: number;
  /** Rows in the whole dataset, for the cards' `aria-setsize`. */
  cardSetSize: number;
  rowPinning: RowPinningState<TRow> | undefined;
  pinnedTopRows: readonly TRow[];
  pinnedBottomRows: readonly TRow[];
  extraRows: ComposedProps<TRow>["extraRows"];
  pinRowSticky: boolean;
}

/** Desktop antd `<Table>` body — extracted to keep `DataTable` flat. */
function DesktopTableBody<TRow>({
  tableLabel,
  columns,
  dataSource,
  getRowId,
  size,
  bordered,
  virtualize,
  grouping,
  sticky,
  handleVirtualScroll,
  rowSelection,
  expandable,
  summary,
  handleChange,
  rowClassName,
  rowStyle,
  rowHeight,
  editing,
  onRowClick,
  gridFocus,
  prefetch,
  hasPinned,
  maxHeight,
  minWidth,
  emptyNode,
  rowReorder,
  windowStart,
  rowPinning,
  pinRowSticky,
}: Readonly<{
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  tableLabel: string | undefined;
  columns: ReturnType<typeof buildColumns<TRow>>;
  dataSource: readonly GroupedDataRecord<TRow>[];
  getRowId: (row: TRow) => string;
  size: AntdTableSize;
  bordered: boolean;
  virtualize: boolean;
  grouping: GroupingBundle<TRow> | undefined;
  sticky: TableProps<unknown>["sticky"];
  handleVirtualScroll: UIEventHandler<HTMLElement>;
  rowSelection: TableProps<GroupedDataRecord<TRow>>["rowSelection"];
  expandable: TableProps<GroupedDataRecord<TRow>>["expandable"];
  summary: TableProps<GroupedDataRecord<TRow>>["summary"];
  handleChange: TableProps<TRow>["onChange"];
  rowClassName: ComposedProps<TRow>["rowClassName"];
  rowStyle: ComposedProps<TRow>["rowStyle"];
  rowHeight: ComposedProps<TRow>["rowHeight"];
  /** The editing bundle, so a row can carry its dirty mark. */
  editing: NonNullable<ReturnType<typeof useTableChrome<TRow>>>["editing"];
  onRowClick: DataTableProps<TRow>["onRowClick"];
  prefetch: DataTableProps<TRow>["prefetch"];
  hasPinned: boolean;
  maxHeight: number | undefined;
  minWidth: number;
  emptyNode: ReactNode;
  rowReorder: RowReorderState<TRow> | undefined;
  windowStart: number;
  rowPinning: RowPinningState<TRow> | undefined;
  pinRowSticky: boolean;
}>) {
  const [theadRef, headerHeight] = useOffsetHeight();
  let stickyHeaderOffset: number | undefined;
  if (sticky === true) stickyHeaderOffset = 0;
  else if (sticky) stickyHeaderOffset = sticky.offsetHeader ?? 0;
  const headerOffset =
    stickyHeaderOffset === undefined ? 0 : stickyHeaderOffset + headerHeight;
  // antd owns the <table>, <thead> and <tbody> elements, so their part names —
  // and `role="grid"` with the ARIA dimensions — reach them through the
  // `components` seam. Memoized: a new component identity here would remount
  // the whole table on every render.
  const getGridProps = gridFocus?.getGridProps;
  // Depends on the GETTER, not the whole state: the announcement changes on
  // every focus move, and rebuilding `components` would remount antd's table and
  // throw away the focus this just placed.
  const pinArmed = rowPinning !== undefined;
  // antd's own virtualizer replaces the body grid with divs — the rows it
  // draws are `<div>`s, not `<tr>`s — so the body wrapper has to be a `<div>`
  // there. A `<tbody>` in that position is invalid twice over: inside antd's
  // holder div, and around the row divs it receives.
  const virtualBody = virtualize && !grouping;
  const components = useMemo(
    () => ({
      // Core decides what belongs here: the grid role and handlers only with
      // cell navigation, but a windowed table's `aria-rowcount` regardless —
      // so this asks unconditionally rather than gating on the feature.
      table: tableComponent(getGridProps ? getGridProps() : undefined),
      header: {
        // A bounded height splits the grid into a header table and a body
        // table, and antd resolves the header one through `header.table`. It
        // carries the name; the grid role and its ARIA dimensions stay on the
        // body table, where the rows are.
        table: tableComponent(undefined),
        // The header height is measured only for pinned rows, so the ref stays
        // conditional; the name does not.
        wrapper: theadComponent(pinArmed ? theadRef : undefined),
        row: TheadRow,
      },
      body: { wrapper: virtualBody ? VirtualTbodyWrapper : TbodyWrapper },
    }),
    [getGridProps, pinArmed, theadRef, virtualBody]
  );

  return (
    <Table<GroupedDataRecord<TRow>>
      aria-label={tableLabel}
      components={components}
      columns={columns}
      dataSource={[...dataSource]}
      rowKey={(record) => groupedRowKey(record, getRowId)}
      size={size}
      bordered={bordered}
      virtual={virtualize && !grouping}
      sticky={sticky}
      onScroll={handleVirtualScroll}
      rowSelection={rowSelection}
      expandable={expandable}
      summary={summary}
      pagination={false}
      rowClassName={rowClassName ? buildRowClassName(rowClassName) : undefined}
      onChange={handleChange as TableProps<GroupedDataRecord<TRow>>["onChange"]}
      onRow={(record, rowIndex) =>
        antdOnRow({
          record,
          rowIndex,
          getRowId,
          rowPinning,
          headerOffset,
          pinRowSticky,
          rowReorder,
          windowStart,
          gridFocus,
          onRowClick,
          editing,
          prefetch,
          rowStyle,
          rowHeight,
        })
      }
      scroll={resolveScroll(
        virtualize && !grouping,
        hasPinned,
        maxHeight,
        minWidth
      )}
      locale={{ emptyText: emptyNode }}
    />
  );
}

/**
 * antd owns the `<table>` element, so its part name — plus `role="grid"` and
 * the ARIA dimensions when cell navigation is armed — reaches it through the
 * documented `components` seam rather than a spread. With a sticky or
 * virtualized header antd splits the grid into a header table and a body table;
 * both are tables of ours, and both carry the name.
 *
 * Built at module scope: a component declared inside another component is a new
 * type on every render, which remounts everything below it — here that would
 * mean losing the cell focus on every keystroke.
 */
function tableComponent(gridProps: Record<string, unknown> | undefined) {
  return function AdaptTable(tableProps: Record<string, unknown>) {
    return (
      <table data-adapttable-part="table" {...tableProps} {...gridProps} />
    );
  };
}

function TbodyWrapper(
  props: Readonly<HTMLAttributes<HTMLTableSectionElement>>
) {
  return <tbody data-adapttable-part="tbody" {...props} />;
}

/**
 * The body wrapper antd's virtual table asks for.
 *
 * Virtualized, antd draws the body as a div grid — its rows are `<div>`s
 * carrying the row part, and the holder it wraps them in is a `<div>` too. The
 * part name still marks the table's body, on the element antd actually renders
 * there, which is the same convention the virtual rows already follow.
 */
function VirtualTbodyWrapper(props: Readonly<HTMLAttributes<HTMLDivElement>>) {
  return <div data-adapttable-part="tbody" {...props} />;
}

function theadComponent(
  theadRef: Ref<HTMLTableSectionElement | null> | undefined
) {
  return function AdaptThead(
    props: Readonly<HTMLAttributes<HTMLTableSectionElement>>
  ) {
    return <thead data-adapttable-part="thead" ref={theadRef} {...props} />;
  };
}

function TheadRow(props: Readonly<HTMLAttributes<HTMLTableRowElement>>) {
  return <tr data-adapttable-part="header-row" {...props} />;
}

/**
 * The table body region (error, skeleton, empty, mobile cards, desktop table).
 * Extracted outside `DataTable` to keep cognitive complexity within budget.
 */
function DataTableBodyRegion<TRow>(
  props: Readonly<DataTableBodyRegionProps<TRow>>
): ReactNode {
  const {
    gridFocus,
    chromeBody,
    errorState,
    source,
    editingRows,
    table,
    slots,
    columns,
    rowActions,
    rowActionsLayout,
    renderRowActions,
    confirm,
    getRowId,
    labels,
    emptyNode,
    grouping,
    tree,
    detailRender,
    detailExpansion,
    editing,
    cardWindow,
    tableLabel,
    density,
    prefetch,
    onRowClick,
    rowClassName,
    isCellFlashing,
    rowStyle,
    rowHeight,
    cardClassName,
    summaryRow,
    renderCard,
    skeletonRows,
    size,
    bordered,
    virtualize,
    maxHeight,
    sticky,
    dataSource,
    rowSelection,
    expandable,
    summary,
    handleVirtualScroll,
    handleChange,
    minWidth,
    hasPinned,
    hasRowActions,
    rowReorder,
    windowStart,
    cardSetSize,
    rowPinning,
    pinnedTopRows,
    pinnedBottomRows,
    extraRows,
    pinRowSticky,
  } = props;

  let body: ReactNode;
  if (errorState) {
    body = fillSlot(slots?.error, errorState) ?? (
      <ErrorState
        error={errorState.error}
        labels={labels}
        onRetry={errorState.retry}
      />
    );
  } else if (chromeBody === "skeleton") {
    body = slots?.skeleton ?? (
      <SkeletonTable
        columnCount={columns.length}
        rowCount={skeletonRows ?? source.limit}
        loadingLabel={labels.loading}
        size={size}
        bordered={bordered}
        hasActions={hasRowActions}
      />
    );
  } else if (chromeBody === "empty") {
    body = <output>{emptyNode}</output>;
  } else if (chromeBody === "mobile") {
    body = (
      <MobileCards
        table={table}
        cardClassName={cardClassName}
        rows={editingRows}
        rowActions={rowActions}
        rowActionsLayout={rowActionsLayout}
        renderRowActions={renderRowActions}
        confirm={confirm}
        getRowId={getRowId}
        prefetch={prefetch}
        onRowClick={onRowClick}
        rowClassName={rowClassName}
        isCellFlashing={isCellFlashing}
        rowStyle={rowStyle}
        rowHeight={rowHeight}
        tableLabel={tableLabel}
        compact={(density ?? "comfortable") === "compact"}
        expansion={detailExpansion}
        editing={editing}
        grouping={grouping}
        tree={tree}
        renderRowDetail={detailRender}
        renderCard={renderCard}
        summaryRow={summaryRow}
        {...cardWindow}
        rowReorder={rowReorder}
        windowStart={windowStart}
        cardSetSize={cardSetSize}
        pinnedTopRows={pinnedTopRows}
        pinnedBottomRows={pinnedBottomRows}
        extraRows={extraRows}
      />
    );
  } else {
    body = (
      <DesktopTableBody
        gridFocus={gridFocus}
        tableLabel={tableLabel}
        columns={columns}
        dataSource={dataSource}
        getRowId={getRowId}
        size={size}
        bordered={bordered}
        virtualize={virtualize}
        grouping={grouping}
        sticky={sticky}
        handleVirtualScroll={handleVirtualScroll}
        rowSelection={rowSelection}
        expandable={expandable}
        summary={summary}
        handleChange={handleChange}
        rowClassName={rowClassName}
        rowStyle={rowStyle}
        rowHeight={rowHeight}
        editing={editing}
        onRowClick={onRowClick}
        prefetch={prefetch}
        hasPinned={hasPinned}
        maxHeight={maxHeight}
        minWidth={minWidth}
        emptyNode={emptyNode}
        rowReorder={rowReorder}
        windowStart={windowStart}
        rowPinning={rowPinning}
        pinRowSticky={pinRowSticky}
      />
    );
  }
  return body;
}

function AntdRowReorderAnnouncer<TRow>({
  rowReorder,
}: Readonly<{ rowReorder: RowReorderState<TRow> | undefined }>) {
  if (rowReorder === undefined) return null;
  return (
    <FeatureSlot
      slot={ROW_REORDER_ANNOUNCER}
      props={{ announcement: rowReorder.announcement }}
    />
  );
}

function TableFooterSlot({ children }: Readonly<{ children?: ReactNode }>) {
  if (children == null) return null;
  return <div data-adapttable-part="table-footer">{children}</div>;
}

/**
 * Batteries-included Ant Design data table. Drop in `columns`, a `source`,
 * and a `rowKey` for a fully wired antd `<Table>` — sorting, selection,
 * filtering, URL-synced state, RTL, and dark mode — on the headless
 * `@adapttable/core` engine. Unlike the hand-rolled adapters, this one
 * drives antd's high-level `<Table>` (its own header carets, row checkboxes,
 * loading, empty state, and pagination), wiring those back to the source.
 *
 * @typeParam TRow - The row type.
 */
/**
 * The grid's own state: where the window starts, find, focus, and the
 * selection's arithmetic.
 *
 * antd builds its chrome by hand rather than through `useDataTableShell`,
 * so it calls these four directly. Grouping them keeps `DataTable` — which
 * assembles the entire adapter — from carrying their branches too.
 */
function useAntdGridState<TRow>(
  props: Readonly<ComposedProps<TRow>>,
  c: ReturnType<typeof useTableChrome<TRow>>,
  history: EditHistoryState<TRow>
) {
  // antd builds its own chrome rather than using `useDataTableShell`, so it
  // calls the focus hook directly. Same derivation as the shell's: the row count
  // is the DATASET total and `windowStart` is where the rendered slice begins, so
  // Ctrl+End reaches the real last row and the ARIA counts stay truthful under
  // virtualization.
  const windowStart =
    c.source.paginationMode === "paged"
      ? Math.max(0, (c.source.page - 1) * c.source.limit)
      : 0;
  const find = useFindInTable<TRow>({
    enabled: props.findInTable === true,
    rows: c.source.rows,
    columns: c.columnLayout.visibleColumns,
    firstRowIndex: windowStart,
  });
  const gridFocus = useGridFocus<TRow>({
    enabled: props.cellNavigation === true,
    headerCheckbox: props.columnSelectionCheckbox === true,
    rowCount: Math.max(c.source.total, windowStart + c.source.rows.length),
    columns: c.columnLayout.visibleColumns,
    rows: c.source.rows,
    firstRowIndex: windowStart,
    dir: props.dir,
    labels: c.table.labels,
    onCut: props.onCellCut,
    onPaste: asGesture(cellPasteHandler(props), history.record),
    onFill: asGesture(cellFillHandler(props), history.record),
    onUndo: history.undo,
    onRedo: history.redo,
    onFind: find.openBar,
    matchKeys: find.matchKeys,
    currentMatch: find.current,
  });
  useFindFocus(find.current, gridFocus.focusCell, gridFocus.selectRange);
  const stats = selectionStats({
    enabled: props.selectionStats === true,
    range: gridFocus.range,
    rows: c.source.rows,
    columns: c.columnLayout.visibleColumns,
    firstRowIndex: windowStart,
  });
  // The same dataset size the grid reports through `aria-rowcount`; the card
  // list needs it per item, as `aria-setsize`.
  const cardSetSize = Math.max(
    c.source.total,
    windowStart + c.source.rows.length
  );
  // Same derivation as the shell's: antd builds its own chrome, so it calls the
  // status hook directly rather than reading `shell.statusAnnouncement`.
  const sortedColumn = c.columnLayout.visibleColumns.find(
    (column) => column.key === c.source.sortBy
  );
  const statusAnnouncement = useTableStatusAnnouncement({
    labels: c.table.labels,
    total: c.source.total,
    shown: c.source.rows.length,
    page: c.source.page,
    limit: c.source.limit,
    paged: c.source.paginationMode === "paged",
    sortBy: c.source.sortBy,
    sortDir: c.source.sortDir,
    sortColumnName:
      typeof sortedColumn?.header === "string"
        ? sortedColumn.header
        : sortedColumn?.key,
  });
  return {
    windowStart,
    cardSetSize,
    find,
    gridFocus,
    stats,
    statusAnnouncement,
  };
}

/**
 * The Ant Design table. Pass rows and columns — or a `query` (server), or a
 * prebuilt `source` — to get a fully styled, sortable, filterable, paginated
 * table with selection, bulk actions, RTL and dark mode.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
function DataTableContent<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  const featureHost = featureHostOf(props);
  const {
    slots,
    className,
    classNames,
    animate = false,
    bordered = false,
    virtualize = false,
  } = props;
  const size = resolveSize(props.size, props.density);
  const filtersMode = resolveFilterMode(props.filtersMode, props.headerFilters);
  // Resolve the data tier (source > onQueryChange server > frontend data)
  // and the declarative-filter runtime; everything below — pagination, row
  // selection, the sentinel — uses the RESOLVED source via `table.source`.
  // ONE resolved URL backend for the tier hooks AND the saved-views menu,
  // so with `urlSync={false}` both share the same in-memory backend instead
  // of the menu silently reading the real address bar.
  const resolvedUrlAdapter = useResolvedAdapter(
    props.urlSync === false ? undefined : props.urlAdapter,
    props.urlSync !== false
  );
  const dataColumns = useMemo(
    () => flattenColumnTree(props.columns).leaves,
    [props.columns]
  );
  const { source: resolvedSource, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    total: props.total,
    loading: props.loading,
    error: props.error,
    mode: props.mode,
    onQueryChange: props.onQueryChange,
    urlAdapter: resolvedUrlAdapter,
    // No `urlSync` here on purpose: the decision is already baked into WHICH
    // adapter was resolved above (memory when off, the real one when on), and
    // the tier hooks would otherwise apply it a second time — routing the
    // active tier to a private store that saved views cannot see.
    urlKey: props.urlKey,
    columns: dataColumns,
    filters: props.filters,
    filterTypes: props.filterTypes,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
    supports: props.supports,
    facetKeys: props.facetKeys,
    facets: props.facets,
    featureHost,
  });
  // A declarative `filters` array becomes the auto-built form; JSX passes
  // through untouched. Column-level `filter` shorthands alone (no `filters`
  // prop) must still render the form — only explicit JSX takes over. The
  // form needs the resolved labels before `useTableChrome` resolves its own
  // (the chrome consumes the form node), so resolve the same prop here.
  const formLabels = useMemo(() => resolveLabels(props.labels), [props.labels]);
  const filtersNode = resolveFiltersNode(
    props.filters,
    runtime,
    resolvedSource,
    formLabels,
    resolveFilterMode(props.filtersMode, props.headerFilters) === "header",
    props.filterFields
  );
  const filterLabels = useMemo(
    () => ({ ...runtime.filterLabels, ...props.filterLabels }),
    [runtime.filterLabels, props.filterLabels]
  );
  const { history, onCellEdit: recordingCellEdit } = useTableEditHistory<TRow>({
    ...props,
    columns: dataColumns,
  });
  const pinChrome = useAntdPinChrome({
    pinnedRowIds: props.pinnedRowIds,
    onPinnedRowIdsChange: props.onPinnedRowIdsChange,
    urlSync: props.urlSync,
    urlKey: props.urlKey,
    urlAdapter: resolvedUrlAdapter,
  });
  const chromeProps = {
    ...props,
    onCellEdit: recordingCellEdit,
    source: resolvedSource,
    filters: filtersNode,
    filterDefs: runtime.defs,
    filterLabels,
    pinnedRowIds: pinChrome.pinnedRowIds,
    onPinnedRowIdsChange: pinChrome.onPinnedRowIdsChange,
    summaryRow: bindFeatureHostFn(featureHost, props.summaryRow),
    groupAggregates: bindFeatureHostFn(featureHost, props.groupAggregates),
  };
  rememberFeatureHost(chromeProps, featureHost);
  const c = useTableChrome<TRow>(chromeProps);
  return (
    <ChromeExtrasGate chrome={c} props={chromeProps}>
      {(chrome) => (
        <AntdGroupingWindow<TRow>
          grouping={chrome.grouping}
          props={props}
          isPaged={chrome.isPaged}
          error={chrome.source.error}
          body={chrome.body}
          isMobile={chrome.isMobile}
        >
          {(grouping) => (
            <AntdTableBody<TRow>
              grouping={grouping}
              props={props}
              chromeProps={chromeProps}
              chrome={chrome}
              history={history}
              featureHost={featureHost}
              resolvedSource={resolvedSource}
              resolvedUrlAdapter={resolvedUrlAdapter}
              runtime={runtime}
              filtersNode={filtersNode}
              slots={slots}
              className={className}
              classNames={classNames}
              animate={animate}
              bordered={bordered}
              virtualize={virtualize}
              size={size}
              filtersMode={filtersMode}
            />
          )}
        </AntdGroupingWindow>
      )}
    </ChromeExtrasGate>
  );
}

/**
 * The props this module works with once `features` have applied.
 *
 * The public `DataTableProps` is what a host writes; everything past
 * `useTableFeatures` also carries what the composed features wrote, and the
 * internals below read both.
 */
type ComposedProps<TRow> = DataTableProps<TRow> & FeatureProps<TRow>;

/** The assembly bundle `tableRenderModel` accepts, named without a new export. */
type RenderModelAssembly<TRow> = Parameters<
  typeof tableRenderModel<TRow>
>[0]["assembly"];

/** Everything the body needs from the half of the table above the gate. */
interface AntdTableBodyProps<TRow> {
  readonly props: Readonly<ComposedProps<TRow>>;
  readonly chromeProps: Parameters<typeof useTableChrome<TRow>>[0];
  readonly chrome: ReturnType<typeof useTableChrome<TRow>>;
  readonly history: EditHistoryState<TRow>;
  readonly featureHost: ReturnType<typeof featureHostOf>;
  readonly resolvedSource: ReturnType<typeof useTableData<TRow>>["source"];
  readonly resolvedUrlAdapter: ReturnType<typeof useResolvedAdapter>;
  readonly runtime: ReturnType<typeof useTableData<TRow>>["runtime"];
  readonly filtersNode: ReactNode;
  readonly slots: DataTableProps<TRow>["slots"];
  readonly className: string | undefined;
  readonly classNames: DataTableProps<TRow>["classNames"];
  readonly animate: boolean;
  readonly bordered: boolean;
  readonly virtualize: boolean;
  readonly size: ReturnType<typeof resolveSize>;
  readonly filtersMode: ReturnType<typeof resolveFilterMode>;
  /**
   * The flat group/leaf list, already windowed. antd does not use the shared
   * chrome body (that hook arms a page sentinel and a leaf virtualizer, both
   * of which fight antd's own virtual Table), so the window is resolved above
   * this component and handed in.
   */
  readonly grouping: GroupingBundle<TRow> | undefined;
}

/**
 * The table itself, below the extras gate.
 *
 * Grouping, tree, expansion, editing, row mutations and row actions are empty
 * on base chrome and arrive only through `ChromeExtrasGate`, which is a
 * component — so everything that reads them, hooks included, has to live under
 * it. That is what this component is: the whole table, one level down.
 */
function AntdTableBody<TRow>({
  props,
  chromeProps,
  chrome: c,
  history,
  featureHost,
  resolvedSource,
  resolvedUrlAdapter,
  runtime,
  filtersNode,
  slots,
  className,
  classNames,
  animate,
  bordered,
  virtualize,
  size,
  filtersMode,
  grouping,
}: Readonly<AntdTableBodyProps<TRow>>) {
  const {
    windowStart,
    cardSetSize,
    find,
    gridFocus,
    stats,
    statusAnnouncement,
  } = useAntdGridState(props, c, history);
  const { confirm, getRowId } = c;
  // What the user actually sees. Hiding, ordering and collapsing a column group
  // land on `columnLayout`, which the extras gate mounts above this component;
  // progressive hiding drops columns on top of that. Base chrome's own
  // `table.columns` predates both, so the visible set is rebuilt here the same
  // way the shared shell rebuilds it.
  const table = useMemo(() => {
    const dropped = new Set(c.droppedColumns);
    const visible = c.columnLayout.visibleColumns;
    return {
      ...c.table,
      columns:
        dropped.size === 0
          ? visible
          : visible.filter((column) => !dropped.has(column.key)),
    };
  }, [c.table, c.columnLayout.visibleColumns, c.droppedColumns]);
  const { labels, source, selection } = table;
  // The injected actions column is first-class in column management: it lives
  // in the layout state under its reserved key, so hiding it strips the
  // rowActions BEFORE buildColumns — the trailing column, summary spans, and
  // min-width all adjust together. The Columns menu still lists it (from the
  // raw prop) so it can be shown again.
  const rowActions = c.rowActions;
  const hasRowActions = rowActions !== undefined;
  const [filtersOpen, setFiltersOpen] = useState(false);

  // One binding covers headers, rows and cells: the target is resolved from
  // wherever the event started, so there is no third handler to forget.
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  // Layout-visible columns WITHOUT device filtering: the same button must
  // produce the same file on phone and desktop. The selection and full column
  // set come along so `scope: "selected"` and `columns: "all"` behave here
  // exactly as they do in every other kit.
  const exportHandler = useExportHandler(
    makeExportCsvHandler(
      props.exportCsv,
      source,
      c.columnLayout.visibleColumns,
      {
        selectedIds: selection?.selectedIds,
        getRowId,
        allColumns: c.allColumns,
        // The same columns cell navigation addresses, and the same window
        // offset, so `scope: "range"` means here what it means everywhere else.
        range: gridFocus.range,
        firstRowIndex: windowStart,
        getCellSpan: props.getCellSpan,
        grouping: c.grouping,
        tree: c.tree,
        groupTotal: labels.groupTotal,
        summaryRow: chromeProps.summaryRow,
      },
      featureHost
    ),
    c.table.labels,
    // The button names the format it produces, so a spreadsheet writer relabels
    // it without the host retyping a translated string.
    resolveExportCsv(props.exportCsv, featureHost)?.writer?.extension,
    c.featureNotices.some((notice) => notice.kind === "export-all-page")
  );

  // The palette lists the table's own actions; its shortcut is bound here
  // so an adapter cannot ship one without the other.
  // The chrome owns it: progressive column hiding measures this element.
  const rootRef = c.rootRef;
  // Fullscreen also decides where every overlay portals: promoted, the rest
  // of the document is hidden, so a menu on `document.body` is invisible.
  const fullscreen = useFullscreen(rootRef.current);
  const viewControls = viewControlsToolbar(props, fullscreen);
  useChromeScrollReset(rootRef, c, chromeProps);
  // Same action the shell exposes, wired to this adapter's own root: sizing a
  // column means measuring cells, and the cells are in there.
  const onAutoSize = useCallback(() => {
    autoSizeAllColumns(
      rootRef.current,
      c.columnLayout.visibleColumns.map((column) => column.key),
      c.columnLayout.setWidth
    );
  }, [c.columnLayout, rootRef]);
  const onAutoSizeColumn = useCallback(
    (key: string) =>
      autoSizeAllColumns(rootRef.current, [key], c.columnLayout.setWidth),
    [c.columnLayout, rootRef]
  );
  useMountStagger(rootRef, [source.rows.length, c.isMobile], {
    enabled: animate,
  });
  const virtualBody = virtualize && !grouping && !c.isPaged;
  const resolvedTableLabel = table.getTableProps()["aria-label"];
  // In virtual mode the rows live inside antd's own fixed-height scroll
  // container, so the page-level sentinel never reaches the viewport — the
  // internal scroll (`handleVirtualScroll`) drives paging instead. Disable
  // the sentinel there to avoid an eager fetch from the always-visible button.
  // When grouping is armed, antd virtual is off and the page sentinel stays
  // the load-more trigger (same as mobile cards).
  const loadMoreRef = useInfiniteScroll<HTMLDivElement>({
    hasNextPage: Boolean(source.hasNextPage),
    isFetchingNextPage: Boolean(source.isFetchingNextPage),
    fetchNextPage: () => source.fetchNextPage(),
    itemCount: grouping ? grouping.entries.length : source.rows.length,
    enabled: sentinelEnabled(
      c.isPaged,
      source.error,
      Boolean(virtualBody),
      c.body
    ),
  });

  const handleVirtualScroll = virtualScrollEndHandler(
    source,
    virtualBody && !c.isPaged && !source.error
  );

  const treeEntries = c.tree?.entries;
  const treeEntryByRow = new Map<TRow, TreeEntry<TRow>>(
    treeEntries?.map((entry) => [entry.row, entry])
  );
  const dataSourceBase: readonly GroupedDataRecord<TRow>[] = grouping
    ? buildGroupedDataSource(grouping.entries)
    : (treeEntries?.map((entry) => entry.row) ?? source.rows);
  const {
    dataSource: partitionedSource,
    pinnedTopRows,
    pinnedBottomRows,
  } = antdPinnedDataSource(
    grouping,
    treeEntries,
    c.rowPinning,
    source.rows,
    getRowId,
    dataSourceBase
  );
  const dataSource = resolveAntdDataSource(
    grouping,
    partitionedSource,
    props.extraRows,
    getRowId
  );
  const { cellsByRow } = tableRenderModel({
    table,
    rows: treeEntries?.map((entry) => entry.row) ?? source.rows,
    rowActions,
    getRowId,
    renderRowDetail: props.renderRowDetail,
    expansion: c.detail?.expansion,
    editing: c.editing,
    rowReorder: c.rowReorder,
    pinnedTopRows,
    pinnedBottomRows,
    getCellSpan: props.getCellSpan,
    pinOffset: c.columnLayout.pinOffset,
    grouping: c.grouping,
    // Features that replace an assembly heavy — cell spanning, extra rows —
    // write it onto the props the feature pass returns. antd assembles its own
    // table, so it reads that here the way the shared shell does.
    assembly: (props as Partial<{ assembly: RenderModelAssembly<TRow> }>)
      .assembly,
  });
  const pinRowSticky = !bodyCellsHaveRowSpan(cellsByRow);

  const columns = buildColumns<TRow>({
    gridFocus: gridFocus,
    getHeaderCellProps: table.getHeaderCellProps,
    columns: table.columns,
    rowActions,
    rowActionsLayout: props.rowActionsLayout,
    renderRowActions: props.renderRowActions,
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    confirm,
    labels,
    editing: c.editing,
    rows: c.editingRows,
    getRowId,
    pinned: c.columnLayout.state.pinned,
    setWidth: props.resizableColumns ? c.columnLayout.setWidth : undefined,
    columnWidths: c.columnLayout.state.widths,
    resizeLabel: labels.resizeColumn,
    sortLevels: source.sortLevels,
    // Shift-click multi-sort is opt-in; without it antd keeps full control
    // of header clicks (single-sort via `onChange`).
    onToggleSortLevel: chainToggler(props.multiSort, source),
    fitColumns: props.fitColumns,
    tree: c.tree
      ? {
          columnKey: c.tree.columnKey,
          entryFor: (row: TRow) => treeEntryByRow.get(row),
          toggle: c.tree.expansion.toggle,
        }
      : undefined,
    grouping: grouping
      ? {
          collapsed: grouping.collapsed,
          dataColumnCount: table.columns.length,
          showMore: grouping.showMore,
        }
      : undefined,
    collapsibleColumnGroups: props.collapsibleColumnGroups === true,
    collapsedColumnGroups: c.columnLayout.state.collapsedGroups,
    columnGroups: c.columnGroups,
    onToggleColumnGroup: c.columnLayout.toggleColumnGroup,
    rowReorder: c.rowReorder,
    windowStart,
    cellsByRow,
    cellSpanAppearance: props.cellSpanAppearance,
    headerFilters: filtersMode === "header",
    filterDefs: runtime.defs,
    isCellFlashing: props.isCellFlashing,
    filterSource: resolvedSource,
    filterRegistry: runtime.registry,
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect === true,
  });
  // A tree is already flat by the time antd sees it: core walks the hierarchy
  // and hands back the visible rows in reading order, so antd's own
  // `childrenColumnName` recursion stays out of it and one expansion state
  // drives all nine adapters.
  const pinnedSides = Object.values(c.columnLayout.state.pinned);
  const hasPinned = pinnedSides.length > 0;
  const hasStartPin = pinnedSides.includes("start");
  const minWidth = antdMinWidth(
    table.columns,
    c.columnLayout.state.widths,
    Boolean(table.selection),
    hasRowActions,
    Boolean(c.rowReorder)
  );

  const handleChange = sortChangeHandler(source);

  const rowSelection = buildRowSelection(
    selection,
    getRowId,
    labels,
    hasStartPin
  );
  const expandable = buildExpandable(
    c.detail?.render,
    c.detail?.expansion,
    getRowId,
    labels
  );
  // The summary row pads one leading cell per column antd injects (expand
  // first, then selection) so its cells stay aligned under the data columns.
  const summary = buildSummary(
    chromeProps.summaryRow,
    table.columns,
    summaryLeadingCells(rowSelection, expandable, Boolean(c.rowReorder)),
    hasRowActions
  );
  // antd's native virtual table (and any maxHeight box) already scrolls
  // inside a fixed-height scroller. The toolbar sits outside that box, so
  // page-sticky search would detach from the card while rows scroll in the
  // box — pin the toolbar only when the page itself is the scroller.
  const inScrollBox =
    props.maxHeight != null || (virtualBody && c.body === "desktop");
  const stickyBar = useStickyToolbarLayout(
    resolveStickyToolbar(props.stickyHeader, props.stickyToolbar, inScrollBox),
    props.stickyTop ?? 0
  );
  const sticky: TableProps<unknown>["sticky"] = props.stickyHeader
    ? { offsetHeader: inScrollBox ? 0 : stickyBar.headerOffset }
    : undefined;
  // The filtered empty-state may carry its own slot: `noResults` wins there,
  // and falls through to `empty` so passing only `empty` still covers both.
  const emptySlot =
    (c.emptyVariant === "noResults" ? props.slots?.noResults : undefined) ??
    props.slots?.empty;
  const emptyNode = emptySlot ?? (
    <EmptyState
      variant={c.emptyVariant}
      labels={labels}
      onClearFilters={c.clearFilters}
    />
  );

  // Window the MOBILE card list through the seam — desktop rows still window
  // through antd's own native virtual `<Table>` when grouping is off, and when
  // grouping is armed `grouping.entries` already carries the window.
  const bodyRegion = (
    <AntdCardWindow<TRow>
      rows={source.rows}
      rowKey={getRowId}
      props={props}
      virtualize={virtualBody}
      isPaged={c.isPaged}
      error={source.error}
      body={c.body}
    >
      {(cardWindow) => (
        <DataTableBodyRegion
          gridFocus={gridFocus}
          chromeBody={c.body}
          errorState={c.errorState}
          source={source}
          editingRows={c.editingRows}
          table={table}
          slots={slots}
          columns={columns}
          rowActions={rowActions}
          rowActionsLayout={props.rowActionsLayout}
          renderRowActions={props.renderRowActions}
          confirm={confirm}
          getRowId={getRowId}
          labels={labels}
          emptyNode={emptyNode}
          grouping={grouping}
          tree={c.tree}
          detailRender={c.detail?.render}
          detailExpansion={c.detail?.expansion}
          editing={c.editing}
          cardWindow={cardWindow}
          tableLabel={resolvedTableLabel}
          density={props.density}
          prefetch={props.prefetch}
          onRowClick={props.onRowClick}
          rowClassName={props.rowClassName}
          isCellFlashing={props.isCellFlashing}
          rowStyle={props.rowStyle}
          rowHeight={props.rowHeight}
          cardClassName={classNames?.card}
          summaryRow={chromeProps.summaryRow}
          renderCard={props.renderCard}
          skeletonRows={props.skeletonRows}
          size={size}
          bordered={bordered}
          virtualize={virtualBody}
          maxHeight={props.maxHeight}
          sticky={sticky}
          dataSource={dataSource}
          rowSelection={rowSelection}
          expandable={expandable}
          summary={summary}
          handleVirtualScroll={handleVirtualScroll}
          handleChange={handleChange}
          minWidth={minWidth}
          hasPinned={hasPinned}
          hasRowActions={hasRowActions}
          rowReorder={c.rowReorder}
          windowStart={windowStart}
          cardSetSize={cardSetSize}
          rowPinning={c.rowPinning}
          pinnedTopRows={pinnedTopRows}
          pinnedBottomRows={pinnedBottomRows}
          extraRows={props.extraRows}
          pinRowSticky={pinRowSticky}
        />
      )}
    </AntdCardWindow>
  );

  const contextMenuLive = {
    contextMenu: props.contextMenu,
    columns: c.allColumns,
    labels,
    rowFor: (rowId: string) =>
      source.rows.find((row) => props.rowKey(row) === rowId),
    actions: {
      onCopy: () => {
        gridFocus.copyCells();
      },
      onSort: (key: string, dir: "asc" | "desc") => {
        source.setSort(key, dir);
      },
      onHide: (key: string) => {
        c.columnLayout.toggleVisible(key);
      },
      onFilter: () => {
        setFiltersOpen(true);
      },
    },
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    featureHost,
    container: fullscreen.container,
  } as Omit<ContextMenuLiveSlotProps<never>, "children">;

  return (
    <FeatureHostProvider host={featureHost}>
      <ContextMenuLiveGate props={contextMenuLive}>
        {(regionProps) => (
          <div
            ref={rootRef}
            {...regionProps}
            dir={props.dir}
            className={
              [className, classNames?.root].filter(Boolean).join(" ") ||
              undefined
            }
            aria-busy={c.isRefreshing || undefined}
          >
            <FeatureSlot
              slot={GRID_FOCUS_ANNOUNCER}
              props={{ focus: gridFocus }}
            />
            <TableStatusAnnouncer announcement={statusAnnouncement} />
            <AntdRowReorderAnnouncer rowReorder={c.rowReorder} />
            <FeatureSlot
              slot={FIND_BAR}
              props={{ find, labels: c.table.labels }}
            />
            <Space
              orientation="vertical"
              size="small"
              style={{ width: "100%" }}
            >
              <div
                data-adapttable-part="toolbar"
                ref={stickyBar.toolbarRef}
                className={classNames?.toolbar}
                style={stickyBar.toolbarStyle}
              >
                <Toolbar
                  table={table}
                  searchable={props.searchable !== false}
                  searchPlaceholder={props.searchPlaceholder}
                  sortByOptions={props.sortByOptions}
                  toolbar={props.toolbar}
                  toolbarSlots={props.toolbarSlots}
                  {...undoRedoToolbar(props.undoRedoButtons, history, labels)}
                  {...printToolbar(props.printButton, props.onPrint, labels)}
                  {...viewControls}
                  hasFilters={toolbarShowsFilters(
                    filtersMode,
                    Boolean(filtersNode),
                    Boolean(resolvedSource.setFilterTree)
                  )}
                  activeFilterCount={c.activeFilterCount}
                  filters={filtersNode}
                  filtersMode={filtersMode}
                  filtersOpen={filtersOpen}
                  onToggleFilters={filtersTrigger.onClick}
                  onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
                  onCloseFilters={() => setFiltersOpen(false)}
                  onClearFilters={c.clearFilters}
                  onAddRow={
                    c.rowMutations.canAdd ? c.rowMutations.addRow : undefined
                  }
                  addRowLabel={labels.addRow}
                  isRefreshing={c.isRefreshing}
                  dir={props.dir}
                  columnMenu={
                    <ColumnMenuSlot
                      onAutoSize={onAutoSize}
                      onAutoSizeColumn={onAutoSizeColumn}
                      onSortColumn={(key, dir) => source.setSort(key, dir)}
                      onFilterColumn={() => setFiltersOpen(true)}
                      sortBy={source.sortBy}
                      sortDir={source.sortDir}
                      enabled={Boolean(props.enableColumnMenu) && !c.isMobile}
                      allColumns={c.allColumns}
                      layout={c.columnLayout}
                      labels={labels}
                      dir={props.dir}
                      hasRowActions={c.hasRowActions}
                      hasRowReorder={c.hasRowReorder}
                    />
                  }
                  {...exportHandler}
                  savedViewsMenu={
                    <SavedViewsSlot
                      options={props.savedViews}
                      urlAdapter={resolvedUrlAdapter}
                      urlKey={props.urlKey}
                      labels={labels}
                    />
                  }
                  showRowsPerPage={!c.isPaged}
                />
              </div>
              <FeatureSlot
                slot={ACTIVE_FILTER_CHIPS}
                props={{
                  chips: c.mergedChips,
                  onClearAll: c.clearFilters,
                  labels,
                }}
              />
              {c.editing?.batch && (
                <FeatureSlot
                  slot={BATCH_EDIT_BAR}
                  props={{ batch: c.editing.batch, labels }}
                />
              )}

              {selection && props.bulkActions && (
                <FeatureSlot
                  slot={BULK_BAR}
                  props={{
                    selection,
                    total: source.total,
                    bulkActions: props.bulkActions,
                    confirm,
                    labels,
                  }}
                />
              )}
              <div
                className={c.body === "desktop" ? classNames?.table : undefined}
              >
                <OptionalSidePanel
                  side={props.sidePanel?.side}
                  body={bodyRegion}
                  panel={
                    props.sidePanel?.open != null && (
                      <FeatureSlot
                        slot={SIDE_PANEL}
                        props={{
                          panels: props.sidePanel.panels,
                          openPanel: props.sidePanel.open,
                          onOpenPanel: props.sidePanel.onOpenChange,
                          onClose: () => {
                            props.sidePanel?.onOpenChange(null);
                          },
                          side: props.sidePanel?.side,
                          labels,
                        }}
                      />
                    )
                  }
                />
              </div>
              <TableFooterSlot>{props.tableFooter}</TableFooterSlot>
              {c.isPaged && !source.error && c.body === "desktop" && (
                <div className={classNames?.footer}>
                  <PagedFooter
                    table={table}
                    source={source}
                    labels={labels}
                    showRowsPerPage={!c.grouping}
                  />
                </div>
              )}
              {!c.isPaged && !source.error && source.hasNextPage && (
                <Flex ref={loadMoreRef} justify="center">
                  <Button
                    loading={source.isFetchingNextPage}
                    onClick={() => source.fetchNextPage()}
                  >
                    {labels.loadMore}
                  </Button>
                </Flex>
              )}
            </Space>
            {filtersNode && filtersMode === "drawer" && (
              <FeatureSlot
                slot={FILTER_DRAWER}
                props={{
                  open: filtersOpen,
                  onClose: () => setFiltersOpen(false),
                  filters: filtersNode,
                  activeFilterCount: c.activeFilterCount,
                  onClearFilters: c.clearFilters,
                  labels,
                  dir: props.dir,
                }}
              />
            )}
            <FeatureSlot
              slot={COMMAND_PALETTE_LIVE}
              props={{
                commandPalette: props.commandPalette,
                labels,
                onPrint: props.onPrint,
                onExport: exportHandler.onExportCsv,
                onClearFilters: c.clearFilters,
                hasFilters: c.activeFilterCount > 0,
                featureHost,
              }}
            />
            <FeatureSlot
              slot={STATUS_BAR}
              props={{
                enabled: props.statusBar === true,
                notices: c.featureNotices,
                shown: source.rows.length,
                page: source.page,
                limit: source.limit,
                total: source.total,
                selected: table.selection?.selectedCount ?? 0,
                stats,
                labels,
                locale: props.locale,
              }}
            />
          </div>
        )}
      </ContextMenuLiveGate>
    </FeatureHostProvider>
  );
}

/**
 * Resolve `features` and mount whatever providers they contribute, then render
 * the table inside them.
 *
 * A feature that owns hooks owns a component, so its provider has to sit ABOVE
 * the body that reads what it publishes — that is the whole reason this is two
 * components rather than one.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const props = useTableFeatures(incoming);
  return (
    <FeatureProviders props={props}>
      <DataTableContent<TRow> {...props} />
    </FeatureProviders>
  );
}

import {
  ACTIONS_COLUMN_KEY,
  type ColumnDef,
  type ConfirmHandler,
  DEFAULT_CARD_SIZE_PX,
  type FilterRuntime,
  type GroupCollapseState,
  type GroupedFlatEntry,
  isDeclarativeFilters,
  makeExportCsvHandler,
  pageSizeOptions,
  resolveLabels,
  rowClickProps,
  type RowExpansionState,
  type SelectionState,
  type TableLabels,
  tableMinWidth,
  type TableSource,
  type UrlStateAdapter,
  useChromeScrollReset,
  type UseColumnLayoutResult,
  type UseDataTableResult,
  useFilterTriggerToggle,
  useInfiniteScroll,
  useKeyedVirtualization,
  useMountStagger,
  useResolvedAdapter,
  type UseSavedViewsOptions,
  useTableChrome,
  useTableData,
  useTableVirtualization,
  windowGroupedEntries,
} from "@adapttable/core";
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
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
  type UIEventHandler,
  useMemo,
  useRef,
  useState,
} from "react";

import { buildColumns, logicalAlign } from "./columns";
import { AutoFilterForm } from "./components/AutoFilterForm";
import {
  BulkBar,
  Chips,
  ErrorState,
  FilterDrawer,
  Toolbar,
} from "./components/chrome";
import { ColumnMenu } from "./components/ColumnMenu";
import { ExpandToggle } from "./components/ExpandToggle";
import {
  buildGroupedDataSource,
  type GroupedDataRecord,
  groupedRowKey,
  GroupSelectionCheckbox,
  isAdaptTableGroupRow,
} from "./components/grouping";
import { MobileCards } from "./components/MobileCards";
import { SavedViewsMenu } from "./components/SavedViewsMenu";
import { SkeletonTable } from "./components/SkeletonTable";
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
  hasActions: boolean
): number {
  return tableMinWidth(columns, {
    widths,
    extra: (hasSelection ? 48 : 0) + (hasActions ? 120 : 0),
  });
}

/** antd scroll config: virtual sizing, else x for pinning + y for the box. */
function resolveScroll(
  virtualize: boolean,
  virtualWidth: number,
  virtualHeight: number,
  hasPinned: boolean,
  maxHeight: number | undefined,
  minWidth: number
): NonNullable<TableProps<unknown>["scroll"]> {
  // Virtual rows need explicit x/y so antd can size its internal scroller.
  if (virtualize) return { x: virtualWidth, y: virtualHeight };
  // Pinning needs content-driven width; otherwise a fixed-width column set
  // gets its summed min-width so the table scrolls instead of squishing.
  let x: number | "max-content" | undefined;
  if (hasPinned) x = "max-content";
  else if (minWidth > 0) x = minWidth;
  return { x, y: maxHeight };
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
  if (isAdaptTableGroupRow(record)) {
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
      if (isAdaptTableGroupRow(record)) return;
      selection.toggle(getRowId(record));
    },
    getCheckboxProps: (record): RowSelectionCheckboxProps => {
      const isGroup = isAdaptTableGroupRow(record);
      return {
        disabled: isGroup || undefined,
        style: isGroup ? { display: "none" } : undefined,
        title: isGroup ? undefined : labels.selectRow,
      };
    },
    // Group headers render a tri-state over leaf ids; leaf rows keep antd's node.
    renderCell: (_checked, record, _index, originNode) =>
      selectionCellNode(record, selection, labels, originNode),
    // Select-all is driven by the custom `columnTitle` checkbox below; with
    // `columnTitle` set antd never renders its own header checkbox, so an
    // `onSelectAll` callback could never fire.
    columnTitle: (
      <Checkbox
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
      if (isAdaptTableGroupRow(row)) return;
      expansion.toggle(getRowId(row));
    },
    rowExpandable: (row) => !isAdaptTableGroupRow(row),
    expandedRowRender: (row) =>
      isAdaptTableGroupRow(row) ? null : renderRowDetail(row),
    expandIcon: ({ expanded, onExpand, record }) => {
      if (isAdaptTableGroupRow(record)) return null;
      return (
        <ExpandToggle
          expanded={expanded}
          labels={labels}
          onClick={(event) => onExpand(record, event)}
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
}: Readonly<{
  enabled: boolean;
  allColumns: ColumnDef<TRow>[];
  layout: UseColumnLayoutResult<TRow>;
  labels: Required<TableLabels>;
  dir?: "ltr" | "rtl";
  hasRowActions: boolean;
}>) {
  if (!enabled) return null;
  return (
    <ColumnMenu
      allColumns={allColumns}
      layout={layout}
      labels={labels}
      dir={dir}
      hasRowActions={hasRowActions}
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
  dir,
}: Readonly<{
  options: UseSavedViewsOptions | undefined;
  urlAdapter: UrlStateAdapter | undefined;
  urlKey: string | undefined;
  labels: Required<TableLabels>;
  dir?: "ltr" | "rtl";
}>) {
  if (!options) return null;
  return (
    <SavedViewsMenu
      options={{ urlAdapter, urlKey, ...options }}
      labels={labels}
      dir={dir}
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
    | ((rows: readonly TRow[]) => Partial<Record<string, ReactNode>>)
    | undefined,
  columns: readonly ColumnDef<TRow>[],
  leadingCells: number,
  hasActions: boolean
): TableProps<GroupedDataRecord<TRow>>["summary"] {
  if (!summaryRow) return undefined;
  return function SummaryCells(pageData) {
    const leafRows = pageData.filter(
      (record): record is TRow => !isAdaptTableGroupRow(record)
    );
    const cells = summaryRow(leafRows);
    return (
      <Table.Summary.Row>
        {Array.from({ length: leadingCells }, (_, i) => (
          <Table.Summary.Cell key={`lead-${i}`} index={i} />
        ))}
        {columns.map((column, i) => (
          <Table.Summary.Cell key={column.key} index={leadingCells + i}>
            <div style={{ textAlign: logicalAlign(column.align) }}>
              {cells[column.key]}
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
function summaryLeadingCells(rowSelection: unknown, expandable: unknown) {
  return (rowSelection ? 1 : 0) + (expandable ? 1 : 0);
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
              options={pageSizeOptions(source.limit).map((n) => ({
                value: n,
                label: n,
              }))}
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
  labels: Required<TableLabels>
) {
  if (runtime.defs.length === 0) return undefined;
  return <AutoFilterForm defs={runtime.defs} source={source} labels={labels} />;
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
 * touches that path. Cards flow in the page (no inner scroll box), so the
 * page-level sentinel stays the single load-more trigger — the window needs no
 * second sentinel of its own.
 */
function useCardWindowing<TRow>(options: {
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  virtualize: boolean;
  isPaged: boolean;
  error: Error | null;
  body: string;
  estimateCardSize?: number;
  overscan?: number;
  scrollMargin?: number;
}) {
  const virtualization = useTableVirtualization({
    rows: options.rows,
    rowKey: options.rowKey,
    enabled:
      options.virtualize &&
      !options.isPaged &&
      !options.error &&
      options.body === "mobile",
    estimateSize: options.estimateCardSize ?? DEFAULT_CARD_SIZE_PX,
    overscan: options.overscan,
    scrollMargin: options.scrollMargin,
  });
  return {
    rowEntries: virtualization.enabled ? virtualization.rows : undefined,
    paddingTop: virtualization.paddingTop,
    paddingBottom: virtualization.paddingBottom,
    measureElement: virtualization.measureElement,
  };
}

/** Row-grouping bundle from `useTableChrome` (opt-in when `groupBy` is set). */
interface GroupingBundle<TRow> {
  groupBy: string;
  collapsed: GroupCollapseState;
  entries: readonly GroupedFlatEntry<TRow>[];
  setGroupBy: (key: string | null) => void;
}

/**
 * Window grouped flat entries when virtualization is eligible. Grouping stays
 * dormant when chrome does not supply a bundle (no effective `groupBy`).
 */
function useGroupingWindow<TRow>(options: {
  grouping: GroupingBundle<TRow> | undefined;
  virtualize: boolean;
  isPaged: boolean;
  error: Error | null;
  body: string;
  isMobile: boolean;
  estimateCardSize?: number;
  virtualOverscan?: number;
  virtualScrollMargin?: number;
}): GroupingBundle<TRow> | undefined {
  const groupingArmed = Boolean(options.grouping);
  const groupKeys = options.grouping?.entries.map((entry) => entry.key) ?? [];
  const groupBodyEligible =
    groupingArmed &&
    !options.isPaged &&
    !options.error &&
    (options.body === "desktop" || options.body === "mobile");
  const groupVirtualization = useKeyedVirtualization({
    keys: groupKeys,
    enabled: Boolean(options.virtualize && groupBodyEligible),
    estimateSize: options.isMobile
      ? (options.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
      : 56,
    overscan: options.virtualOverscan,
    scrollMargin: options.virtualScrollMargin,
  });
  const groupingEntries = options.grouping
    ? windowGroupedEntries(
        options.grouping.entries,
        groupVirtualization.indices
      )
    : undefined;
  if (!options.grouping || !groupingEntries) return options.grouping;
  return { ...options.grouping, entries: groupingEntries };
}

/** Props shared by mobile and desktop body regions. */
interface DataTableBodyRegionProps<TRow> {
  chromeBody: string;
  source: TableSource<TRow>;
  /** Editing row universe from chrome — grouped leaf set or page slice. */
  editingRows: readonly TRow[];
  table: UseDataTableResult<TRow>;
  slots: DataTableProps<TRow>["slots"];
  columns: ReturnType<typeof buildColumns<TRow>>;
  rowActions: DataTableProps<TRow>["rowActions"];
  confirm: ConfirmHandler;
  getRowId: (row: TRow) => string;
  labels: Required<TableLabels>;
  emptyNode: ReactNode;
  grouping: GroupingBundle<TRow> | undefined;
  detailRender: ((row: TRow) => ReactNode) | undefined;
  detailExpansion: RowExpansionState | undefined;
  editing: NonNullable<ReturnType<typeof useTableChrome<TRow>>>["editing"];
  cardWindow: ReturnType<typeof useCardWindowing<TRow>>;
  tableLabel: string | undefined;
  density: "comfortable" | "compact" | undefined;
  prefetch: DataTableProps<TRow>["prefetch"];
  onRowClick: DataTableProps<TRow>["onRowClick"];
  rowClassName: DataTableProps<TRow>["rowClassName"];
  cardClassName: string | undefined;
  summaryRow: DataTableProps<TRow>["summaryRow"];
  skeletonRows: number | undefined;
  size: AntdTableSize;
  bordered: boolean;
  virtualize: boolean;
  virtualHeight: number;
  virtualWidth: number;
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
  onRowClick,
  prefetch,
  virtualWidth,
  virtualHeight,
  hasPinned,
  maxHeight,
  minWidth,
  emptyNode,
}: Readonly<{
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
  rowClassName: DataTableProps<TRow>["rowClassName"];
  onRowClick: DataTableProps<TRow>["onRowClick"];
  prefetch: DataTableProps<TRow>["prefetch"];
  virtualWidth: number;
  virtualHeight: number;
  hasPinned: boolean;
  maxHeight: number | undefined;
  minWidth: number;
  emptyNode: ReactNode;
}>) {
  return (
    <Table<GroupedDataRecord<TRow>>
      aria-label={tableLabel}
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
      onRow={(record) => {
        if (isAdaptTableGroupRow(record)) {
          return {
            "data-adapttable-part": "group-row",
            "data-collapsed": record.collapsed ? "true" : undefined,
          } as HTMLAttributes<HTMLElement>;
        }
        return {
          ...rowClickProps(record, onRowClick),
          "data-stagger": "",
          onMouseEnter: prefetch ? () => prefetch(record) : undefined,
        };
      }}
      scroll={resolveScroll(
        virtualize && !grouping,
        virtualWidth,
        virtualHeight,
        hasPinned,
        maxHeight,
        minWidth
      )}
      locale={{ emptyText: emptyNode }}
    />
  );
}

/**
 * The table body region (error, skeleton, empty, mobile cards, desktop table).
 * Extracted outside `DataTable` to keep cognitive complexity within budget.
 */
function DataTableBodyRegion<TRow>(
  props: Readonly<DataTableBodyRegionProps<TRow>>
): ReactNode {
  const {
    chromeBody,
    source,
    editingRows,
    table,
    slots,
    columns,
    rowActions,
    confirm,
    getRowId,
    labels,
    emptyNode,
    grouping,
    detailRender,
    detailExpansion,
    editing,
    cardWindow,
    tableLabel,
    density,
    prefetch,
    onRowClick,
    rowClassName,
    cardClassName,
    summaryRow,
    skeletonRows,
    size,
    bordered,
    virtualize,
    virtualHeight,
    virtualWidth,
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
  } = props;

  let body: ReactNode;
  if (source.error) {
    body = (
      <ErrorState
        error={source.error}
        labels={labels}
        onRetry={source.refetch ? () => void source.refetch?.() : undefined}
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
    body = slots?.empty ?? <output>{emptyNode}</output>;
  } else if (chromeBody === "mobile") {
    body = (
      <MobileCards
        table={table}
        cardClassName={cardClassName}
        rows={editingRows}
        rowActions={rowActions}
        confirm={confirm}
        getRowId={getRowId}
        prefetch={prefetch}
        onRowClick={onRowClick}
        rowClassName={rowClassName}
        tableLabel={tableLabel}
        compact={(density ?? "comfortable") === "compact"}
        expansion={detailExpansion}
        editing={editing}
        grouping={grouping}
        renderRowDetail={detailRender}
        summaryRow={summaryRow}
        {...cardWindow}
      />
    );
  } else {
    body = (
      <DesktopTableBody
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
        onRowClick={onRowClick}
        prefetch={prefetch}
        virtualWidth={virtualWidth}
        virtualHeight={virtualHeight}
        hasPinned={hasPinned}
        maxHeight={maxHeight}
        minWidth={minWidth}
        emptyNode={emptyNode}
      />
    );
  }
  return body;
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
export function DataTable<TRow>(props: Readonly<DataTableProps<TRow>>) {
  const {
    slots,
    className,
    classNames,
    animate = false,
    bordered = false,
    virtualize = false,
    virtualHeight = 480,
    virtualWidth = 960,
  } = props;
  const size = resolveSize(props.size, props.density);
  const filtersMode = props.filtersMode ?? "popover";
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
  const { source: resolvedSource, runtime } = useTableData<TRow>({
    locale: props.locale,
    source: props.source,
    data: props.data,
    total: props.total,
    loading: props.loading,
    mode: props.mode,
    onQueryChange: props.onQueryChange,
    urlAdapter: resolvedUrlAdapter,
    urlSync: props.urlSync,
    urlKey: props.urlKey,
    columns: props.columns,
    filters: props.filters,
    defaults: props.defaults,
    paginationMode: props.paginationMode,
  });
  // A declarative `filters` array becomes the auto-built form; JSX passes
  // through untouched. Column-level `filter` shorthands alone (no `filters`
  // prop) must still render the form — only explicit JSX takes over. The
  // form needs the resolved labels before `useTableChrome` resolves its own
  // (the chrome consumes the form node), so resolve the same prop here.
  const formLabels = useMemo(() => resolveLabels(props.labels), [props.labels]);
  const filtersNode =
    isDeclarativeFilters(props.filters) || props.filters === undefined
      ? autoFilterForm(runtime, resolvedSource, formLabels)
      : props.filters;
  const filterLabels = useMemo(
    () => ({ ...runtime.filterLabels, ...props.filterLabels }),
    [runtime.filterLabels, props.filterLabels]
  );
  const chromeProps = {
    ...props,
    source: resolvedSource,
    filters: filtersNode,
    filterLabels,
  };
  const c = useTableChrome<TRow>(chromeProps);
  const { table, confirm, getRowId } = c;
  const { labels, source, selection } = table;
  // The injected actions column is first-class in column management: it lives
  // in the layout state under its reserved key, so hiding it strips the
  // rowActions BEFORE buildColumns — the trailing column, summary spans, and
  // min-width all adjust together. The Columns menu still lists it (from the
  // raw prop) so it can be shown again.
  const rowActions = c.columnLayout.isHidden(ACTIONS_COLUMN_KEY)
    ? undefined
    : props.rowActions;
  const hasRowActions = Boolean(rowActions?.length);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTrigger = useFilterTriggerToggle(filtersOpen, setFiltersOpen);
  const rootRef = useRef<HTMLDivElement>(null);
  useChromeScrollReset(rootRef, c, chromeProps);
  useMountStagger(rootRef, [source.rows.length, c.isMobile], {
    enabled: animate,
  });
  // antd does not use useChromeBodyData (that hook arms a page sentinel + leaf
  // virtualizer with onEndReached — both fight antd's native virtual Table).
  // When grouping is armed we window the flat group/leaf list ourselves.
  const grouping = useGroupingWindow({
    grouping: c.grouping,
    virtualize,
    isPaged: c.isPaged,
    error: source.error,
    body: c.body,
    isMobile: c.isMobile,
    estimateCardSize: props.estimateCardSize,
    virtualOverscan: props.virtualOverscan,
    virtualScrollMargin: props.virtualScrollMargin,
  });
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
      Boolean(virtualize && !grouping),
      c.body
    ),
  });

  const handleVirtualScroll = virtualScrollEndHandler(
    source,
    virtualize && !grouping && !c.isPaged && !source.error
  );

  // Window the MOBILE card list with core virtualization — desktop rows still
  // window through antd's own native virtual `<Table>` when grouping is off.
  // When grouping is armed, grouping.entries already carries the window.
  const cardWindow = useCardWindowing({
    rows: source.rows,
    rowKey: getRowId,
    virtualize: virtualize && !grouping,
    isPaged: c.isPaged,
    error: source.error,
    body: c.body,
    estimateCardSize: props.estimateCardSize,
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
  });

  const columns = buildColumns<TRow>({
    columns: table.columns,
    rowActions,
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
    grouping: grouping
      ? {
          collapsed: grouping.collapsed,
          dataColumnCount: table.columns.length,
        }
      : undefined,
  });
  const dataSource: readonly GroupedDataRecord<TRow>[] = grouping
    ? buildGroupedDataSource(grouping.entries)
    : source.rows;
  const pinnedSides = Object.values(c.columnLayout.state.pinned);
  const hasPinned = pinnedSides.length > 0;
  const hasStartPin = pinnedSides.includes("start");
  const minWidth = antdMinWidth(
    table.columns,
    c.columnLayout.state.widths,
    Boolean(table.selection),
    hasRowActions
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
    props.summaryRow,
    table.columns,
    summaryLeadingCells(rowSelection, expandable),
    hasRowActions
  );
  const sticky: TableProps<unknown>["sticky"] = props.stickyHeader
    ? { offsetHeader: props.stickyTop ?? 0 }
    : undefined;
  const emptyNode = (
    <EmptyState
      variant={c.emptyVariant}
      labels={labels}
      onClearFilters={c.clearFilters}
    />
  );

  const bodyRegion = (
    <DataTableBodyRegion
      chromeBody={c.body}
      source={source}
      editingRows={c.editingRows}
      table={table}
      slots={slots}
      columns={columns}
      rowActions={rowActions}
      confirm={confirm}
      getRowId={getRowId}
      labels={labels}
      emptyNode={emptyNode}
      grouping={grouping}
      detailRender={c.detail?.render}
      detailExpansion={c.detail?.expansion}
      editing={c.editing}
      cardWindow={cardWindow}
      tableLabel={resolvedTableLabel}
      density={props.density}
      prefetch={props.prefetch}
      onRowClick={props.onRowClick}
      rowClassName={props.rowClassName}
      cardClassName={classNames?.card}
      summaryRow={props.summaryRow}
      skeletonRows={props.skeletonRows}
      size={size}
      bordered={bordered}
      virtualize={virtualize}
      virtualHeight={virtualHeight}
      virtualWidth={virtualWidth}
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
    />
  );

  return (
    <div
      ref={rootRef}
      dir={props.dir}
      className={
        [className, classNames?.root].filter(Boolean).join(" ") || undefined
      }
      aria-busy={c.isRefreshing || undefined}
    >
      <Space orientation="vertical" size="small" style={{ width: "100%" }}>
        <div className={classNames?.toolbar}>
          <Toolbar
            table={table}
            searchable={props.searchable ?? props.hideSearch !== true}
            searchPlaceholder={props.searchPlaceholder}
            sortByOptions={props.sortByOptions}
            toolbar={props.toolbar}
            hasFilters={Boolean(filtersNode)}
            activeFilterCount={c.activeFilterCount}
            filters={filtersNode}
            filtersMode={filtersMode}
            filtersOpen={filtersOpen}
            onToggleFilters={filtersTrigger.onClick}
            onFiltersTriggerPointerDown={filtersTrigger.onPointerDown}
            onCloseFilters={() => setFiltersOpen(false)}
            onClearFilters={c.clearFilters}
            isRefreshing={c.isRefreshing}
            dir={props.dir}
            columnMenu={
              <ColumnMenuSlot
                enabled={Boolean(props.enableColumnMenu) && !c.isMobile}
                allColumns={c.allColumns}
                layout={c.columnLayout}
                labels={labels}
                dir={props.dir}
                hasRowActions={Boolean(props.rowActions?.length)}
              />
            }
            onExportCsv={makeExportCsvHandler(
              props.exportCsv,
              source,
              // Layout-visible columns WITHOUT device filtering: the same
              // button must produce the same file on phone and desktop.
              c.columnLayout.visibleColumns
            )}
            savedViewsMenu={
              <SavedViewsSlot
                options={props.savedViews}
                urlAdapter={resolvedUrlAdapter}
                urlKey={props.urlKey}
                labels={labels}
                dir={props.dir}
              />
            }
            showRowsPerPage={!c.isPaged}
          />
        </div>
        <Chips
          chips={c.mergedChips}
          onClearAll={c.clearFilters}
          labels={labels}
        />
        {selection && props.bulkActions && (
          <BulkBar
            selection={selection}
            total={source.total}
            bulkActions={props.bulkActions}
            confirm={confirm}
            labels={labels}
          />
        )}
        <div className={c.body === "desktop" ? classNames?.table : undefined}>
          {bodyRegion}
        </div>
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
        <FilterDrawer
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          filters={filtersNode}
          activeFilterCount={c.activeFilterCount}
          onClearFilters={c.clearFilters}
          labels={labels}
          dir={props.dir}
        />
      )}
    </div>
  );
}

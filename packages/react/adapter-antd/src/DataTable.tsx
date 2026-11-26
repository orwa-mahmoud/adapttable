import {
  type ColumnDef,
  HeaderFilterOpenProvider,
  type RowExpansionState,
  type SelectionState,
  type UseDataTableResult,
} from "@adapttable/react";
import {
  bodyCellsHaveRowSpan,
  COLUMN_HEADER_RENAME,
  columnsHaveFooter,
  type ConfirmHandler,
  type DataTableShellResult,
  DEFAULT_CARD_SIZE_PX,
  type EditableCellEditing,
  EXTRA_OVER_SPAN_ROW_STYLE,
  EXTRA_ROW_PARTS,
  type FeatureProps,
  FeatureProviders,
  FeatureSlot,
  fillSlot,
  type GridFocusState,
  type GroupByInput,
  type GroupCollapseState,
  type GroupedFlatEntry,
  GROUPING_STATE,
  type GroupingState,
  isBodyEligible,
  isExtraEntry,
  KEYED_WINDOW,
  type KeyedVirtualization,
  type KeyedWindow,
  type KeyedWindowSlotProps,
  type KitSkeletonShape,
  type KitTable,
  type KitTableFrameProps,
  type KitTableProps,
  type KitToolbarProps,
  mobileCardListStyle,
  partitionPinnedRows,
  pinnedRowPart,
  pinnedRowStickyStyle,
  pinnedSummaryPart,
  pinnedSummaryRowId,
  ReducedMotionScope,
  renderedRowsOf,
  REORDER_COLUMN_WIDTH,
  resolveColumnFooter,
  resolveFilterMode,
  resolveRowStyle,
  rowClickProps,
  rowIsDirty,
  type RowPinningState,
  type RowPinSide,
  rowReorderDropStyle,
  type RowReorderState,
  TableComposition,
  type TableErrorState,
  type TableLabels,
  tableMinWidth,
  tableRenderModel,
  type TableSource,
  TREE_STATE,
  type TreeEntry,
  treeRowAria,
  type TreeState,
  treeTableAria,
  useFeatureSlotFilled,
  useFeatureState,
  useLocaleLabels,
  useMountStagger,
  useOffsetHeight,
  type useTableChrome,
  useTableFeatures,
  type VirtualTableRow,
  windowGroupedEntries,
  withKitEnvironment,
  withRowDropTarget,
} from "@adapttable/react/adapter";
import {
  Button,
  Checkbox,
  ConfigProvider,
  Empty,
  Flex,
  Space,
  Table,
  type TableProps,
} from "antd";
import {
  createContext,
  type CSSProperties,
  type HTMLAttributes,
  type Key,
  type ReactNode,
  type Ref,
  type TdHTMLAttributes,
  type UIEventHandler,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { useAntdTableParts } from "./antdParts";
import {
  type AntdRowScroll,
  AntdRowScrollContext,
  type AntdTableRef,
  KeyedScrollRegistration,
  useAntdRowScroll,
  useAntdRowScrollHandles,
} from "./antdRowScroll";
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
import { footer } from "./components/PaginationFooter";
import { SkeletonTable } from "./components/SkeletonTable";
import { Toolbar } from "./components/Toolbar";
import { useAntdLibrary } from "./libraryEnvironment";
import type { DataTableProps } from "./types";

// Table always nests its rows in Spin, even when loading is false. Its
// default live region would repeat every cell beside our status announcer.
const SILENT_TABLE_LOADING = { spinning: false, "aria-live": "off" };

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
 * antd's `Empty` with the host's words in its illustration too. The picture
 * carries an SVG `<title>` read from antd's locale, which would otherwise
 * keep saying antd's own "No data" beside a localized description — as a
 * hover tooltip, and to assistive tech. The title takes the description, and
 * the picture is hidden from assistive tech so the message is heard once.
 */
function LocalizedEmpty({
  description,
  children,
}: Readonly<{ description: string; children?: ReactNode }>) {
  const { locale } = useContext(ConfigProvider.ConfigContext);
  return (
    <ConfigProvider
      locale={{
        ...locale,
        locale: locale?.locale ?? "en",
        Empty: { description },
      }}
    >
      <Empty
        data-adapttable-part="empty"
        description={description}
        image={
          <div aria-hidden="true" style={{ height: "100%" }}>
            {Empty.PRESENTED_IMAGE_DEFAULT}
          </div>
        }
      >
        {children}
      </Empty>
    </ConfigProvider>
  );
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
  if (variant === "noData")
    return <LocalizedEmpty description={labels.noData} />;
  return (
    <LocalizedEmpty description={labels.noResults}>
      <Button onClick={onClearFilters}>{labels.clearAll}</Button>
    </LocalizedEmpty>
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
  "data-index"?: number;
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

function antdExtraOrGroupRowAttrs<TRow>(
  record: GroupedDataRecord<TRow>
): AntdRowHtmlAttrs | undefined {
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
  return undefined;
}

function antdSummaryRowAttrs(
  side: RowPinSide,
  index: number,
  labels: Required<TableLabels>,
  pinRowSticky: boolean,
  headerOffset: number,
  rowIndex: number | undefined,
  gridFocus: GridFocusState | undefined
): AntdRowHtmlAttrs {
  return {
    role: "row",
    "aria-label": labels.pinnedSummaryRow,
    "data-row-pin": side,
    "data-adapttable-part": pinnedSummaryPart(side),
    "data-row-id": pinnedSummaryRowId(side, index),
    ...(pinRowSticky
      ? { style: pinnedRowStickyStyle(side, headerOffset) }
      : {}),
    ...(rowIndex === undefined ? {} : gridFocus?.getRowPropsAt(rowIndex)),
  };
}

function antdOnRow<TRow>(options: {
  record: GroupedDataRecord<TRow>;
  rowIndex: number | undefined;
  reorderIndices: ReadonlyMap<string, number> | undefined;
  getRowId: (row: TRow) => string;
  rowPinning: RowPinningState<TRow> | undefined;
  pinnedSummaryTop?: readonly TRow[];
  pinnedSummaryBottom?: readonly TRow[];
  headerOffset: number;
  /** Sticky pin chrome — off when a cell span would overlay the next rows. */
  pinRowSticky: boolean;
  rowReorder: RowReorderState<TRow> | undefined;
  windowStart: number;
  gridFocus: GridFocusState | undefined;
  onRowClick: DataTableProps<TRow>["onRowClick"];
  editing: EditableCellEditing<TRow> | undefined;
  prefetch: DataTableProps<TRow>["prefetch"];
  rowStyle: ComposedProps<TRow>["rowStyle"];
  rowHeight: ComposedProps<TRow>["rowHeight"];
  labels: Required<TableLabels>;
  /** The selected row keys, when rows are selectable. */
  selectedRowKeys: readonly Key[] | undefined;
  /** The tree's entries by row id, while the rows are a tree. */
  treeById: ReadonlyMap<string, TreeEntry<TRow>> | undefined;
}): AntdRowHtmlAttrs {
  const {
    record,
    rowIndex,
    reorderIndices,
    getRowId,
    rowPinning,
    pinnedSummaryTop = [],
    pinnedSummaryBottom = [],
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
    labels,
    selectedRowKeys,
    treeById,
  } = options;
  const extraOrGroup = antdExtraOrGroupRowAttrs(record);
  if (extraOrGroup) return extraOrGroup;
  const row = record as TRow;
  const topIndex = pinnedSummaryTop.indexOf(row);
  const bottomIndex = pinnedSummaryBottom.indexOf(row);
  if (topIndex >= 0) {
    return antdSummaryRowAttrs(
      "top",
      topIndex,
      labels,
      pinRowSticky,
      headerOffset,
      rowIndex,
      gridFocus
    );
  }
  if (bottomIndex >= 0) {
    return antdSummaryRowAttrs(
      "bottom",
      bottomIndex,
      labels,
      pinRowSticky,
      headerOffset,
      rowIndex,
      gridFocus
    );
  }
  const id = getRowId(row);
  const pin = antdPinnedRowAttrs(
    rowPinning?.sideOf(id),
    headerOffset,
    pinRowSticky
  );
  const visual = resolveRowStyle(rowStyle, rowHeight, row, rowIndex ?? 0);
  const reorderIndex = reorderIndices?.get(id);
  const reorderAttrs =
    rowReorder && reorderIndex !== undefined
      ? liveReorderAttrs(rowReorder, id, reorderIndex)
      : undefined;
  const reorderStyle = reorderAttrs
    ? rowReorderDropStyle(reorderAttrs)
    : undefined;
  return {
    ...rowClickProps(row, onRowClick, rowIndex),
    ...(rowReorder && reorderIndex !== undefined
      ? {
          ...rowReorder.dropProps(reorderIndex, row, windowStart),
          ...reorderAttrs,
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
    // A tree row's level, open state and place among its siblings.
    ...treeRowAria(treeById?.get(id)),
    // The rest of core's row identity, which the other kits spread: the row's
    // index, and whether it is selected when rows are selectable.
    "data-index": rowIndex,
    "aria-selected":
      selectedRowKeys === undefined ? undefined : selectedRowKeys.includes(id),
    ...pin,
    style: {
      // Under a sticky header a row brought into view (keyboard focus, find)
      // stops below the header instead of under it.
      ...(headerOffset > 0 ? { scrollMarginTop: headerOffset } : {}),
      ...visual,
      ...reorderStyle,
      ...pin.style,
    },
    "data-stagger": "",
    // antd builds its own <tr>, so the dirty mark arrives here too.
    "data-dirty": rowIsDirty(editing, id) ? "" : undefined,
    onMouseEnter: prefetch ? () => prefetch(row) : undefined,
  };
}

function antdPinnedDataSource<TRow>(
  grouping: unknown,
  treeEntries: unknown,
  rowPinning: RowPinningState<TRow> | undefined,
  rows: readonly TRow[],
  getRowId: (row: TRow) => string,
  dataSourceBase: readonly GroupedDataRecord<TRow>[],
  pinnedRows: { top?: readonly TRow[]; bottom?: readonly TRow[] } | undefined
): {
  dataSource: readonly GroupedDataRecord<TRow>[];
  pinnedTopRows: readonly TRow[];
  pinnedBottomRows: readonly TRow[];
  pinnedSummaryTop: readonly TRow[];
  pinnedSummaryBottom: readonly TRow[];
} {
  const summaryTop = pinnedRows?.top ?? [];
  const summaryBottom = pinnedRows?.bottom ?? [];
  if (grouping || treeEntries || !rowPinning) {
    return {
      dataSource: [...summaryTop, ...dataSourceBase, ...summaryBottom],
      pinnedTopRows: [],
      pinnedBottomRows: [],
      pinnedSummaryTop: summaryTop,
      pinnedSummaryBottom: summaryBottom,
    };
  }
  const parts = partitionPinnedRows(rows, rowPinning.state, getRowId);
  return {
    dataSource: [
      ...summaryTop,
      ...parts.top,
      ...parts.scroll,
      ...parts.bottom,
      ...summaryBottom,
    ],
    pinnedTopRows: parts.top,
    pinnedBottomRows: parts.bottom,
    pinnedSummaryTop: summaryTop,
    pinnedSummaryBottom: summaryBottom,
  };
}

/** Splice host extras into a flat antd dataSource. Grouping already did this. */
function resolveAntdDataSource<TRow>(
  grouping: unknown,
  rows: readonly GroupedDataRecord<TRow>[],
  extraRows: ComposedProps<TRow>["extraRows"],
  getRowId: (row: TRow) => string,
  insertRows: NonNullable<RenderModelAssembly<TRow>>["insertExtraRows"]
): readonly GroupedDataRecord<TRow>[] {
  if (grouping || insertRows === undefined) return rows;
  return insertRows(
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
          render:
            slot.kind === "fullWidth"
              ? (slot.render as () => ReactNode)
              : undefined,
        }
      : slot.row
  );
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
  fixedLeft: boolean,
  pinnedSummaryTop: readonly TRow[] = [],
  pinnedSummaryBottom: readonly TRow[] = []
): TableProps<GroupedDataRecord<TRow>>["rowSelection"] {
  if (!selection) return undefined;
  return {
    // Pin the checkbox column alongside any left-fixed data column.
    fixed: fixedLeft ? "left" : undefined,
    selectedRowKeys: [...selection.selectedIds],
    onSelect: (record) => {
      if (isAdaptTableGroupRow(record) || isAdaptTableExtraRow(record)) return;
      if (
        pinnedSummaryTop.includes(record) ||
        pinnedSummaryBottom.includes(record)
      ) {
        return;
      }
      selection.toggle(getRowId(record));
    },
    getCheckboxProps: (record): RowSelectionCheckboxProps => {
      const skip =
        isAdaptTableGroupRow(record) ||
        isAdaptTableExtraRow(record) ||
        pinnedSummaryTop.includes(record) ||
        pinnedSummaryBottom.includes(record);
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
  scrollTarget,
  props,
  virtualize,
  isPaged,
  error,
  body,
  children,
}: Readonly<{
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  /** Where the window keeps find's scroll while it windows. */
  scrollTarget: AntdRowScroll["cards"];
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
  const keys = rows.map((row) => rowKey(row));
  const finish = (window: KeyedWindow) => (
    <>
      {cardsFor(window)}
      <KeyedScrollRegistration
        target={scrollTarget}
        keys={keys}
        keyed={window}
      />
    </>
  );
  const cardsFor = (window: KeyedVirtualization) =>
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
    keys,
    enabled: virtualize && !isPaged && !error && body === "mobile",
    estimateSize: props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX,
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
    getScrollElement: inBox ? () => scrollRef.current : undefined,
    listRoot: scrollRef,
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
  scrollTarget,
  props,
  chrome,
  children,
}: Readonly<{
  grouping: GroupingBundle<TRow> | undefined;
  /** Where the window keeps find's scroll while it windows. */
  scrollTarget: AntdRowScroll["groups"];
  props: Readonly<ComposedProps<TRow>>;
  /** The table's chrome, for whether its body can take a window. */
  chrome: ReturnType<typeof useTableChrome<TRow>>;
  children: (grouping: GroupingBundle<TRow> | undefined) => ReactNode;
}>): ReactNode {
  const filled = useFeatureSlotFilled(KEYED_WINDOW);
  const keys = grouping?.entries.map((entry) => entry.key) ?? [];
  // A grouped page is eligible like any long list: its headers and footers
  // outgrow the page size.
  const eligible =
    grouping !== undefined &&
    isBodyEligible({ ...chrome, grouping, tree: undefined });
  const windowed = (indices: readonly number[]) => {
    if (!grouping) return children(undefined);
    return children({
      ...grouping,
      entries: windowGroupedEntries(grouping.entries, indices),
    });
  };
  const finish = (window: KeyedWindow) => (
    <>
      {windowed(window.indices)}
      <KeyedScrollRegistration
        target={scrollTarget}
        keys={keys}
        keyed={window}
      />
    </>
  );
  const slotProps: KeyedWindowSlotProps = {
    keys,
    enabled: Boolean(props.virtualize) && eligible,
    estimateSize: chrome.isMobile
      ? (props.estimateCardSize ?? DEFAULT_CARD_SIZE_PX)
      : 56,
    overscan: props.virtualOverscan,
    scrollMargin: props.virtualScrollMargin,
    listRoot: chrome.rootRef,
    children: finish,
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
  /** The placeholder is cards when the table itself is in the card layout. */
  mobile: boolean;
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
  tree: TreeState<TRow> | undefined;
  detailRender: ((row: TRow) => ReactNode) | undefined;
  detailExpansion: RowExpansionState | undefined;
  editing: EditableCellEditing<TRow> | undefined;
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
  reorderIndices: ReadonlyMap<string, number> | undefined;
  windowStart: number;
  /** Rows in the whole dataset, for the cards' `aria-setsize`. */
  cardSetSize: number;
  rowPinning: RowPinningState<TRow> | undefined;
  pinnedTopRows: readonly TRow[];
  pinnedBottomRows: readonly TRow[];
  pinnedSummaryTop: readonly TRow[];
  pinnedSummaryBottom: readonly TRow[];
  extraRows: ComposedProps<TRow>["extraRows"];
  pinRowSticky: boolean;
  /** antd's table handle, for find's scroll to an off-window row. */
  tableRef?: Ref<AntdTableRef>;
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
  reorderIndices,
  windowStart,
  rowPinning,
  pinnedSummaryTop = [],
  pinnedSummaryBottom = [],
  pinRowSticky,
  labels,
  tableRef,
  treeEntries,
}: Readonly<{
  /** Cell-navigation getters; inert unless `cellNavigation` is on. */
  gridFocus?: GridFocusState;
  /** The tree's entries while the rows are an ungrouped tree. */
  treeEntries?: readonly TreeEntry<TRow>[];
  /** antd's table handle, for find's scroll to an off-window row. */
  tableRef?: Ref<AntdTableRef>;
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
  editing: EditableCellEditing<TRow> | undefined;
  onRowClick: DataTableProps<TRow>["onRowClick"];
  prefetch: DataTableProps<TRow>["prefetch"];
  hasPinned: boolean;
  maxHeight: number | undefined;
  minWidth: number;
  emptyNode: ReactNode;
  rowReorder: RowReorderState<TRow> | undefined;
  reorderIndices: ReadonlyMap<string, number> | undefined;
  windowStart: number;
  rowPinning: RowPinningState<TRow> | undefined;
  pinnedSummaryTop?: readonly TRow[];
  pinnedSummaryBottom?: readonly TRow[];
  pinRowSticky: boolean;
  labels: Required<TableLabels>;
}>) {
  const [theadRef, headerHeight] = useOffsetHeight();
  const partsRef = useAntdTableParts(tableRef);
  let stickyHeaderOffset: number | undefined;
  if (sticky === true) stickyHeaderOffset = 0;
  else if (sticky) stickyHeaderOffset = sticky.offsetHeader ?? 0;
  const headerOffset =
    stickyHeaderOffset === undefined ? 0 : stickyHeaderOffset + headerHeight;
  // antd owns the <table>, <thead> and <tbody> elements, so their part names
  // reach them through the `components` seam. Memoized: a new component
  // identity here would remount the whole table on every render.
  const getGridProps = gridFocus?.getGridProps;
  const treeById = useMemo(
    () =>
      treeEntries
        ? new Map(treeEntries.map((entry) => [entry.key, entry]))
        : undefined,
    [treeEntries]
  );
  // A tree's rows are read inside a treegrid, as in every other kit's table.
  // The attributes travel by context: rebuilding `components` would remount
  // antd's table.
  const treeAria = useMemo(
    () => (treeEntries ? treeTableAria(treeEntries.length) : undefined),
    [treeEntries]
  );
  // Depends on the GETTER, not the whole state: the announcement changes on
  // every focus move, and rebuilding `components` would remount antd's table and
  // throw away the focus this just placed.
  const pinArmed = rowPinning !== undefined;
  // antd's own virtualizer replaces the body grid with divs — the rows it
  // draws are `<div>`s, not `<tr>`s — so the body wrapper has to be a `<div>`
  // there. A `<tbody>` in that position is invalid twice over: inside antd's
  // holder div, and around the row divs it receives.
  const virtualBody = virtualize && !grouping;
  // Cell navigation claims `role="grid"`. With a sticky header antd splits
  // that into two `<table>`s, so the role and its keyboard handlers live on a
  // wrapper around BOTH tables and each inner table is a `rowgroup`. Otherwise
  // a screen reader walking the body grid finds cells whose columnheaders live
  // in a sibling table.
  const gridProps = getGridProps?.();
  const isAccessibleGrid = gridProps?.role === "grid";
  const hover = rowReorder?.hover;
  const followsDrop = hover !== undefined && !virtualBody;
  const rowDropFollow = useMemo<RowDropFollow | undefined>(
    () =>
      followsDrop && hover && reorderIndices
        ? {
            hover,
            indices: reorderIndices,
          }
        : undefined,
    [followsDrop, hover, reorderIndices]
  );
  useVirtualDropRedraw(virtualBody ? hover : undefined);
  const components = useMemo(() => {
    const props = getGridProps?.();
    const asGrid = props?.role === "grid";
    const inner = asGrid ? { role: "rowgroup" } : props;
    return {
      // Core decides what belongs here: the grid role and handlers only with
      // cell navigation, but a windowed table's `aria-rowcount` regardless —
      // so this asks unconditionally rather than gating on the feature.
      table: tableComponent(inner, true),
      header: {
        // Sticky / virtual headers resolve through `header.table`. When the
        // wrapper is the grid, this table is a rowgroup like the body table.
        table: tableComponent(asGrid ? { role: "rowgroup" } : undefined, false),
        // The header height is measured only for pinned rows, so the ref stays
        // conditional; the name does not.
        wrapper: theadComponent(pinArmed ? theadRef : undefined),
        row: TheadRow,
      },
      body: {
        wrapper: virtualBody ? VirtualTbodyWrapper : TbodyWrapper,
        // A body row follows a reorder drag's drop edge on its own; antd's
        // virtual body draws its own rows, so there the table redraws.
        ...(followsDrop ? { row: DropTargetRow } : {}),
        // A <table role="rowgroup"> is no longer a table, so a bare <td>
        // maps to `cell` instead of `gridcell`. Every body cell — including
        // antd-owned selection cells that never go through getCellProps —
        // has to claim the role itself.
        ...(asGrid ? { cell: GridBodyCell } : {}),
      },
    };
  }, [followsDrop, getGridProps, pinArmed, theadRef, virtualBody]);

  const table = (
    <Table<GroupedDataRecord<TRow>>
      ref={partsRef}
      aria-label={tableLabel}
      components={components}
      columns={columns}
      dataSource={[...dataSource]}
      rowKey={(record) => {
        const top = pinnedSummaryTop.indexOf(record as TRow);
        if (top >= 0) return pinnedSummaryRowId("top", top);
        const bottom = pinnedSummaryBottom.indexOf(record as TRow);
        if (bottom >= 0) return pinnedSummaryRowId("bottom", bottom);
        return groupedRowKey(record, getRowId);
      }}
      size={size}
      bordered={bordered}
      virtual={virtualize && !grouping}
      sticky={sticky}
      onScroll={handleVirtualScroll}
      rowSelection={rowSelection}
      expandable={expandable}
      summary={summary}
      pagination={false}
      loading={SILENT_TABLE_LOADING}
      rowClassName={rowClassName ? buildRowClassName(rowClassName) : undefined}
      onChange={handleChange as TableProps<GroupedDataRecord<TRow>>["onChange"]}
      onRow={(record, rowIndex) =>
        antdOnRow({
          record,
          rowIndex,
          reorderIndices,
          getRowId,
          rowPinning,
          pinnedSummaryTop,
          pinnedSummaryBottom,
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
          labels,
          selectedRowKeys: rowSelection?.selectedRowKeys,
          treeById,
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
  const body = isAccessibleGrid ? (
    <div
      {...gridProps}
      {...treeAria}
      aria-label={tableLabel}
      data-adapttable-part="grid"
    >
      {table}
    </div>
  ) : (
    <TreeTableAriaContext.Provider value={treeAria}>
      {table}
    </TreeTableAriaContext.Provider>
  );
  return rowDropFollow ? (
    <RowDropContext.Provider value={rowDropFollow}>
      {body}
    </RowDropContext.Provider>
  ) : (
    body
  );
}

/**
 * antd owns the `<table>` element, so its part name — plus `role="grid"` and
 * the ARIA dimensions when cell navigation is armed — reaches the accessible
 * grid wrapper (both header and body tables sit inside it) through the
 * documented `components` seam rather than a spread. With a sticky or
 * virtualized header antd splits the markup into a header table and a body
 * table; both carry the name, and both are `rowgroup`s of that one grid.
 *
 * Built at module scope: a component declared inside another component is a new
 * type on every render, which remounts everything below it — here that would
 * mean losing the cell focus on every keystroke.
 */
function tableComponent(
  gridProps: Record<string, unknown> | undefined,
  readsTree: boolean
) {
  return function AdaptTable(tableProps: Record<string, unknown>) {
    const tree = useContext(TreeTableAriaContext);
    return (
      <table
        data-adapttable-part="table"
        {...tableProps}
        {...gridProps}
        {...(readsTree ? tree : undefined)}
      />
    );
  };
}

/** The tree's table ARIA, for the body table antd draws. */
const TreeTableAriaContext = createContext<
  ReturnType<typeof treeTableAria> | undefined
>(undefined);

function TbodyWrapper(
  props: Readonly<HTMLAttributes<HTMLTableSectionElement>>
) {
  return <tbody data-adapttable-part="tbody" {...props} />;
}

/** A row's reorder attributes with the drop edge as the drag hovers now. */
function liveReorderAttrs<TRow>(
  rowReorder: RowReorderState<TRow>,
  id: string,
  index: number
): ReturnType<RowReorderState<TRow>["rowAttrs"]> {
  const attrs = rowReorder.rowAttrs(id, index);
  const drop = rowReorder.hover?.dropAt(id, index) ?? attrs["data-drop"];
  return drop === undefined ? attrs : { ...attrs, "data-drop": drop };
}

/** What a body row reads to follow a drag's drop edge on its own. */
interface RowDropFollow {
  readonly hover: NonNullable<RowReorderState<unknown>["hover"]>;
  readonly indices: ReadonlyMap<string, number>;
}

const RowDropContext = createContext<RowDropFollow | undefined>(undefined);

/** A row with no reorder hover has nothing to follow. */
const NO_HOVER = (): (() => void) => () => undefined;

/**
 * Redraws the table on every reorder hover. antd's virtual body draws its own
 * rows, so a row cannot follow the drop edge itself there.
 */
function useVirtualDropRedraw(
  hover: RowReorderState<unknown>["hover"] | undefined
): void {
  const version = useRef(0);
  const subscribe = useCallback(
    (listener: () => void) =>
      hover
        ? hover.subscribe(() => {
            version.current += 1;
            listener();
          })
        : () => undefined,
    [hover]
  );
  useSyncExternalStore(
    subscribe,
    () => version.current,
    () => version.current
  );
}

/**
 * antd's body row, following the drop edge a drag hovers on it, so a drag
 * redraws the rows it crosses instead of the whole table.
 */
function DropTargetRow(
  props: Readonly<
    HTMLAttributes<HTMLTableRowElement> & { "data-row-id"?: string }
  >
) {
  const follow = useContext(RowDropContext);
  const id = props["data-row-id"];
  const index = id === undefined ? undefined : follow?.indices.get(id);
  const dropAt = () =>
    id === undefined || index === undefined
      ? undefined
      : follow?.hover.dropAt(id, index);
  const drop = useSyncExternalStore(
    index === undefined ? NO_HOVER : (follow?.hover.subscribe ?? NO_HOVER),
    dropAt,
    dropAt
  );
  const rowProps =
    drop === undefined ||
    drop === (props as Record<string, unknown>)["data-drop"]
      ? props
      : withRowDropTarget(props, drop);
  return <tr {...rowProps} />;
}

function GridBodyCell(props: Readonly<TdHTMLAttributes<HTMLTableCellElement>>) {
  return <td {...props} role="gridcell" />;
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

/**
 * A pinned row sticks while the rest scroll beneath it, and antd paints its
 * cells transparent over the table's surface, so the scrolled rows would show
 * through. antd owns the `<td>`s; this paints a pinned row's cells with the
 * container colour, and antd's own hover and selection rules, which are more
 * specific, still tint them. A pinned summary row is the host's total, not a
 * record, and reads semibold.
 */
const PINNED_ROW_CSS = `[data-adapttable-part="root"] tr[data-row-pin] > td{background:var(--ant-color-bg-container,#fff)}[data-adapttable-part="root"] tr[data-adapttable-part^="pinned-summary"] > td{font-weight:600}`;

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
    tableRef,
    chromeBody,
    mobile,
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
    reorderIndices,
    windowStart,
    cardSetSize,
    rowPinning,
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom,
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
        mobile={mobile}
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
        pinnedSummaryTop={pinnedSummaryTop}
        pinnedSummaryBottom={pinnedSummaryBottom}
        extraRows={extraRows}
      />
    );
  } else {
    body = (
      <DesktopTableBody
        gridFocus={gridFocus}
        tableRef={tableRef}
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
        reorderIndices={reorderIndices}
        windowStart={windowStart}
        rowPinning={rowPinning}
        pinnedSummaryTop={pinnedSummaryTop}
        pinnedSummaryBottom={pinnedSummaryBottom}
        pinRowSticky={pinRowSticky}
        labels={labels}
        treeEntries={grouping ? undefined : tree?.entries}
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
/**
 * The grid's own state: where the window starts, find, focus, and the
 * selection's arithmetic.
 *
 * antd builds its chrome by hand rather than through `useDataTableShell`,
 * so it calls these four directly. Grouping them keeps `DataTable` — which
 * assembles the entire adapter — from carrying their branches too.
 */
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

/** Whether antd's own virtual `<Table>` windows this table's rows. */
function antdVirtualBody<TRow>(
  props: Readonly<ComposedProps<TRow>>,
  chrome: DataTableShellResult<TRow>["chrome"],
  grouping: GroupingState<TRow> | undefined
): boolean {
  return props.virtualize === true && !grouping && !chrome.isPaged;
}

/** The surface, laid out with antd's spacing; popups follow fullscreen. */
function AntdFrame({
  rootProps,
  rootRef,
  fullscreenContainer,
  announcers,
  toolbarRef,
  toolbarClassName,
  toolbarStyle,
  toolbar,
  bars,
  main,
  loadMore,
  footers,
  overlays,
  labels,
  rowCount,
  mobile,
  animate,
}: Readonly<KitTableFrameProps>) {
  "use no memo";
  const popupContainer = useCallback(
    () => fullscreenContainer ?? document.body,
    [fullscreenContainer]
  );
  useMountStagger(rootRef, [rowCount, mobile], { enabled: animate });
  return (
    <div ref={rootRef} {...rootProps} data-adapttable-part="root">
      <style>{PINNED_ROW_CSS}</style>
      {/* Every antd popup under the table opens in the fullscreen element
          while it is up; the rest of the page is hidden. */}
      <ConfigProvider
        getPopupContainer={fullscreenContainer ? popupContainer : undefined}
      >
        {announcers}
        <Space orientation="vertical" size="small" style={{ width: "100%" }}>
          <div
            data-adapttable-part="toolbar"
            ref={toolbarRef}
            className={toolbarClassName}
            style={toolbarStyle}
          >
            {toolbar}
          </div>
          {bars}
          {main}
          {footers}
          {loadMore && (
            <Flex ref={loadMore.ref} justify="center">
              <Button loading={loadMore.busy} onClick={loadMore.onClick}>
                {labels.loadMore}
              </Button>
            </Flex>
          )}
        </Space>
        {overlays}
      </ConfigProvider>
    </div>
  );
}

/**
 * antd's desktop table and mobile cards, drawn from the finished view.
 *
 * antd renders its rows through its own `<Table>`, which takes columns and
 * data rather than children, so the body is the one region it draws itself.
 */
function AntdBody<TRow>({
  view,
  headerOffset,
  props: kitProps,
}: Readonly<{
  view: DataTableShellResult<TRow>;
  headerOffset: number;
  props: KitTableProps<TRow>;
}>) {
  "use no memo";
  const props = kitProps as Readonly<ComposedProps<TRow>>;
  const rowScroll = useAntdRowScrollHandles();
  const grouping = useFeatureState(GROUPING_STATE) as
    GroupingState<TRow> | undefined;
  return (
    <AntdGroupingWindow<TRow>
      grouping={grouping}
      scrollTarget={rowScroll.groups}
      props={props}
      chrome={view.chrome}
    >
      {(grouping) => (
        <AntdViewBody<TRow>
          view={view}
          headerOffset={headerOffset}
          props={props}
          grouping={grouping}
          rowScroll={rowScroll}
        />
      )}
    </AntdGroupingWindow>
  );
}

function AntdViewBody<TRow>({
  view,
  headerOffset,
  props,
  grouping,
  rowScroll,
}: Readonly<{
  view: DataTableShellResult<TRow>;
  headerOffset: number;
  props: Readonly<ComposedProps<TRow>>;
  grouping: GroupingBundle<TRow> | undefined;
  rowScroll: AntdRowScroll;
}>) {
  "use no memo";
  const c = view.chrome;
  const grouped = useFeatureState(GROUPING_STATE) as
    GroupingState<TRow> | undefined;
  const tree = useFeatureState(TREE_STATE) as TreeState<TRow> | undefined;
  const chromeProps = view.chromeProps;
  const gridFocus = view.gridFocus;
  const table = view.table;
  const { labels, selection } = table;
  const source = c.source;
  const { confirm, getRowId } = c;
  const density = view.density;
  const size = resolveSize(props.size, density);
  const bordered = props.bordered ?? false;
  const filtersMode = resolveFilterMode(props.filtersMode, props.headerFilters);
  const hasColumnHeaderRename = useFeatureSlotFilled(COLUMN_HEADER_RENAME);
  const { windowStart, cardSetSize } = antdWindowOf(c);
  const rowActions = view.tableProps.rowActions;
  const rowReorder = view.tableProps.rowReorder;
  const hasRowActions = rowActions !== undefined;
  const virtualBody = antdVirtualBody(props, c, grouped);
  const inScrollBox =
    props.maxHeight != null || (virtualBody && c.body === "desktop");
  const resolvedTableLabel = table.getTableProps()["aria-label"];
  const handleVirtualScroll = virtualScrollEndHandler(
    source,
    virtualBody && !c.isPaged && !source.error
  );
  const reorderIndices = rowReorder
    ? new Map(
        renderedRowsOf({ source: c.source, grouping: grouped, tree }).map(
          (row, index) => [getRowId(row), index]
        )
      )
    : undefined;
  const treeEntries = tree?.entries;
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
    pinnedSummaryTop,
    pinnedSummaryBottom,
  } = antdPinnedDataSource(
    grouping,
    treeEntries,
    view.tableProps.rowPinning,
    source.rows,
    getRowId,
    dataSourceBase,
    c.pinnedRows
  );
  const featureAssembly = (
    props as Partial<{ assembly: RenderModelAssembly<TRow> }>
  ).assembly;
  const dataSource = resolveAntdDataSource(
    grouping,
    partitionedSource,
    props.extraRows,
    getRowId,
    featureAssembly?.insertExtraRows
  );
  const { cellsByRow } = tableRenderModel({
    table,
    rows: treeEntries?.map((entry) => entry.row) ?? source.rows,
    rowActions,
    getRowId,
    renderRowDetail: props.renderRowDetail,
    expansion: view.tableProps.expansion,
    editing: view.tableProps.editing,
    rowReorder,
    pinnedTopRows,
    pinnedBottomRows,
    pinnedSummaryTop,
    pinnedSummaryBottom,
    getCellSpan: props.getCellSpan,
    pinOffset: c.columnLayout.pinOffset,
    grouping: grouped,
    // Features that replace an assembly heavy — cell spanning, extra rows —
    // write it onto the props the feature pass returns. antd assembles its own
    // table, so it reads that here the way the shared shell does.
    assembly: featureAssembly,
  });
  const pinRowSticky = !bodyCellsHaveRowSpan(cellsByRow);
  const columns = buildColumns<TRow>({
    gridFocus,
    getHeaderCellProps: table.getHeaderCellProps,
    columns: table.columns,
    rowActions,
    rowActionsLayout: props.rowActionsLayout,
    renderRowActions: props.renderRowActions,
    sortBy: source.sortBy,
    sortDir: source.sortDir,
    confirm,
    labels,
    editing: view.tableProps.editing,
    rows: c.editingRows,
    groupingPanel: view.tableProps.groupingPanel,
    getRowId,
    pinned: c.columnLayout.state.pinned,
    setWidth: props.resizableColumns ? c.columnLayout.setWidth : undefined,
    onRenameColumn:
      hasColumnHeaderRename && props.onColumnRename
        ? c.columnLayout.setName
        : undefined,
    columnWidths: c.columnLayout.state.widths,
    resizeLabel: labels.resizeColumn,
    sortLevels: source.sortLevels,
    // Shift-click multi-sort is opt-in; without it antd keeps full control
    // of header clicks (single-sort via `onChange`).
    onToggleSortLevel: chainToggler(props.multiSort, source),
    fitColumns: props.fitColumns,
    tree: tree
      ? {
          columnKey: tree.columnKey,
          entryFor: (row: TRow) => treeEntryByRow.get(row),
          toggle: tree.expansion.toggle,
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
    rowReorder,
    reorderIndices,
    windowStart,
    cellsByRow,
    pinnedSummaryTop,
    pinnedSummaryBottom,
    cellSpanAppearance: props.cellSpanAppearance,
    headerFilters: filtersMode === "header",
    filterDefs: chromeProps.filterDefs,
    isCellFlashing: props.isCellFlashing,
    filterSource: chromeProps.source,
    filterRegistry: chromeProps.filterRegistry,
    closeHeaderFilterOnSelect: props.closeHeaderFilterOnSelect === true,
  });
  // A tree is already flat by the time antd sees it: core walks the hierarchy
  // and hands back the visible rows in reading order, so antd's own
  // `childrenColumnName` recursion stays out of it and one expansion state
  // drives every adapter.
  const pinnedSides = Object.values(c.columnLayout.state.pinned);
  const hasPinned = pinnedSides.length > 0;
  const hasStartPin = pinnedSides.includes("start");
  const minWidth = antdMinWidth(
    table.columns,
    c.columnLayout.state.widths,
    Boolean(table.selection),
    hasRowActions,
    Boolean(rowReorder)
  );
  const handleChange = sortChangeHandler(source);
  const rowSelection = buildRowSelection(
    selection,
    getRowId,
    labels,
    hasStartPin,
    pinnedSummaryTop,
    pinnedSummaryBottom
  );
  const expandable = buildExpandable(
    view.tableProps.renderRowDetail,
    view.tableProps.expansion,
    getRowId,
    labels
  );
  // The summary row pads one leading cell per column antd injects (expand
  // first, then selection) so its cells stay aligned under the data columns.
  const summary = buildSummary(
    chromeProps.summaryRow,
    table.columns,
    summaryLeadingCells(rowSelection, expandable, Boolean(rowReorder)),
    hasRowActions
  );
  const sticky: TableProps<unknown>["sticky"] = props.stickyHeader
    ? { offsetHeader: inScrollBox ? 0 : headerOffset }
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
      onClearFilters={c.clearSearchAndFilters}
    />
  );
  // Window the MOBILE card list through the seam — desktop rows still window
  // through antd's own native virtual `<Table>` when grouping is off, and when
  // grouping is armed `grouping.entries` already carries the window.
  return (
    <div className={c.body === "desktop" ? props.classNames?.table : undefined}>
      <AntdCardWindow<TRow>
        rows={source.rows}
        rowKey={getRowId}
        scrollTarget={rowScroll.cards}
        props={props}
        virtualize={virtualBody}
        isPaged={c.isPaged}
        error={source.error}
        body={c.body}
      >
        {(cardWindow) => (
          <DataTableBodyRegion
            gridFocus={gridFocus}
            tableRef={rowScroll.table}
            chromeBody={c.body}
            mobile={c.isMobile}
            errorState={c.errorState}
            source={source}
            editingRows={c.editingRows}
            table={table}
            slots={props.slots}
            columns={columns}
            rowActions={rowActions}
            rowActionsLayout={props.rowActionsLayout}
            renderRowActions={props.renderRowActions}
            confirm={confirm}
            getRowId={getRowId}
            labels={labels}
            emptyNode={emptyNode}
            grouping={grouping}
            tree={tree}
            detailRender={view.tableProps.renderRowDetail}
            detailExpansion={view.tableProps.expansion}
            editing={view.tableProps.editing}
            cardWindow={cardWindow}
            tableLabel={resolvedTableLabel}
            density={density}
            prefetch={props.prefetch}
            onRowClick={props.onRowClick}
            rowClassName={props.rowClassName}
            isCellFlashing={props.isCellFlashing}
            rowStyle={props.rowStyle}
            rowHeight={props.rowHeight}
            cardClassName={props.classNames?.card}
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
            rowReorder={rowReorder}
            reorderIndices={reorderIndices}
            windowStart={windowStart}
            cardSetSize={cardSetSize}
            rowPinning={view.tableProps.rowPinning}
            pinnedTopRows={pinnedTopRows}
            pinnedBottomRows={pinnedBottomRows}
            pinnedSummaryTop={pinnedSummaryTop}
            pinnedSummaryBottom={pinnedSummaryBottom}
            extraRows={props.extraRows}
            pinRowSticky={pinRowSticky}
          />
        )}
      </AntdCardWindow>
    </div>
  );
}

/**
 * Where the rendered slice begins in the dataset, and the dataset size the
 * card list reports per item as `aria-setsize`.
 */
function antdWindowOf<TRow>(c: DataTableShellResult<TRow>["chrome"]): {
  windowStart: number;
  cardSetSize: number;
} {
  const windowStart =
    c.source.paginationMode === "paged"
      ? Math.max(0, (c.source.page - 1) * c.source.limit)
      : 0;
  return {
    windowStart,
    cardSetSize: Math.max(c.source.total, windowStart + c.source.rows.length),
  };
}

/** The table's antd size and border, for the regions drawn before the body. */
const AntdLookContext = /* @__PURE__ */ createContext<{
  readonly size: AntdTableSize;
  readonly bordered: boolean;
}>({ size: "middle", bordered: false });

const noop = (): void => undefined;

/** The first-load placeholder, in the table's antd size and border. */
function AntdSkeleton({
  rows,
  columns,
  label,
  shape,
}: Readonly<{
  rows: number;
  columns: number;
  label: string;
  shape: KitSkeletonShape;
}>) {
  const look = useContext(AntdLookContext);
  return (
    <SkeletonTable
      columnCount={columns}
      rowCount={rows}
      loadingLabel={label}
      size={look.size}
      bordered={look.bordered}
      hasActions={shape.actions}
      mobile={shape.mobile}
    />
  );
}

/** The toolbar, with antd's spinner while rows refresh. */
function antdToolbar<TRow>(props: KitToolbarProps<TRow>): ReactNode {
  return (
    <Toolbar {...props} isRefreshing={props.table.source.isFetching === true} />
  );
}

const ANTD_KIT: KitTable = {
  Frame: (frame) => <AntdFrame {...frame} />,
  toolbar: antdToolbar,
  body: (view, headerOffset, props) => (
    <AntdBody view={view} headerOffset={headerOffset} props={props} />
  ),
  skeleton: (rows, columns, labels, shape) => (
    <AntdSkeleton
      rows={rows}
      columns={columns}
      label={labels.loading}
      shape={shape}
    />
  ),
  empty: (labels, onClear) => (
    <output>
      <EmptyState
        variant={onClear ? "noResults" : "noData"}
        labels={labels}
        onClearFilters={onClear ?? noop}
      />
    </output>
  ),
  error: (state, labels) => (
    <ErrorState error={state.error} labels={labels} onRetry={state.retry} />
  ),
  footer: (view) =>
    footer({
      table: view.table,
      source: view.source,
      labels: view.labels,
      tableProps: view.tableProps,
    }),
};

/**
 * The Ant Design table. Pass rows and columns — or a server source, or any
 * prebuilt `source` — to get a fully styled, sortable, filterable, paginated
 * table with selection, bulk actions, RTL and dark mode.
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function DataTable<TRow>(incoming: Readonly<DataTableProps<TRow>>) {
  const kit = useAntdLibrary();
  const libraryLabels = useLocaleLabels(
    incoming.labels === undefined ? kit.locale : undefined
  );
  const sized = {
    ...incoming,
    size:
      incoming.size ?? (incoming.density === undefined ? kit.size : undefined),
  } as typeof incoming;
  const props = useTableFeatures(
    withKitEnvironment(sized, {
      dir: kit.dir,
      locale: kit.locale,
      labels: libraryLabels,
      density: incoming.size === undefined ? kit.density : undefined,
    })
  );
  const rowScroll = useAntdRowScroll();
  const look = useMemo(
    () => ({
      size: resolveSize(props.size, props.density),
      bordered: props.bordered === true,
    }),
    [props.size, props.density, props.bordered]
  );
  return (
    <ReducedMotionScope off={kit.motionOff}>
      <FeatureProviders props={props}>
        <HeaderFilterOpenProvider>
          <AntdLookContext.Provider value={look}>
            <AntdRowScrollContext.Provider value={rowScroll}>
              <TableComposition<TRow> props={props} kit={ANTD_KIT} />
            </AntdRowScrollContext.Provider>
          </AntdLookContext.Provider>
        </HeaderFilterOpenProvider>
      </FeatureProviders>
    </ReducedMotionScope>
  );
}

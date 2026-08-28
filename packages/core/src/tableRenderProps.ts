/**
 * The render-time contract shared by every adapter's table/card renderer.
 *
 * Each adapter renders its own markup (MUI `<Table>`, Chakra `<Table>`, plain
 * `<table>`, …) but consumes the same headless inputs: the resolved table
 * model, the visible rows, row-action wiring, virtualization padding, and the
 * column sticky/resize layout. Extracting it here keeps those adapters from
 * re-declaring the identical prop list (and keeps them in lockstep).
 *
 * Adapters extend this with their own kit-specific extras (size tokens,
 * colour scheme, className slots).
 *
 * @typeParam TRow - The row type.
 */
import { type ReactNode, useMemo, useRef } from "react";

import type { ConfirmHandler } from "./actions/confirm";
import type { ColumnGroupRecord } from "./columns/columnTree";
import type { PinOffset } from "./columns/useColumnLayout";
import type { EditableCellEditing } from "./editing/editableCellController";
import type { FilterDef } from "./filters/filterDefs";
import type { FilterTypeRegistry } from "./filters/filterRegistry";
import type { GridFocusState } from "./focus/useGridFocus";
import type { GroupByInput } from "./grouping/groupKeys";
import type { GroupedFlatEntry } from "./grouping/groupRows";
import type { GroupCollapseState } from "./grouping/useGroupCollapse";
import {
  type BodyCell,
  buildBodyCells,
  type CellSpanAppearance,
  type GetCellSpan,
} from "./rows/cellSpan";
import {
  extraCoveredTableSlots,
  type ExtraRow,
  inflateBodyCellRowSpans,
} from "./rows/extraRows";
import { incrementalViewOf } from "./rows/incremental";
import type { MobileCardRenderer } from "./rows/mobileCard";
import type { RowActionsLayout, RowActionsRenderer } from "./rows/rowActions";
import type { RowPinningState } from "./rows/rowPinning";
import type { RowReorderState } from "./rows/rowReorder";
import type { RowHeight, RowStyle } from "./rows/rowStyle";
import type { RowExpansionState } from "./rows/useRowExpansion";
import type { SelectionState } from "./selection/useSelection";
import { bodyRowEntries, type TreeEntry } from "./tree/treeRows";
import type { TreeExpansionState } from "./tree/useTreeExpansion";
import type { ColumnDef, RowAction, TableLabels } from "./types";
import type { UseDataTableResult } from "./useDataTable/useDataTable";
import type { RowPairMeasurer } from "./virtual/measureRowPair";
import type { ColumnWindow } from "./virtual/useColumnWindow";
import {
  resolveVirtualRows,
  virtualColumnSpan,
  type VirtualTableRow,
} from "./virtual/useTableVirtualization";

export interface SharedTableRenderProps<TRow> {
  /** The resolved table model from `useDataTable`. */
  table: UseDataTableResult<TRow>;
  /** The rows to render for the current page/window. */
  rows: readonly TRow[];
  /**
   * Cell-navigation getters, from the shell. Inert unless `cellNavigation` is
   * set, so a renderer spreads them unconditionally.
   */
  gridFocus?: GridFocusState;
  /** Per-row actions rendered in a trailing actions column. */
  rowActions?: RowAction<TRow>[];
  /** How those actions render. Omit / `"buttons"` is the horizontal strip. */
  rowActionsLayout?: RowActionsLayout;
  /**
   * Replace the trailing actions cell. Wins over
   * {@link SharedTableRenderProps.rowActionsLayout}.
   */
  renderRowActions?: RowActionsRenderer<TRow>;
  /** Confirmation handler used before destructive row actions run. */
  confirm: ConfirmHandler;
  /** Stable row identity used for keys and selection. */
  getRowId: (row: TRow) => string;
  /** Hover-prefetch callback fired on desktop row mouse-enter. */
  prefetch?: (row: TRow) => void;
  /** Row activation handler — see `BaseDataTableProps.onRowClick`. */
  onRowClick?: (row: TRow) => void;
  /** Conditional per-row class — see `BaseDataTableProps.rowClassName`. */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /**
   * Mark cells a patch just changed — `data-flash` on the cell. Omit and
   * nothing is marked. See `useChangedCellFlash` from `@adapttable/core/stream`.
   */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  /** When true, group headers render a collapse toggle. */
  collapsibleColumnGroups?: boolean;
  /** Collapsed column-group ids from the layout. */
  collapsedColumnGroups?: readonly string[];
  /** Tree groups for the declared columns — collapse options, header align. */
  columnGroups?: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
  /** Toggle one column group. No-op unless collapse is armed. */
  onToggleColumnGroup?: (id: string) => void;
  /** Conditional per-row style — see `BaseDataTableProps.rowStyle`. */
  rowStyle?: RowStyle<TRow>;
  /** Per-row height — see `BaseDataTableProps.rowHeight`. */
  rowHeight?: RowHeight<TRow>;
  /** Detail-panel renderer — see `BaseDataTableProps.renderRowDetail`. */
  renderRowDetail?: (row: TRow) => ReactNode;
  /** Custom mobile-card body — see `BaseDataTableProps.renderCard`. */
  renderCard?: MobileCardRenderer<TRow>;
  /** Footer summary builder — see `BaseDataTableProps.summaryRow`. */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /**
   * Row-reorder bundle — present iff the host passed `onRowReorder` and
   * grouping/tree are off. Omit it and no handle renders.
   */
  rowReorder?: RowReorderState<TRow>;
  /**
   * Dataset offset of the first rendered row (page start). Zero when the
   * source is not paged. Added to each row's local index so the host hears
   * dataset-relative `from` / `to`.
   */
  windowStart?: number;
  /**
   * Rows in the whole dataset, for the card list's `aria-setsize`. A card list
   * is a real `<ul>`, so a windowed one states its size per item rather than
   * through the table's `aria-rowcount`.
   */
  cardSetSize?: number;
  /** Whether the injected reorder column is start-pinned. */
  reorderPinned?: boolean;
  /**
   * Top-pinned rows, already removed from {@link SharedTableRenderProps.rows}
   * / the virtual window. Render in a sticky section above the scroll body.
   */
  pinnedTopRows?: readonly TRow[];
  /**
   * Bottom-pinned rows, already removed from the scroll body. Render in a
   * sticky section below it.
   */
  pinnedBottomRows?: readonly TRow[];
  /** Headless pin state — actions live on `rowActions`; this is the lists. */
  rowPinning?: RowPinningState<TRow>;
  /**
   * Per-cell span. When set (or a column declares `colSpan`/`rowSpan`),
   * {@link TableRenderModel.cellsByRow} omits covered cells.
   */
  getCellSpan?: GetCellSpan<TRow>;
  /**
   * How a spanned cell is painted. Omit / `"merged"` is the spreadsheet look.
   * `"plain"` is geometry only.
   */
  cellSpanAppearance?: CellSpanAppearance;
  /** Host-injected separator / full-width slots. */
  extraRows?: readonly ExtraRow[];
  /** Expansion state, present when `renderRowDetail` is set. */
  expansion?: RowExpansionState;
  /**
   * Inline cell-editing bundle — present iff the host passed `onCellEdit`.
   * Omit it and every cell stays plain display (package DNA: opt-in).
   */
  editing?: EditableCellEditing<TRow>;
  /**
   * Tree bundle — present iff the host declared a hierarchy. Adapters render
   * `tree.entries` in place of plain rows and put a `TreeToggle` plus
   * `treeIndentStyle` in the `tree.columnKey` cell.
   */
  tree?: {
    entries: readonly TreeEntry<TRow>[];
    expansion: TreeExpansionState;
    columnKey?: string;
    /** Nodes fetching their children right now (`onLoadChildren`). */
    loadingIds?: ReadonlySet<string>;
    /** Nodes whose last fetch rejected — closed, and clickable again. */
    failedIds?: ReadonlySet<string>;
  };
  /**
   * Row-grouping bundle — present iff chrome armed grouping. Adapters that
   * do not yet render group headers may ignore it; leaf `rows` stay valid.
   */
  grouping?: {
    /** The grouping keys in order — one for a flat group, more for nested. */
    groupBy: readonly string[];
    collapsed: GroupCollapseState;
    entries: readonly GroupedFlatEntry<TRow>[];
    setGroupBy: (key: GroupByInput) => void;
    /** Open every group. */
    expandAll: () => void;
    /** Close every group, at every level. */
    collapseAll: () => void;
    /** Show the tree down to `depth` and no further. */
    collapseToDepth: (depth: number) => void;
    /** Reveal the next page of groups, or of one group's rows. */
    showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  };
  /** Virtual row window (with absolute indices) when virtualization is on. */
  rowEntries?: readonly VirtualTableRow<TRow>[];
  /** Spacer height above the virtual window. */
  paddingTop?: number;
  /** Spacer height below the virtual window. */
  paddingBottom?: number;
  /** Ref callback that lets the virtualizer measure a row element. */
  measureElement?: (element: Element | null) => void;
  /**
   * Measure a row together with its open detail panel — used instead of
   * `measureElement` when the table can expand rows, since the two are
   * separate elements and the pair is what the window has to size.
   */
  measureRowPair?: RowPairMeasurer;
  /**
   * The windowed columns, when the table windows its horizontal axis. The
   * render model swaps them in, so adapters map over `model.columns` exactly
   * as before and render the two spacer cells `columnSpacers` describes.
   */
  columnWindow?: ColumnWindow<TRow>;
  /**
   * Whether the table fits its container rather than overflowing it. Adapters
   * spread `fittedTableStyle(fitColumns)` onto their `<table>`: percentage
   * widths only mean anything under a fixed table layout.
   */
  fitColumns?: boolean;
  /**
   * Compact per-column filter row under the header. Desktop only.
   * Driven by `filterDefs` and the source extra bag.
   */
  headerFilters?: boolean;
  /**
   * Close a header-filter overlay after a finished single-control write.
   * Default off — see `BaseDataTableProps.closeHeaderFilterOnSelect`.
   */
  closeHeaderFilterOnSelect?: boolean;
  /** Declarative filter defs the header row matches to columns. */
  filterDefs?: readonly FilterDef<TRow>[];
  /** Type registry the header row and custom widgets read. */
  filterRegistry?: FilterTypeRegistry;
  /** Whether the header sticks to the top of the scroll box. */
  stickyHeader?: boolean;
  /** Offset (px) applied to the sticky header top. */
  stickyTop?: number;
  /** Resolve a pinned column's side + inset (px), or `undefined` if unpinned. */
  pinOffset?: (key: string) => PinOffset | undefined;
  /** Optional max height (px) that turns the table into a scroll box. */
  maxHeight?: number;
  /**
   * Attach to the `maxHeight` scroll box so an element-mode virtual window
   * tracks the box's scrolling (from `useChromeBodyData`).
   */
  virtualScrollRef?: (node: HTMLElement | null) => void;
  /** Commit a new width (px) for a resizable column. */
  setWidth?: (key: string, width: number) => void;
  /** Current per-column widths (px), keyed by column key. */
  columnWidths?: Readonly<Record<string, number>>;
  /** Accessible label for a column-resize handle. */
  resizeLabel?: string;
}

/**
 * The shared prelude every table/card renderer derives before rendering.
 *
 * @public
 */
export interface TableRenderModel<TRow> {
  /** Visible columns, in order. */
  columns: readonly ColumnDef<TRow>[];
  /** Selection state for the rendered rows. */
  selection: SelectionState | null;
  /** Resolved labels, every key filled. */
  labels: Required<TableLabels>;
  /** Whether a trailing actions column/section renders. */
  showActions: boolean;
  /** Whether the leading reorder column renders. */
  showReorder: boolean;
  /**
   * Leading control cells before data: expansion + reorder + selection.
   * Group headers and summaries use this so their colSpans stay aligned.
   */
  leadingCells: number;
  /** Materialised row entries (virtual window or the full set). */
  entries: readonly VirtualTableRow<TRow>[];
  /** Spacer/detail colSpan: expansion + reorder + selection + data + actions. */
  columnSpan: number;
  /**
   * Widths of the spacer cells holding open the columns outside the window,
   * or `undefined` when every column is rendered. A row renders one before its
   * cells and one after them.
   */
  columnSpacers?: { start: number; end: number };
  /**
   * Per-row body cells. Kits map this instead of `columns` so a span is
   * one `<td>` and covered neighbours are already gone.
   */
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>;
  /**
   * Table-slot indexes a continuing row span already owns on extras in
   * front of this person (`beforeRowId`). Extra rows omit a `<td>` there.
   */
  extraCoveredSlots: ReadonlyMap<string, ReadonlySet<number>>;
}

function pinnedIdSet<TRow>(
  getRowId: (row: TRow) => string,
  pinnedTop: readonly TRow[] | undefined,
  pinnedBottom: readonly TRow[] | undefined
): Set<string> {
  const pinnedIds = new Set<string>();
  for (const row of pinnedTop ?? []) pinnedIds.add(getRowId(row));
  for (const row of pinnedBottom ?? []) pinnedIds.add(getRowId(row));
  return pinnedIds;
}

function extraCoveredSlotMap<TRow>(
  extraRows: readonly ExtraRow[] | undefined,
  visualIds: readonly string[],
  cellsByRow: ReadonlyMap<string, readonly BodyCell<TRow>[]>,
  leadingCells: number
): Map<string, ReadonlySet<number>> {
  const extraCoveredSlots = new Map<string, ReadonlySet<number>>();
  for (const extra of extraRows ?? []) {
    if (extra.beforeRowId === undefined) continue;
    if (extraCoveredSlots.has(extra.beforeRowId)) continue;
    extraCoveredSlots.set(
      extra.beforeRowId,
      extraCoveredTableSlots(extra.beforeRowId, {
        visualIds,
        cellsByRow,
        extraRows,
        leadingCells,
      })
    );
  }
  return extraCoveredSlots;
}

/**
 * Derive the shared render prelude from {@link SharedTableRenderProps} —
 * extracted so each adapter's renderer doesn't repeat the identical block
 * (and trip the duplication gate).
 *
 * @typeParam TRow - The row type.
 *
 * @public
 */
export function tableRenderModel<TRow>(
  props: Pick<
    SharedTableRenderProps<TRow>,
    | "table"
    | "rows"
    | "rowActions"
    | "getRowId"
    | "rowEntries"
    | "renderRowDetail"
    | "expansion"
    | "columnWindow"
    | "editing"
    | "rowReorder"
    | "pinnedTopRows"
    | "pinnedBottomRows"
    | "getCellSpan"
    | "pinOffset"
    | "tree"
    | "grouping"
    | "extraRows"
  >
): TableRenderModel<TRow> {
  const { selection, labels } = props.table;
  // Windowed columns replace the full set for every renderer at once, so no
  // adapter has to know whether the horizontal axis is windowed.
  const windowed = props.columnWindow?.enabled === true;
  const columns = windowed
    ? (props.columnWindow?.columns ?? props.table.columns)
    : props.table.columns;
  // The trailing control column exists for row actions AND for row-mode's own
  // edit / save / cancel — both live there, and a row edit with nowhere to be
  // saved from would be a mode nobody can leave.
  const showActions =
    (props.rowActions?.length ?? 0) > 0 ||
    props.editing?.rowEditing !== undefined;
  const showReorder = props.rowReorder !== undefined;
  const expandable = Boolean(props.renderRowDetail && props.expansion);
  const hasSelection = Boolean(selection);
  const leadingCells =
    (expandable ? 1 : 0) + (showReorder ? 1 : 0) + (hasSelection ? 1 : 0);
  const pinnedIds = pinnedIdSet(
    props.getRowId,
    props.pinnedTopRows,
    props.pinnedBottomRows
  );
  const rawEntries = resolveVirtualRows(
    props.rows,
    props.getRowId,
    props.rowEntries
  );
  const entries =
    pinnedIds.size === 0
      ? rawEntries
      : rawEntries.filter((entry) => !pinnedIds.has(entry.key));
  const fullColumns = props.table.columns;
  const windowKeys = windowed
    ? new Set(columns.map((column) => column.key))
    : undefined;
  const cellOptions = {
    columns: fullColumns,
    getRowId: props.getRowId,
    getCellSpan: props.getCellSpan,
    pinOffset: props.pinOffset,
    windowKeys,
  };
  const cellsByRow = new Map<string, readonly BodyCell<TRow>[]>();
  const merge = (map: ReadonlyMap<string, readonly BodyCell<TRow>[]>) => {
    for (const [key, cells] of map) cellsByRow.set(key, cells);
  };
  const scrollRows = bodyRowEntries(entries, props.tree);
  const visualRows = [
    ...(props.pinnedTopRows ?? []),
    ...scrollRows.map((entry) => entry.row),
    ...(props.pinnedBottomRows ?? []),
  ];
  const visualIds = visualRows.map((row) => props.getRowId(row));
  merge(
    buildBodyCells({
      ...cellOptions,
      rows: visualRows,
    })
  );
  // A grouped body renders `grouping.entries`, not the row list above — its
  // leaves reach the screen through a different array and would otherwise have
  // no cells built for them at all, so every grouped row would render empty.
  const groupedRows = (props.grouping?.entries ?? []).filter(
    (entry): entry is Extract<GroupedFlatEntry<TRow>, { kind: "row" }> =>
      entry.kind === "row"
  );
  if (groupedRows.length > 0) {
    merge(
      buildBodyCells({
        ...cellOptions,
        rows: groupedRows.map((entry) => entry.row),
        firstRowIndex: groupedRows[0]?.index ?? 0,
      })
    );
  }
  const spannedCells = inflateBodyCellRowSpans(
    cellsByRow,
    visualIds,
    props.extraRows
  );
  if (spannedCells !== cellsByRow) {
    cellsByRow.clear();
    merge(spannedCells);
  }
  const extraCoveredSlots = extraCoveredSlotMap(
    props.extraRows,
    visualIds,
    cellsByRow,
    leadingCells
  );
  return {
    columns,
    selection,
    labels,
    showActions,
    showReorder,
    leadingCells,
    entries,
    columnSpan:
      virtualColumnSpan(
        columns.length,
        hasSelection,
        showActions,
        expandable,
        showReorder
      ) + (windowed ? 2 : 0),
    columnSpacers: windowed
      ? {
          start: props.columnWindow?.paddingStart ?? 0,
          end: props.columnWindow?.paddingEnd ?? 0,
        }
      : undefined,
    cellsByRow,
    extraCoveredSlots,
  };
}

/**
 * Memoised `summaryRow` aggregation: re-executes ONLY when the rendered
 * rows change, never on unrelated table re-renders (a search keystroke,
 * a checkbox toggle). The builder is read through a ref because callers
 * routinely pass it inline — a fresh identity every render — and the
 * aggregate walks the full filtered set, which is exactly the work this
 * exists to avoid repeating.
 *
 * @typeParam TRow - The row type.
 * @param summaryRow - The caller's summary builder, or `undefined` when off.
 * @param rows - The rows the summary describes.
 * @returns The aggregate cells, or `undefined` when no builder is set.
 *
 * @public
 */
export function useSummaryCells<TRow>(
  summaryRow:
    ((rows: readonly TRow[]) => Partial<Record<string, ReactNode>>) | undefined,
  rows: readonly TRow[]
): Partial<Record<string, ReactNode>> | undefined {
  const fromView = incrementalViewOf(rows)?.aggregates;
  const builderRef = useRef(summaryRow);
  builderRef.current = summaryRow;
  const enabled = summaryRow !== undefined && fromView === undefined;
  return useMemo(
    () => (enabled ? builderRef.current?.(rows) : fromView),
    [enabled, rows, fromView]
  );
}

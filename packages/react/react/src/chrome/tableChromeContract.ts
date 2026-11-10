import {
  type ColumnGroupRecord,
  type ConfirmHandler,
  type FeatureNotice,
  type FilterDef,
  type FilterTypeRegistry,
  type GroupAggregatesFn,
  type GroupByInput,
  type GroupedFlatEntry,
  type GroupingPanelState,
  type PinnedRows,
  type RowAction,
  type TableErrorState,
  type TableSource,
  type TreeEntry,
  type TreeShape,
} from "@adapttable/core";
import { type ReactNode, type RefObject } from "react";

import type { ColumnDef } from "../columnDef";
import type { ReactUseColumnLayoutResult } from "../columns/useColumnLayout";
import type { EditableCellEditing } from "../editing/editableCellController";
import type { ActiveFilterChip } from "../filters/useActiveFilterChips";
import type { GroupCollapseState } from "../grouping/useGroupCollapse";
import type { RowMutationsState } from "../rows/rowMutations";
import type { RowPinningState } from "../rows/rowPinning";
import type { RowReorderState } from "../rows/rowReorder";
import type { RowExpansionState } from "../rows/useRowExpansion";
import type { TreeExpansionState } from "../tree/useTreeExpansion";
import { type UseDataTableResult } from "../useDataTable/useDataTable";

/**
 * Which body region a `DataTable` should render. Named `TableBodyRegion`
 * (not `TableBody`) so it never collides with MUI's `TableBody` component
 * in consumer imports.
 *
 * @public
 */
export type TableBodyRegion = "skeleton" | "empty" | "mobile" | "desktop";

/**
 * The shared, UI-agnostic orchestration result for an adapter table.
 *
 * @public
 */
export interface TableChrome<TRow> {
  /**
   * The source as the VIEW sees it. Identical to the caller's source —
   * except with grouping armed, where the table renders the full filtered
   * set and this facade presents that set (full rows, one page, matching
   * total) so footer numbers, select-all scope and page-scope CSV export
   * agree with the screen. Adapters read THIS, never the raw source.
   */
  source: TableSource<TRow>;
  /** The headless table state + prop-getters. */
  table: UseDataTableResult<TRow>;
  /** Resolved mobile layout flag. */
  isMobile: boolean;
  /** Resolved confirmation handler. */
  confirm: ConfirmHandler;
  /** Row id extractor (selection id, falling back to rowKey). */
  getRowId: (row: TRow) => string;
  /** Derived chips: label-driven merged with caller `extraChips`. */
  mergedChips: readonly ActiveFilterChip[];
  /** Active filter count (override, or merged chip count). */
  activeFilterCount: number;
  /** Declarative filter definitions the shell resolved. */
  filterDefs?: readonly FilterDef<TRow>[];
  /** Type registry those defs were built against. */
  filterRegistry?: FilterTypeRegistry;
  /** Whether the resolved pagination mode is `"paged"`. */
  isPaged: boolean;
  /**
   * The table root. Owned here so the width that drives progressive column
   * hiding is measured on the table itself, in both wiring paths.
   */
  rootRef: RefObject<HTMLDivElement | null>;
  /** Column keys progressive hiding gave up at the current width. */
  droppedColumns: readonly string[];
  /** Which body region to render. */
  body: TableBodyRegion;
  /**
   * The load failure to show in place of the body, or `undefined` when the
   * source is fine. Derived here so every adapter offers a retry on exactly
   * the same terms — one the source can actually perform.
   */
  errorState?: TableErrorState;
  /**
   * Why the body is empty: `"noResults"` when an active search/filter
   * produced zero rows (offer a clear-filters CTA), `"noData"` when the
   * source itself is empty. Only meaningful while `body === "empty"`.
   */
  emptyVariant: "noData" | "noResults";
  /**
   * A background refresh is in flight (`isFetching` without `isLoading`):
   * rows on screen are potentially stale. Adapters show a subtle,
   * non-blocking indicator (thin progress bar / `aria-busy`).
   */
  isRefreshing: boolean;
  /**
   * Clear-filters handler: the caller's `onClearFilters`, falling back to
   * `source.clearExtras` — so chips, the drawer and the no-results CTA can
   * always offer a working "clear".
   */
  clearFilters: () => void;
  /**
   * Row-detail bundle — present iff `renderRowDetail` is set, so ONE guard
   * narrows both the renderer and the expansion state (no correlated
   * optionals to re-check).
   */
  detail?: {
    /** The caller's detail-panel renderer. */
    render: (row: TRow) => ReactNode;
    /** Expansion state for the chevrons. */
    expansion: RowExpansionState;
  };
  /**
   * Inline editing bundle — present iff either channel is set (`onCellEdit`
   * for per-cell commits, `rowEditing` + `onRowEdit` for row-level ones), so
   * ONE guard narrows the host channel, the state machine, validation, save
   * state, dirty marks and row mode. Pass neither and editing stays fully
   * dormant: no UI, no keyboard.
   */
  editing?: EditableCellEditing<TRow>;
  /**
   * Adding, duplicating and deleting rows. Empty until `rowActions()` is
   * composed. `canAdd` says whether the toolbar's Add control renders.
   */
  rowMutations: RowMutationsState<TRow>;
  /** Size every visible column to its content. Present with column layout. */
  autoSizeColumns?: () => void;
  /** Size one column to its content. Present with column layout. */
  autoSizeColumn?: (key: string) => void;
  /**
   * The row actions to render — the host's, plus duplicate and delete when
   * those are wired, and `undefined` when the reader hid the actions column.
   * Adapters read THIS rather than internal feature configuration.
   */
  rowActions?: RowAction<TRow>[];
  /**
   * Whether an actions column exists at all, hidden or not — what the column
   * menu offers, and the one figure a hidden column must not change.
   */
  hasRowActions: boolean;
  /**
   * Whether a reorder column exists at all, hidden or not — what the column
   * menu offers. Grouped and tree models keep it armed and resolve sibling
   * reorder separately from cross-boundary moves.
   */
  hasRowReorder: boolean;
  /**
   * Headless row-reorder state. Present iff the row-reorder feature is composed,
   * grouping/tree are off, and the column is visible. Adapters read THIS.
   */
  rowReorder?: RowReorderState<TRow>;
  /**
   * Headless row-pin state. Present iff the pinning feature is composed
   * and grouping/tree are off.
   */
  rowPinning?: RowPinningState<TRow>;
  /**
   * Host-owned summary objects stuck above and below the scroll body.
   * Present iff `pinnedSummaryRows` was composed with at least one row.
   */
  pinnedRows?: PinnedRows<TRow>;
  /**
   * Whether grouping is armed — full-set overlay is on. Pinning and
   * reorder read this rather than re-parsing `groupBy`.
   */
  groupingArmed: boolean;
  /**
   * Whether the host declared a tree. Pinning and reorder refuse a
   * nested list.
   */
  treeShaped: boolean;
  /**
   * Tree bundle — present iff the host declared a hierarchy (`getChildren` or
   * `getParentId`). A tree and a grouping are different models and can both be
   * dormant; a table that arms both renders the tree, since the rows' own
   * shape outranks a derived one.
   */
  tree?: {
    /** The flattened hierarchy, in render order. */
    entries: readonly TreeEntry<TRow>[];
    /** Every loaded node, including descendants of collapsed parents. */
    allEntries?: readonly TreeEntry<TRow>[];
    /** Loaded descendants to read within an export's source scope. */
    getChildren?: NonNullable<TreeShape<TRow>["getChildren"]>;
    /** Flat ancestry to reconstruct within an export's source scope. */
    getParentId?: NonNullable<TreeShape<TRow>["getParentId"]>;
    /** Which nodes are open. */
    expansion: TreeExpansionState;
    /** Which column carries the chevron and the indent. */
    columnKey?: string;
  };
  /**
   * Row-grouping bundle — present iff an effective `groupBy` is set AND the
   * source can supply a full filtered set (`allFilteredRows`). Omit
   * `groupBy` and grouping stays fully dormant (package DNA: opt-in).
   */
  grouping?: {
    /** The grouping keys in order — one entry for a flat group, more for nested. */
    groupBy: readonly string[];
    collapsed: GroupCollapseState;
    aggregates?: GroupAggregatesFn<TRow>;
    /** Flat group-header + leaf entries for adapters to render. */
    entries: readonly GroupedFlatEntry<TRow>[];
    setGroupBy: (key: GroupByInput) => void;
    /** Open every group. */
    expandAll: () => void;
    /** Close every group, at every level. */
    collapseAll: () => void;
    /**
     * Show the tree down to `depth` and no further — `0` leaves only the
     * outermost headers, `1` opens the first level inside them.
     */
    collapseToDepth: (depth: number) => void;
    /** Reveal the next page of groups, or of one group's rows. */
    showMore: (entry: { scope: "groups" | "rows"; groupKey?: string }) => void;
  };
  /** Interactive grouping strip state, present only with `groupingPanel()`. */
  groupingPanel?: GroupingPanelState;
  /**
   * The rows the editing layer must treat as present: the grouped leaf set
   * (in render order) while grouping renders the full filtered set, the
   * page slice otherwise. Adapters pass THIS — never `source.rows` — as the
   * `rows` context for editable cells, so an edit on a row outside the
   * current page slice survives and Tab-advance follows the rendered order.
   */
  editingRows: readonly TRow[];
  /** Whether the paged footer should render. */
  showFooter: boolean;
  /** User column-layout state + mutators (visibility, order, …). */
  columnLayout: ReactUseColumnLayoutResult<TRow>;
  /** Tree groups for the declared columns — collapse options, header align. */
  columnGroups: ReadonlyMap<string, ColumnGroupRecord<TRow>>;
  /** All declared columns (pre layout/device filtering) for the column menu. */
  allColumns: ColumnDef<TRow>[];
  /**
   * Whether hide / order / pin setters on {@link columnLayout} actually
   * write. The three-prop table publishes no-ops; a layout-owning feature
   * replaces them.
   */
  columnLayoutLive?: boolean;
  /**
   * Opted-in features that cannot run. Empty when everything the host
   * asked for can. Adapters show these on the status bar (when it is
   * on) and as `data-adapttable-notices` on the root; the matching
   * control already looks off, disabled, or one-page.
   */
  featureNotices: readonly FeatureNotice[];
}

/**
 * Run the shared orchestration every adapter `<DataTable>` needs: resolve
 * the layout + confirm handler, build the headless table, merge filter
 * chips, compute the active-filter count, and decide which body region and
 * footer to show. Adapters then render their kit-specific markup from this.
 *
 * @typeParam TRow - The row type.
 * @param props - The adapter's `ComposedTableProps`.
 * @returns The {@link TableChrome} orchestration result.
 */
/**
 * The undo/redo half of a toolbar's props, or nothing at all.
 *
 * Two conditions have to hold — the host asked for the buttons, and there
 * is a history for them to drive — and resolving both here means an
 * adapter renders the pair on `onUndo` being present and never has to
 * know that `editHistory` exists. Off, the object is empty and the props
 * are absent, which is what keeps an opted-out toolbar identical.
 */

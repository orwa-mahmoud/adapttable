import {
  type ColumnGroupRecord,
  type ConfirmHandler,
  type FeatureNotice,
  type GroupingPanelState,
  type PinnedRows,
  type TableErrorState,
  type TableSource,
} from "@adapttable/core";
import { type RefObject } from "react";

import type { ColumnDef } from "../columnDef";
import type { ReactUseColumnLayoutResult } from "../columns/useColumnLayout";
import type { RowReorderState } from "../rows/rowReorder";
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
   * Clear the filter extras and the filter tree, then call the host's
   * `onClearFilters`: what the chips' and the filter panel's "Clear all" do.
   */
  clearFilters: () => void;
  /**
   * Clear the search as well as the filters, then call `onClearFilters`:
   * what the no-results view offers, since a search alone can be what
   * matched nothing.
   */
  clearSearchAndFilters: () => void;
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
   * Host-owned summary objects stuck above and below the scroll body.
   * Present iff `pinnedSummaryRows` was composed with at least one row.
   */
  pinnedRows?: PinnedRows<TRow>;
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

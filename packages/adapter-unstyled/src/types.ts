import type {
  BaseDataTableProps,
  DataModeProps,
  TableSource,
  UrlStateAdapter,
  UseSavedViewsOptions,
} from "@adapttable/core";
import type { ReactNode } from "react";

/**
 * Per-part class-name hooks. Every node also carries a stable
 * `data-adapttable-part` attribute and `data-*` state attributes so you
 * can style with Tailwind, shadcn, or your own CSS.
 */
export interface DataTableClassNames {
  root?: string;
  toolbar?: string;
  search?: string;
  /** The search field wrapper (holds the search input + leading icon). */
  searchField?: string;
  /** The leading magnifying-glass icon inside the search field. */
  searchIcon?: string;
  sortSelect?: string;
  /** Rows-per-page `<select>` (toolbar in infinite mode, footer when paged). */
  rowsPerPageSelect?: string;
  filtersButton?: string;
  /** The leading funnel icon inside the Filters button. */
  filtersIcon?: string;
  filtersCount?: string;
  /** The Export CSV toolbar button (when `exportCsv` is set). */
  exportCsvButton?: string;
  filtersAnchor?: string;
  filtersBackdrop?: string;
  filtersPopover?: string;
  filtersPanel?: string;
  filtersHeader?: string;
  filtersTitle?: string;
  filtersClose?: string;
  filtersBody?: string;
  filtersFooter?: string;
  filtersClear?: string;
  filtersDone?: string;
  /** One auto-built filter field (the `<label>`/`<fieldset>` wrapper). */
  filterField?: string;
  /** The field's caption (the `<span>`/`<legend>` holding the label text). */
  filterLabel?: string;
  /** Text / date / number inputs inside an auto-built field. */
  filterInput?: string;
  /** The `<select>` of an auto-built `select` field. */
  filterSelect?: string;
  /** The operator `<select>` of an auto-built range field. */
  filterOperator?: string;
  /** The checkbox-list container of an auto-built `multiSelect` field. */
  filterCheckboxGroup?: string;
  /** One checkbox option (`<label>` + checkbox) in a `multiSelect` field. */
  filterCheckbox?: string;
  /** The placeholder shown while a field's async options load. */
  filterOptionsLoading?: string;
  chips?: string;
  chip?: string;
  chipRemove?: string;
  columnMenu?: string;
  columnMenuButton?: string;
  columnMenuPanel?: string;
  columnMenuHeader?: string;
  columnMenuTitle?: string;
  columnMenuItem?: string;
  columnMenuGrip?: string;
  columnMenuLabel?: string;
  columnMenuVisibility?: string;
  columnMenuPin?: string;
  /** The separator above the trailing row-actions entry in the menu. */
  columnMenuSeparator?: string;
  columnMenuReset?: string;
  /** The saved-views menu trigger button. */
  viewsButton?: string;
  /** The saved-views dropdown panel. */
  viewsPanel?: string;
  /** One saved view's apply button in the list. */
  viewsItem?: string;
  /** A saved view's delete button. */
  viewsDelete?: string;
  /** The view-name input in the save row. */
  viewsInput?: string;
  /** The save-view button in the save row. */
  viewsSave?: string;
  resizeHandle?: string;
  bulkBar?: string;
  bulkButton?: string;
  /** The failure line shown in the bulk bar after a rejected bulk action. */
  bulkError?: string;
  /** The cross-page banner inside the bulk bar (full page selected). */
  selectAllBanner?: string;
  /** The banner's status text (page selected / all matching selected). */
  selectAllText?: string;
  /** The banner's action button (select all matching / clear all). */
  selectAllButton?: string;
  table?: string;
  thead?: string;
  headerRow?: string;
  headerCell?: string;
  /** The grouped-header `<tr>` rendered above the column headers. */
  groupRow?: string;
  /** One spanning `<th>` (or edge gap) inside the group row. */
  groupCell?: string;
  sortButton?: string;
  /** The 1-based multi-sort position badge inside a sorted header. */
  sortIndex?: string;
  tbody?: string;
  row?: string;
  cell?: string;
  /** The leading expand-chevron header cell (row expansion). */
  expandHeader?: string;
  /** The leading expand-chevron body cell on each row. */
  expandCell?: string;
  /** The expand/collapse chevron button (desktop rows and mobile cards). */
  expandButton?: string;
  /** The full-width detail `<tr>` rendered under an expanded row. */
  detailRow?: string;
  /** The single spanning `<td>` inside the detail row. */
  detailCell?: string;
  /** The detail section inside an expanded mobile card. */
  cardDetail?: string;
  actionsCell?: string;
  actionButton?: string;
  selectionCell?: string;
  checkbox?: string;
  loadMore?: string;
  loadMoreButton?: string;
  cards?: string;
  card?: string;
  cardRow?: string;
  cardLabel?: string;
  cardValue?: string;
  /** The `<tfoot>` holding the summary row. */
  summary?: string;
  /** The summary `<tr>` inside the footer. */
  summaryRow?: string;
  /** One summary `<td>` (aligned under its column, or an edge pad). */
  summaryCell?: string;
  /** The trailing summary `<li>` in the mobile card list. */
  summaryCard?: string;
  /** The paged footer row (rows-per-page + showing on one side, pager on the other). */
  footer?: string;
  /** The pager group on the footer's trailing edge: page-of label + numbered pages. */
  pager?: string;
  /** Every pager button: prev/next arrows and each numbered page (the current page carries `aria-current="page"`). */
  pageButton?: string;
  /** The "…" gap standing in for elided page numbers. */
  pageEllipsis?: string;
  empty?: string;
  /** The clear-filters button inside the "no results" empty state. */
  emptyClear?: string;
  loading?: string;
  /** The non-blocking background-refresh progress indicator. */
  refreshIndicator?: string;
  error?: string;
  retryButton?: string;
}

/**
 * Overridable sub-components — a cross-adapter alias for the top-level
 * `emptyState` / `loadingState` props. When both are supplied the `slots`
 * entry wins (`slots.empty ?? emptyState`, `slots.skeleton ?? loadingState`).
 */
export interface DataTableSlots {
  /** Replace the empty-state (alias for `emptyState`). */
  empty?: ReactNode;
  /** Replace the loading skeleton (alias for `loadingState`). */
  skeleton?: ReactNode;
}

/** Props for the unstyled `<DataTable>`. */
interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source (`useFrontendData`,
   * `useBackendData`, …), used as-is. Omit it and pass `data` instead for
   * the managed tiers.
   */
  source?: TableSource<TRow>;
  /**
   * The rows. Alone: frontend tier — the table filters/sorts/pages them.
   * With `onQueryChange`: server tier — the current page, as returned.
   */
  data?: readonly TRow[];
  /** Server tier: total row count across all pages (drives the pager). */
  total?: number;
  /** Server tier: request in flight. */
  loading?: boolean;
  /**
   * URL-state adapter for the managed tiers (router integration, memory
   * adapter for tests/SSR). Defaults to the browser History API.
   */
  urlAdapter?: UrlStateAdapter;
  /**
   * Sync table state (search, sort, page, filters) to the URL. `false`
   * keeps everything in memory — the table works identically, the address
   * bar never changes, and any `urlAdapter` is ignored.
   *
   * @default true
   */
  urlSync?: boolean;
  /** Per-table URL namespace (e.g. `"left"` → `left.q`, `left.page`). */
  urlKey?: string;
  /**
   * Mounts a saved-views menu in the toolbar (beside the Columns button).
   * The table's own `urlAdapter` / `urlKey` fill in unless overridden here.
   */
  savedViews?: UseSavedViewsOptions;
  /** Per-part class name overrides. */
  classNames?: DataTableClassNames;
  /** Empty-state node override. */
  emptyState?: ReactNode;
  /** Loading-state node override (replaces the skeleton on first load). */
  loadingState?: ReactNode;
  /**
   * Cross-adapter alias for `emptyState` / `loadingState`. Takes precedence
   * over the top-level props when both are provided.
   */
  slots?: DataTableSlots;
  /**
   * Animate rows/cards on mount (dependency-free; honors reduced motion).
   * Off by default.
   */
  animate?: boolean;
}

/**
 * Props for the unstyled `<DataTable>`: the base surface intersected
 * with core's data-mode union, so `mode="server"` requires
 * `onQueryChange` at compile time and `mode="frontend"` turns it into a
 * pure notification.
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;

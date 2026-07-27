import type { ReactNode } from "react";

import type { ConfirmHandler } from "./actions/confirm";
import type { ColumnLayoutState } from "./columns/useColumnLayout";
import type { ExportCsvOptions } from "./export/tableCsv";
import type { FilterDef } from "./filters/filterDefs";
import type {
  ActiveFilterChip,
  ChipLabelResolver,
} from "./filters/useActiveFilterChips";
import type { TableSource } from "./source/TableSource";
import type {
  BulkAction,
  ColumnDef,
  Direction,
  ExtraFilters,
  PaginationMode,
  RowAction,
  SortByOption,
  TableLabels,
  TableQueryParams,
} from "./types";

/**
 * The UI-agnostic prop surface shared by every AdaptTable adapter's
 * `<DataTable>`. Adapters extend this with kit-specific extras (slots,
 * classNames, animation, …) so the common contract lives in one place.
 *
 * @typeParam TRow - The row type.
 */
export interface BaseDataTableProps<TRow> {
  /** Data + state contract from `useFrontendData` / `useQuerySource`. */
  source: TableSource<TRow>;
  /** Column definitions. */
  columns: ColumnDef<TRow>[];
  /** Stable React key extractor for a row. */
  rowKey: (row: TRow) => string;

  /* ── Display ─────────────────────────────────────────────────────── */
  /** Trailing per-row actions. */
  rowActions?: RowAction<TRow>[];
  /** Accessible label for the table. */
  tableLabel?: string;
  /** Placeholder for the search input. */
  searchPlaceholder?: string;
  /** Options for a mobile sort-by select. */
  sortByOptions?: SortByOption[];
  /** Pre-translated label overrides. */
  labels?: TableLabels;
  /** Text direction. Defaults to `"ltr"`. */
  dir?: Direction;
  /**
   * Active locale tag (e.g. `"ar"`, `"ar-EG"`). Drives per-column `i18n`
   * data-path resolution; labels stay a separate concern (`labels`).
   */
  locale?: string;
  /**
   * Row density — independent of column pinning. `"comfortable"` (default) is
   * the roomy layout; `"compact"` tightens row height/padding. Each adapter
   * maps it to its kit's table size.
   */
  density?: "comfortable" | "compact";
  /** Force the mobile layout (otherwise resolved from the viewport). */
  forceMobile?: boolean;
  /**
   * Initial state applied while the URL is silent about a key — e.g.
   * `defaults={{ limit: 10, sortBy: "name" }}`. The user's own changes
   * (and explicit URL params) always win.
   */
  defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /**
   * Debounce for committing the search input to the source, in
   * milliseconds. Defaults to 300.
   */
  searchDebounceMs?: number;
  /**
   * Pagination mode: `"paged"`, `"infinite"`, or `"auto"` (the default —
   * mobile resolves to infinite, desktop to paged). `virtualize` applies
   * in infinite mode; on a paged desktop table it is inert.
   */
  paginationMode?: PaginationMode;
  /** Alias for `forceMobile` (v1 name) — deleted before the 2.0.0 release. */
  isMobile?: boolean;
  /**
   * How many leading desktop-visible columns anchor the mobile identity
   * block. Never overrides an explicit `hideOnMobile: true` — the
   * author's hide always wins.
   */
  mobileIdentityColumns?: number;
  /** Hover-prefetch callback fired on desktop row mouse-enter. */
  prefetch?: (row: TRow) => void;
  /**
   * Row activation — fires on row click and on Enter when the row has focus.
   * Interactive children (action buttons, the selection checkbox, links)
   * keep their own behaviour and never trigger it.
   */
  onRowClick?: (row: TRow) => void;
  /** Called whenever the materialized source rows change. */
  onRowsChange?: (rows: readonly TRow[]) => void;
  /**
   * Inline cell-edit channel. Providing this (together with per-column
   * `editable`) activates editing — omit it and the table never opens an
   * editor, even if columns declare `editable`. The table never mutates
   * rows; apply `nextValue` in your own state / mutation.
   */
  onCellEdit?: (row: TRow, key: string, nextValue: unknown) => void;
  /**
   * Conditional per-row class: `(row, index) => "overdue"` — appended to the
   * adapter's own row classes on desktop rows and mobile cards alike.
   */
  rowClassName?: (row: TRow, index: number) => string | undefined;
  /**
   * Row expansion: render a detail panel under a row. Its presence enables
   * the leading expand chevron on desktop rows and the detail section on
   * mobile cards; multiple rows may be open, keyed by row id.
   */
  renderRowDetail?: (row: TRow) => ReactNode;
  /**
   * Footer summary: map the CURRENT page's rows to per-column summary cells
   * (`{ budget: <b>{total}</b> }`). Rendered as a table footer row aligned
   * under its columns; keys absent from the result render empty cells.
   */
  summaryRow?: (rows: readonly TRow[]) => Partial<Record<string, ReactNode>>;
  /**
   * Single-level row grouping by column key. Its presence (or
   * `source.groupBy`) arms grouping chrome — omit it and the table never
   * inserts group header rows (package DNA: opt-in). Frontend tier only;
   * server-paginated sources get a devWarn and grouping is ignored.
   */
  groupBy?: string | null;
  /**
   * Notification fired AFTER the grouping change is applied — the table
   * always performs the change itself. Take full control (e.g. a fully
   * controlled `groupBy`) through `source.setGroupBy` instead.
   */
  onGroupByChange?: (groupBy: string | null) => void;
  /**
   * Per-group aggregate cells — **same signature as {@link summaryRow}**.
   * Called with each group's leaf rows. Omit for headers without subtotals.
   */
  groupAggregates?: (
    rows: readonly TRow[]
  ) => Partial<Record<string, ReactNode>>;
  /**
   * Controlled collapsed group keys (ephemeral — not URL-synced).
   * Uncontrolled: internal {@link useGroupCollapse}.
   */
  collapsedGroupIds?: readonly string[];
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Disable the built-in search box. */
  /**
   * Render the search input. Positive polarity — `false` hides it.
   * @defaultValue true
   */
  searchable?: boolean;
  /** Alias for `searchable: false` (v1 name) — deleted before the 2.0.0 release. */
  hideSearch?: boolean;
  /**
   * Opt into multi-column sorting: shift-click (or shift-Enter) on a header
   * adds the column to the sort chain (asc → desc → removed); a plain click
   * still single-sorts. Sorted headers expose `data-sort-index` for badges.
   */
  multiSort?: boolean;

  /* ── Column management ───────────────────────────────────────────── */
  /** Render the built-in "Columns" menu (show/hide, pin, reorder). */
  enableColumnMenu?: boolean;
  /** Enable drag/keyboard column resize handles. Defaults to false (opt-in). */
  resizableColumns?: boolean;
  /** Controlled column layout (hidden/order/pinned/widths). */
  columnLayout?: ColumnLayoutState;
  /** Change handler for the controlled column layout. */
  onColumnLayoutChange?: (next: ColumnLayoutState) => void;
  /** Initial column layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * Fixed-height scroll box (px). Enables sideways scrolling + column pinning;
   * the header and pinned columns pin within this box. Omit for page scroll.
   */
  maxHeight?: number;

  /* ── Virtualization ──────────────────────────────────────────────── */
  /** Virtualize long infinite lists. Defaults to false. */
  virtualize?: boolean;
  /** Desktop row-size estimate in px. */
  estimateRowSize?: number;
  /** Mobile card-size estimate in px. */
  estimateCardSize?: number;
  /** Extra rows/cards rendered before and after the virtual window. */
  virtualOverscan?: number;
  /** Scroll margin for window virtualization, usually sticky chrome height. */
  virtualScrollMargin?: number;

  /* ── Filters ─────────────────────────────────────────────────────── */
  /**
   * The table's filters. Pass a declarative array and the adapter builds the
   * form with kit-native widgets (each definition also drives URL parsing,
   * chips and — on frontend data — the row predicate); pass JSX to draw the
   * form yourself. Column-level `filter` shorthands merge in; a `filters`
   * entry with the same key wins.
   */
  filters?: readonly FilterDef<TRow>[] | ReactNode;
  /**
   * How the filter container opens. `"popover"` (default) anchors a light
   * card under the Filters button — no backdrop, closing on Escape and
   * outside click; `"drawer"` slides in a side panel with a real backdrop.
   * The caller passes the same `filters` content either way — only the
   * container changes.
   */
  filtersMode?: "popover" | "drawer";
  /** Per-filter-key chip label resolvers. */
  filterLabels?: Readonly<Record<string, ChipLabelResolver>>;
  /** Extra chips driven by non-URL state, merged with the derived chips. */
  extraChips?: readonly ActiveFilterChip[];
  /** Override the active-filter count (defaults to the chip count). */
  activeFilterCount?: number;
  /**
   * Notification fired AFTER the filters are cleared (drawer, chip strip,
   * no-results CTA) — the table always performs the clear itself. Take
   * full control through `source.clearExtras` instead.
   */
  onClearFilters?: () => void;

  /* ── Bulk actions ────────────────────────────────────────────────── */
  /** Bulk actions — enabling these turns on row selection. */
  bulkActions?: BulkAction[];
  /** Selection id extractor; defaults to `rowKey`. */
  selectionGetId?: (row: TRow) => string;
  /**
   * Controlled selection. When provided, the table reads the selection from
   * this value and reports every change request through `onSelectionChange`
   * — the same controlled/uncontrolled split as `columnLayout`. Omit it for
   * the internal (uncontrolled) selection.
   */
  selectedIds?: readonly string[];
  /**
   * Selection change channel. Uncontrolled: an observer that fires with the
   * selected ids whenever the set changes — once on mount with the initial
   * (empty) selection, on every toggle/select-all, and on the automatic
   * reset when the search or a filter changes (the result set changed, so
   * stale ids never linger). Controlled (`selectedIds` provided): the
   * change-request handler — apply the ids to your state to accept.
   */
  onSelectionChange?: (selectedIds: string[]) => void;

  /* ── Customisation (common) ──────────────────────────────────────── */
  /**
   * Opt-in CSV export toolbar button. Pass `true` for defaults
   * (`export.csv`, current page) or an options object for filename/scope.
   * Omit or `false` to hide the button.
   */
  exportCsv?: boolean | ExportCsvOptions;
  /** Inline toolbar slot for custom controls (view toggles, etc.). */
  toolbar?: ReactNode;
  /** Confirmation handler for actions; defaults to `window.confirm`. */
  confirm?: ConfirmHandler;
  /** Number of skeleton rows while loading. Defaults to the page size. */
  skeletonRows?: number;
  /**
   * Top inset in px for the sticky header (`stickyHeader`) — e.g. the
   * height of an app bar it must clear. Identical meaning in every
   * adapter; Mantine's optional sticky toolbar (`stickyToolbar`) also
   * parks at this inset. Defaults to 0.
   */
  stickyTop?: number;
  /** Keep the desktop table header sticky while scrolling. Defaults to false (opt-in). */
  stickyHeader?: boolean;
  /** Scroll back to the table when search/filter/page changes. Defaults to true. */
  scrollToTopOnChange?: boolean;
  /** Extra gap below sticky chrome when scrolling back. Defaults to 8. */
  scrollTopGap?: number;
}

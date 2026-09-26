/**
 * The table's options: everything a host passes that is data or a callback
 * rather than a renderer.
 *
 * Every binding's `<DataTable>` props extend {@link TableOptions}, adding the
 * pieces that are its own — column definitions with renderers, the feature
 * array, a custom card. Options that carry rendered content take the
 * binding's render node as `TNode` (a React node in React), so one contract
 * serves every framework.
 */
import type { ConfirmHandler } from "./actions/confirm";
import type { ExtraFilters } from "./columnModel";
import type { ColumnLayoutState } from "./columns/columnLayoutModel";
import type {
  EditConflictHandler,
  EditConflictPolicy,
  EditEventHandler,
  RowValidator,
} from "./editing/editContracts";
import type { ActiveFilterChip } from "./filters/activeFilterChips";
import type { ChipLabelResolver, FilterDef } from "./filters/filterDefs";
import type { FilterTypeRegistry } from "./filters/filterRegistry";
import type { CellEdit } from "./focus/cellEdits";
import type { CellRange } from "./focus/cellRange";
import type { GroupNode, GroupSort } from "./grouping/groupRows";
import type { RowActionsLayout, RowActionsRenderer } from "./rows/rowActions";
import type { TableSource } from "./source/TableSource";
import type {
  Direction,
  PaginationMode,
  SortByOption,
  TableLabels,
  TableQueryParams,
} from "./types";

/**
 * Map a set of rows to per-column summary cells.
 *
 * One shape for the footer summary and for group-header aggregates. The cells
 * are rendered, so their values are the binding's render node.
 *
 * @typeParam TRow - The row type.
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export type SummaryRowFn<TRow, TNode = unknown> = (
  rows: readonly TRow[]
) => Partial<Record<string, TNode>>;

/**
 * Where a host's own toolbar controls go.
 *
 * The toolbar reads Search · custom · Filters · Saved views · Columns ·
 * Undo/Redo · Export · Add · Rows per page, and that order is the same in
 * every kit. These name the two places outside it, so a control can be
 * put before everything or after everything without an adapter having to
 * know what the control is.
 *
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface TableToolbarSlots<TNode = unknown> {
  /** Ahead of the search input. */
  start?: TNode;
  /** After every built-in control, before the rows-per-page select. */
  end?: TNode;
}

/**
 * The UI-agnostic options every AdaptTable `<DataTable>` takes.
 *
 * A binding's props extend this with its column definitions, its feature
 * array and anything else that is a renderer, so the common contract lives
 * in one place.
 *
 * @typeParam TRow - The row type.
 * @typeParam TNode - The binding's render node (a React node in React).
 *
 * @public
 */
export interface TableOptions<TRow, TNode = unknown> {
  /** The table's data and state: a `TableSource` from the binding's data hooks or your own. */
  source: TableSource<TRow>;
  /** Stable key for a row — its identity across renders, pages and edits. */
  rowKey: (row: TRow) => string;

  /* ── Display ─────────────────────────────────────────────────────── */
  /**
   * How the trailing actions column renders. Omit or `"buttons"` for the
   * horizontal strip. `"menu"` collapses visible actions into a 3-dot menu
   * using each kit's own Menu. `TableOptions.renderRowActions`
   * wins over this.
   */
  rowActionsLayout?: RowActionsLayout;
  /**
   * Replace the trailing actions cell (desktop and mobile cards). Receives
   * the resolved action list (host + built-in duplicate / delete / pin).
   * When set, `rowActionsLayout` is ignored. The column still only appears
   * when there are row actions (or row-mode editing).
   */
  renderRowActions?: RowActionsRenderer<TRow>;
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
   * The width, in pixels, at or below which the card layout takes over.
   * Defaults to 768 — a phone in portrait.
   *
   * Raise it when the table lives in a sidebar or a split pane, where the
   * viewport says "desktop" while the table has a phone's width to work
   * with. Lower it when the table is the whole page and its columns are
   * narrow enough to survive.
   */
  mobileBreakpoint?: number;
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
   * mobile resolves to infinite, desktop to paged). `virtualize()` applies
   * in infinite mode; on a paged desktop table it is inert.
   */
  paginationMode?: PaginationMode;
  /**
   * Accepted and ignored.
   *
   * @deprecated A card shows every column without `hideOnMobile`, so
   * `hideOnMobile` decides what a card shows. Removed in v4.
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
   * Cut — Ctrl/Cmd+X, after the clipboard has accepted the copy. Requires
   * `cellNavigation`.
   *
   * The table clears nothing itself: what a cut removes is your decision, and
   * emptying cells before the clipboard took them would lose the data outright.
   */
  onCellCut?: (range: CellRange) => void;
  /**
   * Paste — Ctrl/Cmd+V, with the clipboard already parsed into ordinary cell
   * edits. Requires `cellNavigation`.
   *
   * Omit it and every edit goes through the composed `editing()` handler.
   * Provide it to take the batch whole — one server round trip, one undo
   * entry.
   *
   * Cells landing outside the loaded rows or the rendered columns are dropped
   * rather than invented, and a column that is not `editable` is skipped.
   */
  onCellPaste?: (edits: CellEdit<TRow>[]) => void;
  /**
   * Fill — the handle dragged from the selection's corner, or Ctrl/Cmd+D.
   * Requires `cellNavigation`.
   *
   * Same contract as `onCellPaste`: omit it and every edit goes through the
   * composed `editing()` handler. Provide it to take the batch whole.
   */
  onCellFill?: (edits: CellEdit<TRow>[]) => void;
  /**
   * Mark cells a patch just changed — `data-flash` on the cell and on the
   * matching card value. Pair with the binding's changed-cell flash —
   * `useChangedCellFlash` in `@adapttable/react/stream`. Omit and nothing is
   * marked.
   */
  isCellFlashing?: (rowId: string, columnKey: string) => boolean;
  /**
   * Gate a commit on a rule no single cell can answer — an end date before its
   * start, a total that must match its parts. Receives the row the edit WOULD
   * produce, not the stored one; return a message for a row-level problem, a map
   * of column key → message to mark individual cells, or nothing to allow it.
   * May be async.
   */
  validateRow?: RowValidator<TRow>;
  /**
   * Put a row back the way it was after a rejected save.
   *
   * A table that applies an edit optimistically has already shown the new
   * value, so a rejection has to restore the old one — and only the host can
   * write to its own rows. Without this the cell is marked failed and the value
   * stays put, which is right for a table that refetches instead.
   */
  onEditRollback?: (previous: TRow, columnKey: string) => void;
  /** Turn a rejected save into the sentence its cell shows. */
  formatEditError?: (error: unknown) => string;
  /**
   * Observe an editor opening. Fires for cell, row and batch units. The
   * handler cannot change the outcome — throwing is swallowed.
   */
  onEditStart?: EditEventHandler<TRow>;
  /**
   * Observe a cancel (Escape, Cancel, throwing a batch away). Not fired when
   * a successful commit merely closes the editor.
   */
  onEditCancel?: EditEventHandler<TRow>;
  /**
   * Observe a value reaching the host. Fires after parse and validation, at
   * the same moment as the composed cell, row or batch edit handler.
   */
  onEditCommit?: EditEventHandler<TRow>;
  /**
   * Observe a validator refusing a value. The editor stays open with the
   * message; this is how analytics hears about it.
   */
  onValidationFail?: EditEventHandler<TRow>;
  /**
   * Observe a save promise rejecting. The cell is already marked failed;
   * this is the side-effect channel.
   */
  onEditError?: EditEventHandler<TRow>;
  /**
   * A row changed underneath an open editor. Return `"keep"` or `"take"` to
   * resolve it; return nothing and `TableOptions.editConflictPolicy`
   * decides. The default policy is `"ask"`.
   */
  onEditConflict?: EditConflictHandler<TRow>;
  /**
   * What to do when a live update disagrees with an open editor and the host
   * did not choose. `"ask"` (default) surfaces Keep mine / Take theirs.
   */
  editConflictPolicy?: EditConflictPolicy;
  /**
   * Host version of a row. When set, any version change under an open editor
   * is a conflict, not only a change to the edited column.
   */
  rowVersion?: (row: TRow) => string | number;
  /**
   * How an edit is applied to a row for `TableOptions.validateRow`
   * to judge. Defaults to a shallow spread keyed by the column key, which is
   * right when a column key IS the field; pass this when a column reads a
   * nested path.
   */
  applyEdit?: (row: TRow, columnKey: string, value: unknown) => TRow;
  /**
   * Footer summary: map the CURRENT page's rows to per-column summary cells
   * (`{ budget: <b>{total}</b> }`). Rendered as a table footer row aligned
   * under its columns; keys absent from the result render empty cells.
   */
  summaryRow?: SummaryRowFn<TRow, TNode>;
  /**
   * Free slot under the table (above the pager). Not the column-aligned
   * summary row — that is `TableOptions.summaryRow`.
   */
  tableFooter?: TNode;
  /**
   * Whether a row has children that have not been fetched yet — a server tree
   * knows there is more before the browser does.
   */
  hasChildren?: (row: TRow) => boolean;
  /** Controlled tree expansion: the ids currently open. */
  expandedIds?: readonly string[];
  /** Fired after the table opens or closes a node. */
  onExpandedIdsChange?: (ids: string[]) => void;
  /**
   * Notification fired AFTER the grouping change is applied — the table
   * always performs the change itself. Take full control (e.g. a fully
   * controlled `groupBy`) through `source.setGroupBy` instead.
   *
   * Receives the keys as a list, empty when grouping was cleared.
   */
  onGroupByChange?: (groupBy: readonly string[]) => void;
  /**
   * Close every group with a footer row carrying its aggregates — the totals
   * read at the bottom of the group as well as the top, which is where a long
   * group's reader is by the time they need them.
   *
   * Needs `groupAggregates`: a footer with nothing to total is a blank row.
   * Nested groups each get their own, innermost first. The table's own
   * grand total is `summaryRow`, which already totals the whole set.
   */
  groupFooters?: boolean;
  /**
   * Order groups within their parent: `"label"`, `"label-desc"`, `"count"`,
   * `"count-desc"`, or your own comparator over `{ value, label, level,
   * groupBy, leafRows }`.
   *
   * To sort groups by an aggregate, compare the same rows the aggregate reads
   * — `(a, b) => total(b.leafRows) - total(a.leafRows)` sorts by total
   * descending. Without this, groups keep the order the source's own sort
   * produced.
   */
  groupSort?: GroupSort<TRow>;
  /**
   * Show at most this many top-level groups at a time, with a row offering the
   * rest. A table grouped by customer can have ten thousand groups, and
   * rendering all of them to fill one screen is the mistake virtualization
   * exists to avoid.
   */
  groupPageSize?: number;
  /**
   * Show at most this many rows inside each group, with a "load more in this
   * group" row beneath them.
   */
  groupRowPageSize?: number;
  /**
   * Called when a reader asks for more rows inside a group — the hook a server
   * tier needs, since the rest of that group is not in the browser yet. The
   * table reveals what it already holds either way.
   */
  onGroupLoadMore?: (groupKey: string) => void;
  /**
   * Keep only the groups this answers true for, at every level — the group
   * equivalent of a filter, working on aggregates rather than cells:
   * `(g) => total(g.leafRows) > 10_000`.
   *
   * A dropped group takes its leaves with it. Row filters still run first, so
   * this decides which of the SURVIVING rows' groups are worth showing.
   */
  groupFilter?: (group: GroupNode<TRow>) => boolean;
  /** Aggregates shown on each group header. */
  groupAggregates?: SummaryRowFn<TRow, TNode>;
  /**
   * Controlled collapsed group keys (ephemeral — not URL-synced).
   * Omit for the table's own (uncontrolled) state.
   */
  collapsedGroupIds?: readonly string[];
  /** Called with the collapsed groups after a toggle. */
  onCollapsedGroupIdsChange?: (ids: string[]) => void;
  /** Disable the built-in search box. */
  /**
   * Render the search input. Positive polarity — `false` hides it.
   * @defaultValue true
   */
  searchable?: boolean;

  /* ── Column management ───────────────────────────────────────────── */
  /** Controlled column layout (hidden/order/pinned/widths). */
  columnLayout?: ColumnLayoutState;
  /** Change handler for the controlled column layout. */
  onColumnLayoutChange?: (next: ColumnLayoutState) => void;
  /** Initial column layout for the uncontrolled mode. */
  defaultColumnLayout?: Partial<ColumnLayoutState>;
  /**
   * Persists a user-approved display-name change. A column must also set
   * `renameable: true`; its stable key and data contract never change.
   */
  onColumnRename?: (key: string, name: string) => void;
  /**
   * Fixed-height scroll box (px). Enables sideways scrolling + column pinning;
   * the header and pinned columns pin within this box. Omit for page scroll.
   */
  maxHeight?: number;

  /* ── Virtualization ──────────────────────────────────────────────── */
  /** Desktop row-size estimate in px. */
  estimateRowSize?: number;
  /** Mobile card-size estimate in px. */
  estimateCardSize?: number;
  /** Extra rows/cards rendered before and after the virtual window. */
  virtualOverscan?: number;
  /**
   * Override for window-mode virtualization's scroll offset.
   *
   * When omitted, the list's document offset is measured so a table below
   * page chrome does not open with a blank gap. Pass a value only when you
   * already know that offset (tests, or a table whose position is fixed).
   */
  virtualScrollMargin?: number;

  /* ── Filters ─────────────────────────────────────────────────────── */
  /**
   * Resolved filter definitions, used to label AND/OR tree chips. The
   * shell sets this from the declarative `filters()` definitions; a host that
   * assembles the chrome itself can pass the same defs the builder
   * receives.
   */
  filterDefs?: readonly FilterDef<TRow>[];
  /** Type registry those defs were built against. */
  filterRegistry?: FilterTypeRegistry;
  /**
   * How the filter container opens. One mode at a time — never stacked.
   * `"popover"` (default) anchors a light card under the Filters button
   * (no backdrop); `"drawer"` slides in a side panel with a real backdrop;
   * `"header"` is the compact per-column row and hides the toolbar button.
   */
  filtersMode?: "popover" | "drawer" | "header";
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
  /**
   * Close a header-filter popover after a finished single-control write
   * (a select/boolean value, or a valueless operator such as "Is empty").
   * Off by default — picking an operator on a field that still has a value
   * input must not dismiss the overlay. Outside click and Escape always close.
   */
  closeHeaderFilterOnSelect?: boolean;
  /**
   * Mount the per-field Filters form. Default on. Pass `false` to keep only
   * the AND/OR tree in that chrome — the field list is gone, not hidden.
   */
  filterFields?: boolean;

  /* ── Bulk actions ────────────────────────────────────────────────── */
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
  /** Inline toolbar slot for custom controls (view toggles, etc.). */
  toolbar?: TNode;
  /**
   * Named regions of the toolbar, for controls that have to sit somewhere
   * specific rather than in the middle.
   *
   * `toolbar` is the middle region and stays exactly what it was: content
   * between the search input and the built-in buttons. These two are the
   * ends, which is where an app's own view switcher or a "back" control
   * belongs — ahead of everything, or after it.
   *
   * ```tsx
   * <DataTable
   *   toolbarSlots={{ start: <BackButton />, end: <HelpLink /> }}
   *   …
   * />
   * ```
   */
  toolbarSlots?: TableToolbarSlots<TNode>;
  /** Called when the user picks a density. */
  onDensityChange?: (next: "comfortable" | "compact") => void;
  /** Confirmation handler for actions; defaults to `window.confirm`. */
  confirm?: ConfirmHandler;
  /** Number of skeleton rows while loading. Defaults to the page size. */
  skeletonRows?: number;
  /**
   * Top inset in px for the sticky header (`stickyHeader`) — e.g. the
   * height of an app bar it must clear. When the toolbar pins with the
   * header it parks at this inset too. Defaults to 0.
   */
  stickyTop?: number;
  /** Keep the desktop table header sticky while scrolling. Defaults to false (opt-in). */
  stickyHeader?: boolean;
  /**
   * Keep the toolbar (search, page size) sticky with the header.
   * Defaults to `stickyHeader` on page-scroll tables; pass `false` to
   * let the toolbar scroll away. Has no effect when the table already
   * scrolls in a box (`maxHeight`, or antd's native virtual scroller) —
   * the toolbar already sits outside that scroller.
   */
  stickyToolbar?: boolean;
  /** Scroll back to the table when search/filter/page changes. Defaults to true. */
  scrollToTopOnChange?: boolean;
  /** Extra gap below sticky chrome when scrolling back. Defaults to 8. */
  scrollTopGap?: number;
}

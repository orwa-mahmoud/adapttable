import type {
  BaseDataTableProps,
  Slot,
  TableErrorState,
  TableSource,
  UrlStateAdapter,
  UseSavedViewsOptions,
} from "@adapttable/core";
import type { DataModeProps } from "@adapttable/core/adapter";
import type { ReactNode } from "react";

/**
 * Per-part class-name hooks. Every node also carries a stable
 * `data-adapttable-part` attribute and `data-*` state attributes so you
 * can style with Tailwind, shadcn, or your own CSS.
 *
 * @public
 */
export interface DataTableClassNames {
  /** Class for the outermost wrapper. */
  root?: string;
  /** Class for the toolbar above the table. */
  toolbar?: string;
  /** The search input itself. */
  search?: string;
  /** The search field wrapper (holds the search input + leading icon). */
  searchField?: string;
  /** The leading magnifying-glass icon inside the search field. */
  searchIcon?: string;
  /** The toolbar's sort-by select. */
  sortSelect?: string;
  /** Rows-per-page `<select>` (toolbar in infinite mode, footer when paged). */
  rowsPerPage?: string;
  /** The Filters trigger. */
  filtersButton?: string;
  /** The leading funnel icon inside the Filters button. */
  filtersIcon?: string;
  /** The active-filter count badge on it. */
  filtersCount?: string;
  /**
   * A cell inside the selected range (`cellNavigation` + a range). There is no
   * kit colour to borrow here, so the fill is yours; `data-cell-selected` is on
   * the element too, for CSS that prefers attribute selectors.
   */
  cellSelected?: string;
  /** The footer row that closes a group (`groupFooters`). */
  groupFooterRow?: string;
  /** The spanning cell inside a group footer. */
  groupFooterCell?: string;
  /** The row offering more groups, or more rows inside one. */
  groupMoreRow?: string;
  /** The spanning cell inside that row. */
  groupMoreCell?: string;
  /**
   * A cell the find bar matched (`findInTable`). `data-cell-match` is on the
   * element too, for CSS that prefers attribute selectors.
   */
  cellMatch?: string;
  /** The one match the find walk is on — `data-cell-match-current`. */
  cellMatchCurrent?: string;
  /**
   * A validator's message under an open editor (`validate` / `validateRow`).
   * It is a live region, so a rejected commit is heard as well as seen.
   */
  editCellError?: string;
  /**
   * A failed save's message under the cell (`onCellEdit` returned a promise
   * that rejected). A live region, so it is heard as well as seen.
   */
  editCellSaveError?: string;
  /** The undo control beside it (`onEditRollback`). */
  editCellRollback?: string;
  /** The indented wrapper in a tree row's tree column (`getChildren`). */
  treeCell?: string;
  /** The chevron that folds a node. */
  treeToggle?: string;
  /** A leaf's placeholder, holding the chevron's width so names line up. */
  treeSpacer?: string;
  /** The Add-row toolbar button (when `onAddRow` is set). */
  addRow?: string;
  /** The density toggle (when `densityChooser` is set). */
  densityToggle?: string;
  /** The fullscreen toggle (when `fullscreen` is set). */
  fullscreenToggle?: string;
  /** The command palette's surface (when `commandPalette` is set). */
  commandPalette?: string;
  /** Its search box. */
  commandInput?: string;
  /** One command row. */
  commandItem?: string;
  /** The "nothing matched" line. */
  commandEmpty?: string;
  /** The right-click menu (when `contextMenu` is set). */
  contextMenu?: string;
  /** One entry in it. */
  contextMenuItem?: string;
  /** The divider between groups of entries. */
  contextMenuSeparator?: string;
  /** The docked settings panel (when `sidePanel` is set). */
  sidePanel?: string;
  /** One tab in the side panel's strip. */
  sidePanelTab?: string;
  /** The side panel's close control. */
  sidePanelClose?: string;
  /** The status bar under the table (when `statusBar` is set). */
  statusBar?: string;
  /** One figure inside the status bar. */
  statusItem?: string;
  /** The Undo toolbar button (when `undoRedoButtons` is set). */
  undoButton?: string;
  /** The Redo toolbar button (when `undoRedoButtons` is set). */
  redoButton?: string;
  /** The Print toolbar button (when `printButton` and `onPrint` are set). */
  printButton?: string;
  /** The Export CSV toolbar button (when `exportCsv` is set). */
  exportCsvButton?: string;
  /**
   * The spinner inside the Export button while a host-handled export runs.
   * There is no kit component to borrow here, so the element is yours to
   * style — the shadcn preset spins it.
   */
  exportSpinner?: string;
  /** The element the filters overlay is positioned against. */
  filtersAnchor?: string;
  /** The scrim behind the filters overlay. */
  filtersBackdrop?: string;
  /** The filters overlay in popover mode. */
  filtersPopover?: string;
  /** The filters panel body. */
  filtersPanel?: string;
  /** Its header strip. */
  filtersHeader?: string;
  /** The title in that header. */
  filtersTitle?: string;
  /** Its close control. */
  filtersClose?: string;
  /** The scrolling area holding the fields. */
  filtersBody?: string;
  /** The footer strip under them. */
  filtersFooter?: string;
  /** The clear-all action. */
  filtersClear?: string;
  /** The action that closes the panel; filters apply live. */
  filtersDone?: string;
  /** Wrapper around the auto form and the AND/OR builder. */
  filtersForm?: string;
  /** AND/OR filter-tree builder root. */
  filterTree?: string;
  /** One nested group in the filter-tree builder. */
  filterTreeGroup?: string;
  /** One condition row in the filter-tree builder. */
  filterTreeCondition?: string;
  /** Add-condition / add-group row in the filter-tree builder. */
  filterTreeActions?: string;
  /** Remove-condition / remove-group control in the filter-tree builder. */
  filterTreeRemove?: string;
  /** Disclosure label that parks the AND/OR builder behind Advanced. */
  filterTreeSummary?: string;
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
  /** The option list of an auto-built searchable `multiSelect` field. */
  filterCheckboxGroup?: string;
  /** One option (`<label>` + checkbox) in a searchable `multiSelect` field. */
  filterCheckbox?: string;
  /** The placeholder shown while a field's async options load. */
  filterOptionsLoading?: string;
  /** Excel-style checklist wrapper. */
  filterChecklist?: string;
  /** Search box inside a checklist. */
  filterChecklistSearch?: string;
  /** Select-all / clear row on a checklist. */
  filterChecklistActions?: string;
  /** Scrollable value list inside a checklist. */
  filterChecklistList?: string;
  /** Per-value count in a checklist. */
  filterChecklistCount?: string;
  /** The row of active-filter chips. */
  chips?: string;
  /** One chip in that row. */
  chip?: string;
  /** A chip's remove button. */
  chipRemove?: string;
  /** The column menu as a whole. */
  columnMenu?: string;
  /** The trigger on a column header. */
  columnMenuButton?: string;
  /** The menu's panel. */
  columnMenuPanel?: string;
  /** Its header strip. */
  columnMenuHeader?: string;
  /** The title in that header. */
  columnMenuTitle?: string;
  /** One column's row in the menu. */
  columnMenuItem?: string;
  /** The drag grip that reorders a column. */
  columnMenuGrip?: string;
  /** A row's column name. */
  columnMenuLabel?: string;
  /** A row's show/hide control. */
  columnMenuVisibility?: string;
  /** A row's pin control. */
  columnMenuPin?: string;
  /** The separator above the trailing row-actions entry in the menu. */
  columnMenuSeparator?: string;
  /** The reset-columns action. */
  columnMenuReset?: string;
  /** The column menu's "size columns to content" action. */
  columnMenuAutoSize?: string;
  /** Search box inside the column menu. */
  columnMenuSearch?: string;
  /** Bulk show/hide/unpin row. */
  columnMenuBulk?: string;
  /** One bulk action button. */
  columnMenuBulkButton?: string;
  /** Per-column submenu trigger. */
  columnMenuMore?: string;
  /** The open per-column submenu. */
  columnMenuSubmenu?: string;
  /** One action inside the per-column submenu. */
  columnMenuAction?: string;
  /** Host-provided controls after a header caption. */
  headerActions?: string;
  /** Free slot under the table, above the pager. */
  tableFooter?: string;
  /** The saved-views menu container (trigger + anchored panel). */
  viewsMenu?: string;
  /** The saved-views menu trigger button. */
  viewsButton?: string;
  /** The saved-views dropdown panel. */
  viewsPanel?: string;
  /** One saved view's row — its apply button beside its delete button. */
  viewsRow?: string;
  /** One saved view's apply button in the list. */
  viewsItem?: string;
  /** A saved view's delete button. */
  viewsDelete?: string;
  /** The save row — the name input beside the save button. */
  viewsSaveRow?: string;
  /** The view-name input in the save row. */
  viewsInput?: string;
  /** The save-view button in the save row. */
  viewsSave?: string;
  /** The separator between the views list and the save row. */
  viewsDivider?: string;
  /** The drag handle on a column edge. */
  resizeHandle?: string;
  /** The bar of actions for the selected rows. */
  bulkBar?: string;
  /** One action in that bar. */
  bulkButton?: string;
  /** The failure line shown in the bulk bar after a rejected bulk action. */
  bulkError?: string;
  /** The cross-page banner inside the bulk bar (full page selected). */
  selectAllBanner?: string;
  /** The banner's status text (page selected / all matching selected). */
  selectAllText?: string;
  /** The banner's action button (select all matching / clear all). */
  selectAllButton?: string;
  /** Class for the table element. */
  table?: string;
  /** The table head. */
  thead?: string;
  /** A header row. */
  headerRow?: string;
  /** A header cell. */
  headerCell?: string;
  /** The header checkbox that selects a column (`columnSelectionCheckbox`). */
  columnSelect?: string;
  /** Compact per-column filter row under the header. */
  filterHeaderRow?: string;
  /** Funnel icon that opens a per-column header filter overlay. */
  filterHeaderTrigger?: string;
  /** One cell in the header filter row. */
  filterHeaderCell?: string;
  /** The input inside a header filter cell. */
  filterHeaderInput?: string;
  /** Compact multi-select menu under a header filter cell. */
  filterHeaderMenu?: string;
  /** The grouped-header `<tr>` rendered above the column headers. */
  headerGroupRow?: string;
  /** One spanning `<th>` (or edge gap) inside the header-group row. */
  headerGroupCell?: string;
  /** Collapse/expand control inside a collapsible group header. */
  columnGroupToggle?: string;
  /** The sort control inside a header cell. */
  sortButton?: string;
  /** The 1-based multi-sort position badge inside a sorted header. */
  sortIndex?: string;
  /** The table body. */
  tbody?: string;
  /** A body row. */
  row?: string;
  /** A body cell. */
  cell?: string;
  /**
   * A spanned cell (`getCellSpan` / `column.colSpan`). `data-cell-span` is on
   * the element too (`"2x1"`). The default look is centered + one fill;
   * `cellSpanAppearance="plain"` skips that paint.
   */
  cellSpan?: string;
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
  /** The trailing row-actions header cell. */
  actionsHeader?: string;
  /** The per-row actions cell. */
  actionsCell?: string;
  /** One control inside it. */
  actionButton?: string;
  /** The 3-dot control that opens the row-actions menu. */
  rowActionsTrigger?: string;
  /** The row-actions menu surface (`rowActionsLayout="menu"`). */
  rowActionsMenu?: string;
  /** The leading row-reorder header cell. */
  reorderHeader?: string;
  /** The leading row-reorder body cell on each row. */
  reorderCell?: string;
  /** The desktop drag-handle button. */
  rowReorderHandle?: string;
  /** The mobile up/down control group. */
  rowReorderButtons?: string;
  /** Move this card one slot up. */
  rowReorderUp?: string;
  /** Move this card one slot down. */
  rowReorderDown?: string;
  /** The leading select-all header cell. */
  selectionHeader?: string;
  /** The row-selection cell. */
  selectionCell?: string;
  /** A selection checkbox input (header select-all, row, mobile card). */
  checkbox?: string;
  /** The load-more region under the rows. */
  loadMore?: string;
  /** Its button. */
  loadMoreButton?: string;
  /* ── Row grouping (groupBy) ──────────────────────────────────────── */
  /** A group-header `<tr>` in the grouped desktop body. */
  groupRow?: string;
  /** The single spanning cell inside a group-header row. */
  groupCell?: string;
  /** A group-header `<li>` in the grouped mobile card list. */
  groupCard?: string;
  /** The group collapse/expand toggle button. */
  groupToggle?: string;
  /** The group's tri-state selection checkbox. */
  groupSelect?: string;
  /** The group's label text. */
  groupLabel?: string;
  /** The group's row-count badge. */
  groupCount?: string;
  /** One aggregate value chip in the group header. */
  groupAggregate?: string;
  /* ── Cell editing ────────────────────────────────────────────────── */
  /** The invisible activate button wrapping an editable display cell. */
  editCellActivate?: string;
  /** The active inline cell editor (input or select). */
  editCellEditor?: string;
  /** The mobile card list. */
  cards?: string;
  /** Class for a mobile card. */
  card?: string;
  /** The trailing actions strip inside a mobile card. */
  cardActions?: string;
  /** One field row inside a card. */
  cardRow?: string;
  /** A field's label in a card. */
  cardLabel?: string;
  /** A field's value in a card. */
  cardValue?: string;
  /** The sideways/bounded scroll wrapper around the desktop table. */
  scrollBox?: string;
  /** A virtualization padding spacer (desktop row or mobile card list). */
  virtualSpacer?: string;
  /** A host-injected separator `<tr>`. */
  separatorRow?: string;
  /** The spanning cell inside a separator row. */
  separatorCell?: string;
  /** A host-injected full-width `<tr>`. */
  fullWidthRow?: string;
  /** The spanning cell inside a full-width row. */
  fullWidthCell?: string;
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
  /** The pager's previous-page arrow button. */
  pagePrev?: string;
  /** The pager's next-page arrow button. */
  pageNext?: string;
  /** One numbered page button (the current page carries `aria-current="page"`). */
  pageNumber?: string;
  /** The "…" gap standing in for elided page numbers. */
  pageEllipsis?: string;
  /** The empty state. */
  empty?: string;
  /** The clear-filters button inside the "no results" empty state. */
  emptyClear?: string;
  /** The loading state. */
  loading?: string;
  /* ── Loading skeleton ────────────────────────────────────────────── */
  /** The skeleton `<table>`. */
  loadingTable?: string;
  /** The skeleton header `<tr>`. */
  loadingHeaderRow?: string;
  /** One skeleton header `<th>`. */
  loadingHeaderCell?: string;
  /** One skeleton body `<tr>`. */
  loadingRow?: string;
  /** One skeleton body `<td>`. */
  loadingCell?: string;
  /** The shimmering placeholder line inside a skeleton cell. */
  loadingLine?: string;
  /** The skeleton mobile card list. */
  loadingCards?: string;
  /** One skeleton mobile card. */
  loadingCard?: string;
  /** The non-blocking background-refresh progress indicator. */
  refreshIndicator?: string;
  /** The error state. */
  error?: string;
  /** The retry control in the error state. */
  retryButton?: string;
}

/**
 * Overridable sub-components: the loading skeleton and the empty state.
 *
 * @public
 */
export interface DataTableSlots {
  /** Replace the empty-state. */
  empty?: ReactNode;
  /**
   * Replace the empty-state shown when a search or filter matched nothing.
   *
   * Falls back to `empty` when unset, so passing only `empty` keeps covering
   * both states. Set this when the filtered case needs its own message — the
   * built-in one carries a working "clear all filters" action that a custom
   * `empty` would otherwise replace in both situations.
   */
  noResults?: ReactNode;
  /** Replace the loading skeleton. */
  skeleton?: ReactNode;
  /**
   * Replace the load-failure state.
   *
   * Unlike the other slots this one also takes a function, because an error
   * state is about something: the function receives the error being reported
   * and the retry the source can actually perform, so a replacement can offer
   * both. Pass a plain node when the message is fixed.
   */
  error?: Slot<TableErrorState>;
}

/** Props for the unstyled `<DataTable>`. */
interface DataTablePropsBase<TRow> extends Omit<
  BaseDataTableProps<TRow>,
  "source"
> {
  /**
   * Full-control tier: a prebuilt source (`useFrontendData`,
   * `useQuerySource`, …), used as-is. Omit it and pass `data` instead for
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
  /** Forwarded error to display in the table's error state. */
  error?: Error | null;
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
  /** Replace sub-components (loading skeleton, empty state). */
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
 *
 * @public
 */
export type DataTableProps<TRow> = DataTablePropsBase<TRow> &
  DataModeProps<TRow>;

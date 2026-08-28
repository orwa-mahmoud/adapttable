/**
 * Public type surface for `@adapttable/core`.
 *
 * Everything here is framework- and UI-kit-agnostic. Adapters
 * (`@adapttable/mantine`, …) build their styled components on top of
 * these contracts; headless consumers import them directly.
 *
 * @packageDocumentation
 */

import type { ComponentType, ReactNode } from "react";

import type { CellEditor } from "./editing/cellEditing";
import type { FacetMap } from "./filters/facets";
import type { ColumnFilter } from "./filters/filterDefs";

/** Sort direction for a column. */
export type SortDirection = "asc" | "desc";

/** Text direction. Adapters apply it; logical CSS does the rest. */
export type Direction = "ltr" | "rtl";

/**
 * Colour scheme preference. `"auto"` follows the host /
 * `prefers-color-scheme`; adapters resolve it to their theming.
 */
export type ColorScheme = "light" | "dark" | "auto";

/** How the table paginates. `"auto"` resolves by viewport (mobile → infinite). */
export type PaginationMode = "infinite" | "paged" | "auto";

/** The resolved (non-auto) pagination mode a source actually runs in. */
export type ResolvedPaginationMode = "infinite" | "paged";

/** Comparable primitive returned by a sort-value extractor. */
export type SortableValue = string | number | boolean | null | undefined;

/**
 * When a leaf under a collapsible column group is visible.
 * `"open"` — expanded group only; `"closed"` — collapsed only; `"always"` — both.
 */
export type ColumnGroupShow = "open" | "closed" | "always";

/** A single extra-filter value as it round-trips through URL state. */
export type FilterValue = string | string[] | number | undefined;

/** The bag of extra (caller-defined) filter values keyed by filter name. */
export type ExtraFilters = Record<string, FilterValue>;

/** Props every {@link ColumnDef.Cell} component receives. */
export interface CellProps<TRow> {
  /** The row being rendered. */
  readonly row: TRow;
  /** Zero-based index of the row within the current materialised slice. */
  readonly rowIndex: number;
}

/**
 * Definition of a single column. `TRow` is the row item type.
 *
 * Provide either a {@link ColumnDef.Cell} component (stable identity →
 * memoisable sub-trees, preferred for statically-known columns) or the
 * lighter {@link ColumnDef.accessor} function.
 */
export interface ColumnDef<TRow> {
  /**
   * Unique within the table. Also the value sent to a backend as `sortBy`,
   * and — when no `accessor`/`Cell` is given — the row's data path for the
   * cell value (dot paths reach nested values: `"department.name"`).
   */
  key: string;
  /**
   * Header content. Pre-translated by the caller. Omit it and the header is
   * auto-derived from `key` (`"hiredAt"` → `"Hired At"`).
   */
  header?: ReactNode;
  /**
   * Replace the header caption. The surrounding cell still owns sort,
   * resize and the menu — this callback receives that controller so a
   * custom caption can stay wired.
   */
  renderHeader?: (ctx: ColumnHeaderContext<TRow>) => ReactNode;
  /**
   * Replace one summary-row cell. `value` is whatever `summaryRow`
   * produced for this key (or `undefined` when only this renderer is set).
   */
  renderFooter?: (ctx: ColumnFooterContext<TRow>) => ReactNode;
  /** Native tooltip on the header caption. */
  headerTooltip?: string;
  /**
   * How readily this column is given up when the table is too narrow for all
   * of them. Priority 1 is kept longest, in the ordinary sense of the word.
   *
   * A column that omits it is never dropped, so the columns carrying the
   * row's identity stay by saying nothing — and a table where nobody sets it
   * behaves exactly as it did before.
   */
  responsivePriority?: number;
  /** Host-provided controls after the caption, before the resize handle. */
  headerActions?: ReactNode;
  /**
   * Presentational header group: contiguous columns sharing a `group`
   * render under one spanning header cell. A string is one level; a
   * path (`["Finance", "Q1"]`) stacks rows. Reordering columns apart
   * splits the group (adjacency-based, never lies about layout).
   *
   * Prefer a {@link ColumnGroupDef} with `children` when the group has
   * collapse options (`collapsedKey`, `collapsedRender`) — `group` is
   * the shortcut for a spanning label only.
   */
  group?: string | readonly string[];
  /**
   * When this leaf sits under a collapsible group: shown only while the
   * group is expanded (`open`), only while collapsed (`closed`), or in
   * both states (`always`). Omit and the group decides — `collapsedKey`,
   * `collapsedRender`, or an arrow stub when neither is set.
   */
  groupShow?: ColumnGroupShow;
  /**
   * Per-locale data paths for this column's VALUE. The active table
   * `locale` picks the path (exact tag first, then its primary subtag, then
   * `key`): `{ key: "nameEn", i18n: { ar: "nameAr" } }` for flat fields, or
   * `{ key: "name.en", i18n: { ar: "name.ar" } }` for nested objects. The
   * cell, client-side sort and the column's declarative filter all follow
   * the resolved path. Header TEXT stays whatever you pass in `header`.
   */
  i18n?: Readonly<Record<string, string>>;
  /**
   * Declarative filter for this column: a bare type (`"dateRange"`) or a
   * definition without `key`/`label` (inherited from the column). Merged
   * with the table-level `filters` array; a `filters` entry with the same
   * key wins.
   */
  filter?: ColumnFilter<TRow>;
  /**
   * Opt this column into inline cell editing. `true` for every row, or a
   * predicate for per-row control. Editing stays fully dormant unless the
   * table also receives `onCellEdit` — omit both and nothing changes.
   */
  editable?: boolean | ((row: TRow) => boolean);
  /**
   * Editor widget when {@link ColumnDef.editable} is set. Defaults to
   * `"text"`. A registered plugin name (`host.registerEditor`) is a string
   * that is not a built-in. Select options may be `{ value, label }` or
   * plain strings.
   */
  editor?: CellEditor;
  /**
   * Override the draft seed for the editor (raw value). Defaults to
   * `sortValue` then the column key path — use this when the displayed
   * cell is formatted but editing needs the underlying value.
   */
  editValue?: (row: TRow) => string;
  /**
   * Turn the edited text back into the value to commit.
   *
   * A column can show one thing, seed the editor with another, and commit a
   * third: `accessor` renders `"$1,240.00"`, {@link ColumnDef.editValue} seeds
   * the editor with `"1240"`, and this parses what the user typed back into a
   * number. Without it, a `number` editor commits `number | null` and every
   * other editor commits the raw string.
   *
   * Receives the draft exactly as typed, plus the row being edited. Return
   * whatever `onCellEdit` should receive — a number, a `Date`, a parsed unit.
   */
  parseValue?: (draft: string, row: TRow) => unknown;
  /**
   * Gate a commit on this column's own rule. Receives the value
   * {@link ColumnDef.parseValue} produced, plus the row being edited; return a
   * message to reject it, nothing to allow it.
   *
   * May be async — "is this SKU real" is a request — and the editor stays open
   * and marked busy while it runs. A rejected value keeps the editor open with
   * the message on it, so the reader fixes what they typed rather than losing it.
   * Validation gates `onCellEdit` and nothing else: the host still owns saving.
   */
  validate?: (
    value: unknown,
    row: TRow
  ) => string | undefined | Promise<string | undefined>;
  /**
   * Component rendered per row. Define at module level (or memoise) so
   * its identity is stable across renders.
   */
  Cell?: ComponentType<CellProps<TRow>>;
  /** Lightweight alternative to {@link ColumnDef.Cell}; returns cell content. */
  accessor?: (row: TRow) => ReactNode;
  /**
   * Primitive extractor used by the client-side sort comparator
   * (`useFrontendData`). Unused for server-sorted data.
   */
  sortValue?: (row: TRow) => SortableValue;
  /**
   * The value this column contributes to an export, when the file should not
   * carry what the screen shows.
   *
   * A cell formatted for reading — `"$1,240.00"`, `"3 days ago"`, a status
   * badge — is worse than useless in a spreadsheet, because it cannot be
   * summed or sorted. Return the underlying value here and the export writes
   * it while the table keeps rendering the friendly version.
   *
   * Without it an export falls back to the display value, so this is only
   * needed where the two genuinely differ.
   */
  exportValue?: (row: TRow) => unknown;
  /**
   * The cell as plain text, for every context that cannot render JSX.
   *
   * {@link ColumnDef.accessor} returns a `ReactNode`, so a screen-reader
   * announcement, an `aria-label`, a tooltip or the clipboard have nothing to
   * read: a badge or an avatar is a React element, not a word. Return the text
   * those places should use.
   *
   * Resolution order when this is absent — text is always available, this only
   * makes it accurate: {@link ColumnDef.formatValue}, then
   * {@link ColumnDef.exportValue}, then `accessor` when it happens to yield a
   * primitive, then the key's data path. So only columns whose rendered cell is
   * not already its own text need one.
   */
  formatValue?: (row: TRow) => string;
  /** Enable sorting for this column. Off by default. */
  sortable?: boolean;
  /** Column width passed through to the rendered header/cell. */
  width?: number | string;
  /**
   * Floor for this column's width, in pixels. A resize will not go below it,
   * and neither will the container-fitting mode — a column of dates has a
   * width below which it is simply unreadable.
   */
  minWidth?: number;
  /** Ceiling for this column's width, in pixels. */
  maxWidth?: number;
  /**
   * This column's share of the leftover width when the table fits its
   * container: `flex: 2` takes twice the space of `flex: 1`. Columns without
   * it keep their own width and are not stretched.
   */
  flex?: number;
  /** Text alignment within the cell. Defaults to `"start"`. */
  align?: "start" | "center" | "end";
  /**
   * How many columns this cell covers, or a per-row callback. Covered
   * neighbours are omitted from the row's cell list. Clipped at a pin
   * boundary and at the column window. Default 1.
   */
  colSpan?: number | ((row: TRow) => number);
  /**
   * How many rows this cell covers, or a per-row callback. Covered cells
   * in later rows are omitted. Stays inside one tbody (pin sections do
   * not share a span). Default 1.
   */
  rowSpan?: number | ((row: TRow) => number);
  /** Label used on mobile card layouts; falls back to `header` when a string. */
  mobileLabel?: string;
  /**
   * Hide this column entirely on mobile layouts. Explicit and absolute:
   * it always wins, including over the `mobileIdentityColumns` default.
   */
  hideOnMobile?: boolean;
  /** Hide this column entirely on desktop layouts. */
  hideOnDesktop?: boolean;
  /** Gray out the menu's reorder grip — the column stays where it is. */
  lockPosition?: boolean;
  /** Gray out the menu's show/hide control. */
  lockVisibility?: boolean;
  /** Gray out resize and per-column auto-size. */
  lockWidth?: boolean;
  /** Gray out the menu's pin control. */
  lockPin?: boolean;
  /** Arbitrary metadata adapters may read (e.g. a custom renderer flag). */
  meta?: Record<string, unknown>;
}

/** Sort/resize state a custom header caption can read. */
export interface ColumnHeaderController {
  /** Default caption (`header`, else the humanized key). */
  label: ReactNode;
  sortDir?: "asc" | "desc";
  sortIndex?: number;
  /** Cycle this column's sort. No-op when the column is not sortable. */
  toggleSort: (event?: { shiftKey?: boolean }) => void;
}

/** Arguments for {@link ColumnDef.renderHeader}. */
export interface ColumnHeaderContext<TRow> {
  column: ColumnDef<TRow>;
  controller: ColumnHeaderController;
}

/** Arguments for {@link ColumnDef.renderFooter}. */
export interface ColumnFooterContext<TRow> {
  column: ColumnDef<TRow>;
  value: ReactNode;
}

/** Confirmation wiring shared by row and bulk actions. */
export interface ActionConfirm<TArg> {
  /** Dialog title (pre-translated). */
  title: string;
  /** Builds the dialog message from the action argument. */
  message: (arg: TArg) => string;
  /** Confirm button label (pre-translated). */
  confirmLabel: string;
  /** Marks the action destructive (adapters style it accordingly). */
  danger?: boolean;
}

/** A per-row action — trailing buttons on desktop, card buttons on mobile. */
export interface RowAction<TRow> {
  /** Identifier — not shown to the user. */
  key: string;
  /** Pre-translated label; the accessible name, and the tooltip when icon-only. */
  label: string;
  /**
   * When set, adapters render an icon-only button. Omit it for a text button.
   * Built-in duplicate / delete / pin keys get each kit's own glyph when this
   * is omitted.
   */
  icon?: ReactNode;
  /** Click handler; fires after confirmation when `confirm` is set. */
  onClick: (row: TRow) => void;
  /** Adapter-defined colour token (e.g. `"red"` for destructive). */
  color?: string;
  /** Disable conditionally — e.g. delete when the row is referenced. */
  isDisabled?: (row: TRow) => boolean;
  /**
   * Disable conditionally and explain why. A non-empty string disables the
   * action and adapters surface it as tooltip/title copy where possible.
   */
  disabledReason?: (row: TRow) => string | undefined;
  /** Hide entirely when the action is structurally inapplicable. */
  isHidden?: (row: TRow) => boolean;
  /** Optional confirmation dialog wiring. */
  confirm?: ActionConfirm<TRow>;
}

/** A bulk action invoked from the selection toolbar with the selected ids. */
export interface BulkAction {
  /** Identifier — not shown to the user. */
  key: string;
  /** Pre-translated button label. */
  label: string;
  /** Optional leading icon. */
  icon?: ReactNode;
  /** Adapter-defined colour token. */
  color?: string;
  /**
   * Single disabled-state probe. A non-empty return greys the button out
   * and is shown as its tooltip; `undefined` leaves it enabled. One probe
   * (instead of `isDisabled` + `reason`) enforces that every disabled
   * bulk button explains itself.
   */
  disabledReason?: (ids: string[]) => string | undefined;
  /**
   * Action handler; receives the selected page ids plus a context: with
   * `allMatching` true the user chose "select all N matching" — act on the
   * whole filtered set server-side (`total` is its size), not just `ids`.
   */
  onClick: (
    ids: string[],
    context: BulkActionContext
  ) => void | Promise<unknown>;
  /** Optional confirmation dialog wiring (receives the selection count). */
  confirm?: ActionConfirm<number>;
}

/** Scope context handed to a bulk action. */
export interface BulkActionContext {
  /** True when the user chose "select all matching" across every page. */
  allMatching: boolean;
  /** Total rows in the current filtered set (= ids.length unless allMatching). */
  total: number;
}

/** Option entry for a sort-by select control. */
export interface SortByOption {
  value: string;
  label: string;
}

/** Baseline query params a backend list endpoint receives. */
export interface TableQueryParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortDir?: SortDirection;
  /** Single-level row grouping column key (URL-synced; frontend chrome only). */
  groupBy?: string;
  /**
   * The active filter values, namespaced so a user filter named like a
   * state param (`sortBy`, `search`, …) can never collide with one.
   */
  filters?: ExtraFilters;
  /**
   * The opaque token that opens this page, present only in cursor mode — a
   * source that never declares `supports: { cursor: true }` never receives it,
   * and page 1 never carries one.
   */
  cursor?: string;
}

/** Standard paginated response envelope. */
export interface PaginatedResponse<TRow> {
  /** The page of rows. */
  rows?: TRow[];
  total: number;
  page: number;
  limit: number;
  /** Whether a page exists after this one. */
  hasNextPage?: boolean;
  /**
   * Distinct-value counts for `query.facets`. Present when the source
   * declared `supports.facets` and the endpoint answered those keys.
   */
  facets?: FacetMap;
}

/**
 * Strings the table renders. Pass pre-translated values (or wire them to
 * your i18n stack). Every key is optional; sensible English defaults fill
 * the gaps — see {@link defaultLabels}.
 */
export interface TableLabels {
  /** Accessible label for an unlabeled table. */
  table?: string;
  search?: string;
  searchPlaceholder?: string;
  noData?: string;
  /** Empty state when an active search/filter matched nothing. */
  noResults?: string;
  /** Expand-row chevron label (suffixed with the row identity). */
  expandRow?: string;
  /** Collapse-row chevron label. */
  collapseRow?: string;
  /** Range-widget operator select placeholder. */
  operator?: string;
  /** Range-widget single-value placeholder. */
  value?: string;
  /** Range-widget lower-bound placeholder. */
  from?: string;
  /** Range-widget upper-bound placeholder. */
  to?: string;
  /** Number operator: exactly equal. */
  opEqual?: string;
  /** Number operator: greater than or equal. */
  opAtLeast?: string;
  /** Number operator: less than or equal. */
  opAtMost?: string;
  /** Operator: inclusive range. */
  opBetween?: string;
  /** Date operator: exactly on the day. */
  opOn?: string;
  /** Date operator: on or after the day. */
  opOnOrAfter?: string;
  /** Date operator: on or before the day. */
  opOnOrBefore?: string;
  /** Comparison: not equal. */
  opNotEqual?: string;
  /** Number operator: strictly greater than. */
  opGreater?: string;
  /** Number operator: strictly less than. */
  opLess?: string;
  /** Text operator: contains the term. */
  opContains?: string;
  /** Text operator: does not contain the term. */
  opNotContains?: string;
  /** Text operator: starts with the term. */
  opStartsWith?: string;
  /** Text operator: ends with the term. */
  opEndsWith?: string;
  /** Operator: the value is empty. */
  opEmpty?: string;
  /** Operator: the value is not empty. */
  opNotEmpty?: string;
  /** Number operator: is any of a list. */
  opIn?: string;
  /** Number operator: is none of a list. */
  opNotIn?: string;
  /** Date operator: strictly before the day. */
  opBefore?: string;
  /** Date operator: strictly after the day. */
  opAfter?: string;
  /** Date operator: a relative window (today, last N days, …). */
  opRelative?: string;
  /** Relative date: today. */
  relToday?: string;
  /** Relative date: yesterday. */
  relYesterday?: string;
  /** Relative date: tomorrow. */
  relTomorrow?: string;
  /** Relative date: this ISO week. */
  relThisWeek?: string;
  /** Relative date: this calendar month. */
  relThisMonth?: string;
  /** Relative date: previous calendar month. */
  relPreviousMonth?: string;
  /** Relative date: last N days. */
  relLastN?: string;
  /** Relative date: next N days. */
  relNextN?: string;
  /** Boolean filter: don't care (the default). */
  boolAny?: string;
  /** Boolean filter: require true. */
  boolTrue?: string;
  /** Boolean filter: require false. */
  boolFalse?: string;
  /** Saved-views menu trigger / list title. */
  savedViews?: string;
  /** Save-current-view action. */
  saveView?: string;
  /** Placeholder/label for the view-name input. */
  viewName?: string;
  /** Delete-a-view action (suffixed with the view name). */
  deleteView?: string;
  /** Rename a saved view. */
  renameView?: string;
  /** Apply a saved view to the table. */
  applyView?: string;
  /** Move a saved view one step earlier in the list. */
  moveViewUp?: string;
  /** Move a saved view one step later in the list. */
  moveViewDown?: string;
  /** Make a saved view the one the table opens with. */
  setDefaultView?: string;
  /** Marks the view the table opens with. */
  defaultViewBadge?: string;
  /** Marks a shared view this reader cannot change. */
  readOnlyViewBadge?: string;
  /** Banner: every row on this page is selected. */
  pageSelected?: (count: number) => string;
  /** Banner action: extend the selection to every matching row. */
  selectAllMatching?: (total: number) => string;
  /** Banner: the whole matching set is selected. */
  allMatchingSelected?: (total: number) => string;
  loading?: string;
  loadMore?: string;
  filters?: string;
  clearAll?: string;
  /** Accessible name for a single filter chip's remove button. */
  removeFilter?: (label: string) => string;
  /**
   * Label for the filter panel's closing action. Filters apply LIVE — the
   * button only closes the panel, so the key matches its "Done" wording
   * (and the `filters-done` part name).
   */
  filtersDone?: string;
  /** Heading for the AND/OR filter-tree builder. */
  filterTree?: string;
  /** Add a leaf condition to the filter tree. */
  filterAddCondition?: string;
  /** Add a nested AND/OR group to the filter tree. */
  filterAddGroup?: string;
  /** Combinator: every child must match. */
  filterCombinatorAnd?: string;
  /** Combinator: any child may match. */
  filterCombinatorOr?: string;
  /** Remove one tree condition. */
  filterRemoveCondition?: string;
  /** Remove a nested tree group. */
  filterRemoveGroup?: string;
  /** Field picker in the filter-tree builder. */
  filterField?: string;
  /** Search box inside an Excel-style checklist filter. */
  checklistSearch?: string;
  /** Clear the checklist selection. */
  checklistClear?: string;
  /** Empty state when the checklist search matches nothing. */
  checklistNoValues?: string;
  /** Accessible name of the compact header filter row. */
  headerFilters?: string;
  sortBy?: string;
  rowsPerPage?: string;
  actions?: string;
  selectAll?: string;
  selectRow?: string;
  /**
   * Accessible name for the header checkbox that selects a column
   * (`columnSelectionCheckbox`). The column's own name is appended.
   */
  selectColumn?: string;
  cancel?: string;
  retry?: string;
  errorTitle?: string;
  errorMessage?: string;
  /** Accessible label for the previous-page control. */
  previousPage?: string;
  /** Accessible label for the next-page control. */
  nextPage?: string;
  /** Builds the accessible "go to page N" label for numbered pagers. */
  goToPage?: (page: number) => string;
  /** Builds the "selected N" label. */
  selectedCount?: (count: number) => string;
  /** Builds the "showing X–Y of Z" label. */
  showing?: (range: { from: number; to: number; total: number }) => string;
  /** Builds the "page X of Y" label. */
  pageOf?: (range: { page: number; total: number }) => string;
  /** Label for the column-management menu trigger. */
  columns?: string;
  /** Pin-column menu actions. */
  pinStart?: string;
  pinEnd?: string;
  unpin?: string;
  /** Reorder-column menu actions. */
  moveStart?: string;
  moveEnd?: string;
  /** Reset the column layout to defaults. */
  resetColumns?: string;
  /** The column menu's "size every column to its content" action. */
  autoSizeColumns?: string;
  /** Accessible hint on a resize handle: double-click sizes to content. */
  autoSizeColumn?: string;
  /** Accessible label for a column-resize handle. */
  resizeColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (show). */
  showColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (hide). */
  hideColumn?: string;
  /** Search box inside the column menu. */
  searchColumns?: string;
  /** Show every unlocked hidden column. */
  showAllColumns?: string;
  /** Hide every unlocked visible column. */
  hideAllColumns?: string;
  /** Unpin every unlocked column. */
  unpinAllColumns?: string;
  /** Restore one column's visibility, pin and width. */
  resetColumn?: string;
  /** Sort this column ascending from the column-menu submenu. */
  sortAscending?: string;
  /** Sort this column descending from the column-menu submenu. */
  sortDescending?: string;
  /**
   * Announced politely once a sort settles, so a screen-reader user learns the
   * order changed — the rows are re-read from the top with no visible cue and
   * no change in row count. Names the column and the direction in one phrase,
   * because a live region reads its whole message at once.
   */
  sortedBy?: (info: { column: string; ascending: boolean }) => string;
  /** Announced politely when the last sort is removed. */
  sortingCleared?: string;
  /** Open the table filters from a column-menu submenu. */
  filterColumn?: string;
  /** Accessible name of the per-column submenu trigger. */
  columnActions?: string;
  /** Toolbar CSV export button. */
  exportCsv?: string;
  /**
   * Toolbar export button for any other format: given the extension a writer
   * produces (`"xlsx"`, or whatever a custom one names itself), return the
   * button's caption. Defaults to `"Export XLSX"` and its translations.
   *
   * CSV keeps {@link TableLabels.exportCsv}, so its existing translations stand
   * and a host that overrode that string keeps their own wording.
   */
  exportFile?: (format: string) => string;
  /**
   * Announced when an export finishes. A download gives a screen-reader user
   * no feedback of its own, so without this the button simply goes quiet.
   */
  exportDone?: string;
  /** Announced when an export fails, so a silent failure is never silent. */
  exportFailed?: string;
  /** Accessible name for starting inline cell edit (double-click / activate). */
  editCell?: string;
  /**
   * The control a failed save offers beside its message: put the value back the
   * way it was. Only rendered when the table was told how (`onEditRollback`).
   */
  undoEdit?: string;
  /** Accessible name for opening a whole row for editing (`rowEditing`). */
  /** The toolbar control that puts the last edit back (`undoRedoButtons`). */
  redoEdit?: string;
  /** Accessible name for the side panel's tab strip (`sidePanel`). */
  sidePanel?: string;
  /** Accessible name for a context menu (`contextMenu`). */
  contextMenu?: string;
  /** Accessible name for the command palette dialog. */
  commandPalette?: string;
  /** Placeholder and label for the palette's search box. */
  commandSearch?: string;
  /** Shown when a query matches no command. */
  commandEmpty?: string;
  /**
   * The palette command that opens the print dialog, and the caption on the
   * toolbar button when `printButton` asks for one.
   */
  print?: string;
  /** Accessible name for the density chooser. */
  density?: string;
  /** The roomy layout's caption. */
  densityComfortable?: string;
  /** The tight layout's caption. */
  densityCompact?: string;
  /** The fullscreen button, before it is on. */
  enterFullscreen?: string;
  /** The same button, after. */
  exitFullscreen?: string;
  /** The context-menu entry that copies the selection. */
  copyCells?: string;
  /** The context-menu entry that cuts it. */
  cutCells?: string;
  /** The control that closes the side panel. */
  closePanel?: string;
  /** The pivot panel's row-axis zone. */
  pivotRows?: string;
  /** The pivot panel's column-axis zone. */
  pivotColumns?: string;
  /** The pivot panel's measures zone. */
  pivotMeasures?: string;
  /** The control that adds a field to a pivot zone. */
  pivotAdd?: string;
  /** Take a field off a pivot zone. */
  pivotRemove?: string;
  /** Move a pivot field one step towards the outside. */
  pivotMoveUp?: string;
  /** Move a pivot field one step towards the inside. */
  pivotMoveDown?: string;
  /** The aggregation chooser on a pivot measure. */
  pivotAggregation?: string;
  /** Header over a pivot's grand-total column — "Total". */
  pivotTotal?: string;
  /** Caption on a pivot's grand-total line — "Grand total". */
  pivotGrandTotal?: string;
  /** Accessible name for entering row edit mode. */
  editRow?: string;
  /** Accessible name for committing a row edit. */
  saveRow?: string;
  /** How many rows a batch is holding — "3 unsaved rows". */
  pendingRows?: (count: number) => string;
  /** The control that commits a whole batch. */
  saveAll?: string;
  /** The control that discards one. */
  cancelAll?: string;
  /** The toolbar control that adds a row (`onAddRow`). */
  addRow?: string;
  /** The row action that copies a row (`onDuplicateRow`). */
  duplicateRow?: string;
  /** The row action that removes one (`onDeleteRow`). */
  deleteRow?: string;
  /** The question the delete dialog asks before it runs. */
  deleteRowConfirm?: string;
  /**
   * Accessible name of the 3-dot control that opens the row-actions menu
   * (`rowActionsLayout="menu"`).
   */
  rowActionsMenu?: string;
  /**
   * The message on an editor whose row changed under it. Keep mine / Take
   * theirs sit beside it, and {@link TableLabels.theirsValue} names the
   * incoming value so the reader can see what they would take.
   */
  editConflict?: string;
  /** Keep the draft; accept the incoming row as the new snapshot. */
  keepMine?: string;
  /** Replace the draft with the incoming value. */
  takeTheirs?: string;
  /** The incoming value on the conflict notice (`Theirs: ada@…`). */
  theirsValue?: (value: string) => string;
  /** Accessible name of the row-reorder grip, and the Columns-menu row. */
  reorderRow?: string;
  /** Mobile: move this card one slot earlier. */
  moveRowUp?: string;
  /** Mobile: move this card one slot later. */
  moveRowDown?: string;
  /** Live region: the reader lifted the row at this 1-based position. */
  rowLifted?: (position: number) => string;
  /** Live region: the row moved from one 1-based position to another. */
  rowMoved?: (from: number, to: number) => string;
  /** Live region: Escape cancelled a lift. */
  rowReorderCancelled?: string;
  /** Pin this row above the scroll window. */
  pinToTop?: string;
  /** Pin this row below the scroll window. */
  pinToBottom?: string;
  /** Release a pinned row back into the scroll window. */
  unpinRow?: string;
  /** Accessible name of a decorative separator row. */
  rowSeparator?: string;
  /** Expand a collapsed column group back to its leaves. */
  expandColumnGroup?: string;
  /** Collapse a column group (stub, kept child, or collapsedRender). */
  collapseColumnGroup?: string;
  /**
   * The selected rectangle, for the grid's live region: given its 1-based edges
   * and how many cells it covers, return what a screen reader should hear when
   * the selection changes. Defaults to
   * `"selected rows 3 to 7, columns 2 to 4, 15 cells"`.
   */
  gridRangeSelection?: (range: {
    fromRow: number;
    toRow: number;
    fromColumn: number;
    toColumn: number;
    cells: number;
  }) => string;
  /** Announced after a copy: given the cell count, what was taken. */
  gridRangeCopied?: (cells: number) => string;
  /** Announced when the clipboard refused the copy — never a silent failure. */
  gridRangeCopyFailed?: string;
  /** Announced after a paste: given the cell count, what was written. */
  gridRangePasted?: (cells: number) => string;
  /** Announced when the browser refused to hand over the clipboard. */
  gridRangePasteFailed?: string;
  /** Announced after a fill: given the cell count, what was written. */
  gridRangeFilled?: (cells: number) => string;
  /** Accessible name of the fill handle on the selection's corner. */
  gridFillHandle?: string;
  /** Leads the selected-cell count in the statistics strip. */
  selectionCount?: string;
  /** Leads the sum of the selected numbers. */
  selectionSum?: string;
  /** Leads the average of the selected numbers. */
  selectionAverage?: string;
  /** Leads the smallest selected number. */
  selectionMin?: string;
  /** Leads the largest selected number. */
  selectionMax?: string;
  /** Announced after an undo: given the cell count, what came back. */
  editUndone?: (cells: number) => string;
  /** Announced after a redo: given the cell count, what was rewritten. */
  editRedone?: (cells: number) => string;
  /** Announced when the key was pressed and the history was empty. */
  editNothingToUndo?: string;
  /** Accessible name of the find input, and the find bar's own name. */
  findInTable?: string;
  /** Placeholder inside the find input. */
  findPlaceholder?: string;
  /** Given the current hit and the total, the count the bar shows. */
  findMatchCount?: (current: number, total: number) => string;
  /** Accessible name of the previous-match button. */
  findPrevious?: string;
  /** Accessible name of the next-match button. */
  findNext?: string;
  /** Accessible name of the close button. */
  findClose?: string;
  /**
   * Where keyboard focus is, for the grid's live region: given the 1-based row
   * and the dataset total, return the phrase a screen reader should append
   * after the column and the cell's text. Defaults to `"row 41 of 10000"`.
   *
   * Takes the total, not the rendered count, because virtualization renders 24
   * rows of 100,000 and "row 3 of 24" would be a lie.
   */
  gridCellPosition?: (row: number, total: number) => string;
  /** Given how many are left, the row offering more groups. */
  moreGroups?: (remaining: number) => string;
  /** Given how many are left, the row offering more rows inside a group. */
  moreRowsInGroup?: (remaining: number) => string;
  /** Given a group's label, the caption on its footer row — "Core total". */
  groupTotal?: (label: string) => string;
  /** Expand-group chevron accessible name. */
  expandGroup?: string;
  /** Collapse-group chevron accessible name. */
  collapseGroup?: string;
  /** Leaf-count suffix on a group header, e.g. `(12)`. */
  groupCount?: (count: number) => string;
  /**
   * Status copy when `virtualize` is on a paged table, which stays one page.
   */
  noticeVirtualizePaged?: string;
  /** Status copy when row pin is on while grouping or a tree is on. */
  noticePinNested?: string;
  /** Status copy when row reorder is on while grouping or a tree is on. */
  noticeReorderNested?: string;
  /**
   * Status copy when `groupBy` is set but the source cannot regroup
   * (no `allFilteredRows`, no server groups).
   */
  noticeGroupingUnavailable?: string;
  /**
   * Status copy when `exportCsv.scope` is `"all"` and only the current
   * page can be written.
   */
  noticeExportAllPage?: string;
  /**
   * Status copy when editing is opted in without the matching write
   * callback (`onCellEdit` / `onRowEdit` / `onBatchEdit`).
   */
  noticeEditWithoutWriter?: string;
  /**
   * Export button caption when `"all"` can only write the current page.
   * Defaults to `"Export this page"`.
   */
  exportThisPage?: string;
}

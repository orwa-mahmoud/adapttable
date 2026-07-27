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
   * Presentational header group: contiguous columns sharing a `group`
   * render under one spanning header cell. Reordering columns apart
   * splits the group (adjacency-based, never lies about layout).
   */
  group?: string;
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
   * `"text"`. Select options may be `{ value, label }` or plain strings.
   */
  editor?: CellEditor;
  /**
   * Override the draft seed for the editor (raw value). Defaults to
   * `sortValue` then the column key path — use this when the displayed
   * cell is formatted but editing needs the underlying value.
   */
  editValue?: (row: TRow) => string;
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
  /** Enable sorting for this column. Off by default. */
  sortable?: boolean;
  /** Column width passed through to the rendered header/cell. */
  width?: number | string;
  /** Text alignment within the cell. Defaults to `"start"`. */
  align?: "start" | "center" | "end";
  /** Label used on mobile card layouts; falls back to `header` when a string. */
  mobileLabel?: string;
  /**
   * Hide this column entirely on mobile layouts. Explicit and absolute:
   * it always wins, including over the `mobileIdentityColumns` default.
   */
  hideOnMobile?: boolean;
  /** Hide this column entirely on desktop layouts. */
  hideOnDesktop?: boolean;
  /** Arbitrary metadata adapters may read (e.g. a custom renderer flag). */
  meta?: Record<string, unknown>;
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

/** A per-row action — trailing icon buttons on desktop, card buttons on mobile. */
export interface RowAction<TRow> {
  /** Identifier — not shown to the user. */
  key: string;
  /** Pre-translated label; also used as the accessible name. */
  label: string;
  /** Optional leading icon. */
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
  /** Saved-views menu trigger / list title. */
  savedViews?: string;
  /** Save-current-view action. */
  saveView?: string;
  /** Placeholder/label for the view-name input. */
  viewName?: string;
  /** Delete-a-view action (suffixed with the view name). */
  deleteView?: string;
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
  sortBy?: string;
  rowsPerPage?: string;
  actions?: string;
  selectAll?: string;
  selectRow?: string;
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
  /** Accessible label for a column-resize handle. */
  resizeColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (show). */
  showColumn?: string;
  /** Accessible label prefix for the column-menu visibility toggle (hide). */
  hideColumn?: string;
  /** Toolbar CSV export button. */
  exportCsv?: string;
  /** Accessible name for starting inline cell edit (double-click / activate). */
  editCell?: string;
  /** Expand-group chevron accessible name. */
  expandGroup?: string;
  /** Collapse-group chevron accessible name. */
  collapseGroup?: string;
  /** Leaf-count suffix on a group header, e.g. `(12)`. */
  groupCount?: (count: number) => string;
}

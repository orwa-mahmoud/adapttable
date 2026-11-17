/**
 * The names of the URL parameters a table's state is written under, before
 * the table's namespace. Every reader and writer of a table link names a
 * parameter from here.
 */

/** The 1-based page. */
export const PARAM_PAGE = "page";
export const PARAM_LIMIT = "limit";
export const PARAM_SEARCH = "q";
/** Find-bar query — the in-table walk, not the filter search term. */
export const PARAM_FIND = "find";
export const PARAM_SORT_BY = "sortBy";
export const PARAM_SORT_DIR = "sortDir";
/** Multi-sort chain: `sort=name:asc,age:desc` (keys percent-encoded). */
export const PARAM_SORT = "sort";
/** Row grouping keys, comma-separated — outermost first. */
export const PARAM_GROUP_BY = "groupBy";
/** Per-column group aggregate overrides. */
export const PARAM_GROUP_AGGREGATES = "groupAgg";
/** Keys under this prefix flow through as-is into the `extra` bag. */
export const FILTER_PREFIX = "f_";
/** Versioned AND/OR filter tree (`ft=1.{…}`). */
export const PARAM_FILTER_TREE = "ft";
/** Column-layout params (hidden / pinned / order / widths). */
/** Collapsed group keys, comma-separated. */
export const PARAM_GROUP_CLOSED = "groupClosed";
export const PARAM_COL_HIDDEN = "colHide";
export const PARAM_COL_PINNED = "colPin";
export const PARAM_COL_ORDER = "colOrder";
export const PARAM_COL_WIDTHS = "colW";
export const PARAM_COL_NAMES = "colName";
export const PARAM_COL_GROUPS = "colGroupCollapse";
/** Pinned rows: `rowPin=id1:top,id2:bottom`. */
export const PARAM_ROW_PIN = "rowPin";

/** Row density — a display choice, captured by saved views like the rest. */
export const PARAM_DENSITY = "density";

/** The pivot configuration. See `@adapttable/core/pivot`. */
export const PARAM_PIVOT = "pivot";

/** The user-typed formula columns. See `@adapttable/core/formula`. */
export const PARAM_FORMULA = "formula";

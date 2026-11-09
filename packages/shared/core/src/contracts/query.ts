/**
 * Query and filter state shapes.
 *
 * Leaf types only. Predicate engines and query codecs stay with their owners.
 * `queryContract`, `tableQuery` and `sort/compare` forward these names.
 */
import type { ExtraFilters, SortDirection } from "./columns";

/**
 * What a server source can answer, beyond the baseline every source handles
 * (page, limit, search, sort, filters).
 *
 * Omit the whole object — or any field — and the table treats that capability
 * as unavailable: it keeps the work on the frontend where it can, and warns in
 * development where it cannot.
 *
 * @public
 */
export interface QuerySupport {
  /** Grouping keys reach the server, which returns group rows. */
  grouping?: boolean;
  /**
   * The open tree nodes reach the server, which returns the rows of the
   * hierarchy that are visible — the roots, plus the children of every node
   * the reader has opened. The only correct place for a large tree: a browser
   * holding one page cannot know what is under a branch it has never seen.
   */
  tree?: boolean;
  /** Aggregate requests reach the server, which computes the values. */
  aggregates?: boolean;
  /**
   * Operation ids this backend can compute.
   *
   * Omit it and the five standard functions are assumed when `aggregates` is
   * true. A local `calculate` does not prove the server knows that id — list
   * a custom operation here before the table will ask for it.
   */
  aggregateOperations?: readonly string[];
  /** The nested AND/OR condition tree reaches the server. */
  filterTree?: boolean;
  /** Distinct-value counts per column reach the server. */
  facets?: boolean;
  /** Pagination is by opaque cursor rather than page number. */
  cursor?: boolean;
}

/**
 * The aggregate functions every implementation is expected to understand.
 *
 * @public
 */
export type AggregateFn = "sum" | "avg" | "count" | "min" | "max";

/**
 * One aggregate the table wants computed for a column.
 *
 * `fn` accepts any string so a backend can expose its own aggregations
 * (`"median"`, `"p95"`) without waiting for this type to name them, while the
 * five standard ones still autocomplete.
 *
 * @public
 */
export interface QueryAggregate {
  /** Column key to aggregate. */
  key: string;
  /** Aggregate function name. */
  fn: AggregateFn | (string & {});
}

/**
 * A single condition in a filter tree: one column, one operator, one value.
 *
 * @public
 */
export interface QueryCondition {
  /** Column or filter key. */
  key: string;
  /**
   * Operator id — `"eq"`, `"contains"`, `"between"`, … The operator set is
   * owned by the filtering work; this contract only carries it.
   */
  op: string;
  /** Operand, if the operator takes one. `"empty"` and friends do not. */
  value?: unknown;
}

/**
 * A node in the filter tree: conditions combined with one operator, nestable
 * so `(a AND b) OR c` is expressible.
 *
 * @public
 */
export interface QueryFilterGroup {
  /** How this group's children combine. */
  combinator: "and" | "or";
  /** Conditions and nested groups, in the order the user built them. */
  conditions: readonly (QueryCondition | QueryFilterGroup)[];
}

/**
 * Everything the table can additionally ask for, all optional. These ride on
 * {@link TableQuery} — see that type for the baseline fields.
 *
 * @public
 */
export interface QueryExtensions {
  /**
   * Grouping column keys, outermost first. A single-level grouping sends one
   * key; the field is an array so multi-level grouping needs no new field.
   */
  groupBy?: readonly string[];
  /** Aggregates to compute — per group when grouping, else over the result set. */
  aggregates?: readonly QueryAggregate[];
  /**
   * The nested condition tree, when the UI has built one. The flat `filters`
   * bag stays populated alongside it for servers that only read that.
   */
  filterTree?: QueryFilterGroup;
  /** Column keys needing distinct-value counts for their filter UI. */
  facets?: readonly string[];
  /** Opaque cursor from the previous response, when paginating by cursor. */
  cursor?: string;
  /**
   * The ids of the tree nodes the reader has open, so the server can return
   * their children with the page. Empty means a folded tree — the roots and
   * nothing else.
   */
  expandedIds?: readonly string[];
}

/**
 * One level of a multi-column sort.
 *
 * @public
 */
export interface SortLevel {
  /** Stable key for the entry. */
  key: string;
  /** Sort direction for this level. */
  dir: SortDirection;
}

/**
 * One consolidated snapshot of everything a server query needs.
 *
 * @public
 */
export interface TableQuery extends QueryExtensions {
  /** 1-based page. */
  page: number;
  /** Page size. */
  limit: number;
  /** Committed (debounced) search term. */
  search: string;
  /** Active sort column key, if any. */
  sortBy: string | undefined;
  /** Active sort direction, if any. */
  sortDir: SortDirection | undefined;
  /** The multi-sort chain (empty unless multi-sort is in use). */
  sortLevels: readonly SortLevel[];
  /** The active filter values. */
  filters: ExtraFilters;
}

/**
 * One distinct value in a checklist, with its count in the current set.
 *
 * @public
 */
export interface ChecklistValue {
  /** The value itself. */
  value: string;
  /** Caption shown for the entry. */
  label: string;
  /** How many rows carry this value. */
  count: number;
}

/**
 * Distinct values + counts for one filter key.
 *
 * @public
 */
export type FacetCounts = readonly ChecklistValue[];

/**
 * Facet counts keyed by filter key.
 *
 * @public
 */
export type FacetMap = Readonly<Record<string, FacetCounts>>;

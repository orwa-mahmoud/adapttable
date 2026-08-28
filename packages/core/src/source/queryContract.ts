/**
 * The query contract — the shape of everything the table can ask a server for,
 * defined once so the features that arrive later never have to change it.
 *
 * Every field here is optional, on both sides of the wire. A server that
 * ignores all of them behaves exactly as it does today; a table whose source
 * declares no support asks for nothing new. That is the whole design: adding
 * grouping, aggregates, filter trees, facets or cursors to this contract can
 * never break an integration that predates them.
 *
 * A source declares what it can answer through {@link QuerySupport}. The table
 * checks that before it asks, and says so in development when the UI wants
 * something the source did not sign up for — silence there would look like a
 * bug in the table rather than a gap in the integration.
 */
import { devWarn } from "../utils/devWarn";

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
 * Narrows a filter-tree child to a nested group.
 *
 * @public
 */
export function isFilterGroup(
  node: QueryCondition | QueryFilterGroup
): node is QueryFilterGroup {
  return "combinator" in node;
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

/** The capability each extension field needs before the table will send it. */
const REQUIRES: Record<keyof QueryExtensions, keyof QuerySupport> = {
  groupBy: "grouping",
  expandedIds: "tree",
  aggregates: "aggregates",
  filterTree: "filterTree",
  facets: "facets",
  cursor: "cursor",
};

/** Human-readable reason, so a warning tells the reader what to do next. */
const REMEDY: Record<keyof QuerySupport, string> = {
  grouping: "return group rows for `query.groupBy`",
  tree: "return the children of every node in `query.expandedIds`",
  aggregates: "compute `query.aggregates`",
  filterTree: "evaluate `query.filterTree`",
  facets: "return counts for `query.facets`",
  cursor: "page by `query.cursor` instead of `query.page`",
};

/**
 * Keep only the extensions the source declared support for, and say something
 * in development about the ones dropped.
 *
 * The table asks for what the UI is showing; the source decides what it can
 * answer. Where those disagree the field is omitted rather than sent and
 * ignored — a server should never receive a field it never agreed to read.
 */
export function applyQuerySupport(
  extensions: QueryExtensions,
  support: QuerySupport | undefined,
  { warn = true }: { warn?: boolean } = {}
): QueryExtensions {
  const allowed: QueryExtensions = {};
  for (const [field, value] of Object.entries(extensions) as [
    keyof QueryExtensions,
    QueryExtensions[keyof QueryExtensions],
  ][]) {
    if (value === undefined) continue;
    const capability = REQUIRES[field];
    if (support?.[capability]) {
      Object.assign(allowed, { [field]: value });
    } else if (warn) {
      // devWarn dedupes by message, so this fires once per capability per
      // session however often the query changes.
      devWarn(
        `The table wants to send \`${field}\`, but this source does not declare ` +
          `\`supports.${capability}\`. The field is omitted. Set it once your ` +
          `endpoint can ${REMEDY[capability]}.`
      );
    }
  }
  return allowed;
}

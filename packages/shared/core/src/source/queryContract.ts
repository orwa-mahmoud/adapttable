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
import type { ExtraFilters, SortDirection } from "../contracts/columns";
import type {
  QueryCondition,
  QueryExtensions,
  QueryFilterGroup,
  QuerySupport,
} from "../contracts/query";
import { devWarn } from "../utils/devWarn";
export type {
  AggregateFn,
  QueryAggregate,
  QueryCondition,
  QueryExtensions,
  QueryFilterGroup,
  QuerySupport,
} from "../contracts/query";

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
  aggregateOperations:
    "list the aggregate operation ids this backend can compute",
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

/**
 * Page, search, and sort the source currently owns.
 *
 * Applied filter values stay here. The filter catalog is a separate
 * contribution. This is not a copy of the rows and it does not build an
 * engine: a server table publishes the same setters from its URL store.
 *
 * @public
 */
export interface QueryContribution {
  /** The 1-based page. */
  readonly page: number;
  /** The page size. */
  readonly limit: number;
  /**
   * Rows matching the current query, when the source counted them.
   *
   * The filtered total, not the dataset and not the rows on screen. Absent
   * where the source cannot say, which a consumer must carry as unknown
   * rather than substituting what happens to be loaded.
   */
  readonly total?: number;
  /**
   * The table's default page size, so a rows-per-page list can keep it
   * after the reader picks another size.
   */
  readonly defaultLimit?: number;
  /** The committed search text. */
  readonly search: string;
  /** Active sort key, when one is set. */
  readonly sortBy?: string;
  /** Active sort direction. */
  readonly sortDir?: SortDirection;
  /** Set the 1-based page. */
  readonly setPage: (page: number) => void;
  /** Set the page size. */
  readonly setLimit: (limit: number) => void;
  /** Set or clear the committed search text. */
  readonly setSearch: (search: string) => void;
  /** Set or clear the single-column sort. */
  readonly setSort: (key?: string, dir?: SortDirection) => void;
  /** Applied extra filters. */
  readonly extra?: ExtraFilters;
  /** Replace the applied extra filters. */
  readonly setExtras?: (extra: ExtraFilters) => void;
  /** Clear the applied extra filters. */
  readonly clearExtras?: () => void;
}

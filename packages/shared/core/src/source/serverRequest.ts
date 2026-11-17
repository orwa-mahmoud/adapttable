/**
 * What a server tier asks for, and how its answers accumulate.
 *
 * The rules around a request are the same whichever binding renders it: one
 * consolidated query per real change, `isLoading` for the first load only, an
 * out-of-range page clamped, a cursor trail that makes "back" possible, and
 * infinite pages appended rather than replaced. Only a table on the server
 * tier reaches this module, so a table on any other tier never loads it.
 */

import type {
  ColumnMetadata,
  ExtraFilters,
  SortDirection,
} from "../contracts/columns";
import type {
  QueryAggregate,
  QueryFilterGroup,
  QuerySupport,
  SortLevel,
  TableQuery,
} from "../contracts/query";
import { settledFilterTree } from "../filters/filterTreeCodec";
import {
  type GroupAggregateOverrides,
  withQueryAggregateOverrides,
} from "../grouping/groupAggregateOverrides";
import { parseGroupBy } from "../grouping/groupKeys";
import { stableKey } from "../utils/stableKey";
import { applyQuerySupport } from "./queryContract";
/* ── The query ─────────────────────────────────────────────────────── */

/**
 * What a server tier can say about aggregation: the source groups, and which
 * reader operations it honours. Grouping without aggregation refuses every
 * operation, so a restored override is never requested and silently dropped.
 *
 * @public
 */
export function queryAggregationSource(supports: QuerySupport | undefined):
  | {
      readonly grouping: "server";
      readonly aggregateOperations: readonly string[] | undefined;
    }
  | undefined {
  if (supports?.aggregates || supports?.aggregateOperations) {
    return {
      grouping: "server",
      aggregateOperations: supports.aggregateOperations,
    };
  }
  if (supports?.grouping) {
    return { grouping: "server", aggregateOperations: [] };
  }
  return undefined;
}

/**
 * The aggregates a request carries: the host's declaration with the reader's
 * overrides applied, gated by what the source honours and what each column
 * allows.
 *
 * @public
 */
export function effectiveQueryAggregates<TRow>(
  aggregates: readonly QueryAggregate[] | undefined,
  overrides: GroupAggregateOverrides,
  columns: readonly ColumnMetadata<TRow>[] | undefined,
  supports: QuerySupport | undefined
): readonly QueryAggregate[] | undefined {
  return withQueryAggregateOverrides(
    aggregates,
    overrides,
    columns,
    queryAggregationSource(supports)
  );
}

/**
 * The grouping keys a request carries, or `undefined` when none.
 *
 * @public
 */
export function queryGroupBy(
  groupBy: string | undefined
): string[] | undefined {
  const keys = parseGroupBy(groupBy);
  return keys.length > 0 ? keys : undefined;
}

/**
 * Everything a server query is built from.
 *
 * @public
 */
export interface TableQueryInput {
  /** 1-based page. */
  readonly page: number;
  /** Page size. */
  readonly limit: number;
  /** Committed search term. */
  readonly search: string;
  /** Single sort key. */
  readonly sortBy: string | undefined;
  /** Single sort direction. */
  readonly sortDir: SortDirection | undefined;
  /** Multi-column sort chain. */
  readonly sortLevels: readonly SortLevel[];
  /** The extra-filter bag. */
  readonly filters: ExtraFilters;
  /** Grouping keys, from {@link queryGroupBy}. */
  readonly groupBy?: string[];
  /** Aggregates, from {@link effectiveQueryAggregates}. */
  readonly aggregates?: readonly QueryAggregate[];
  /** The token that opens this page, in cursor mode. */
  readonly cursor?: string;
  /** Tree nodes the reader has open. */
  readonly expandedIds?: readonly string[];
  /** The AND/OR filter tree. */
  readonly filterTree?: QueryFilterGroup;
  /** Filter keys to count distinct values for. */
  readonly facets?: readonly string[];
  /** What the source declared it can answer. */
  readonly supports?: QuerySupport;
}

/**
 * The one consolidated query a server tier sends. Everything past the
 * baseline is gated on what the source declared — an undeclared capability
 * is dropped here, never sent and ignored.
 *
 * @public
 */
export function buildTableQuery(input: TableQueryInput): TableQuery {
  return {
    page: input.page,
    limit: input.limit,
    search: input.search,
    sortBy: input.sortBy,
    sortDir: input.sortDir,
    sortLevels: input.sortLevels,
    filters: input.filters,
    ...applyQuerySupport(
      {
        groupBy: input.groupBy,
        aggregates: input.aggregates,
        cursor: input.cursor,
        expandedIds: input.expandedIds,
        filterTree: input.filterTree,
        facets: input.facets,
      },
      input.supports
    ),
  };
}

/**
 * The view state and settings a server tier's query is built from.
 *
 * @internal
 */
export interface ServerQueryInput {
  /** The view-state store's snapshot. */
  readonly view: {
    readonly page: number;
    readonly limit: number;
    readonly search: string;
    readonly sortBy: string | undefined;
    readonly sortDir: SortDirection | undefined;
    readonly sortLevels: readonly SortLevel[];
    readonly groupBy: string | undefined;
    readonly extra: ExtraFilters;
    readonly filterTree: QueryFilterGroup | undefined;
  };
  /** What the endpoint can answer. */
  readonly supports: QuerySupport | undefined;
  /** Tree nodes the reader has open. */
  readonly expandedIds: readonly string[] | undefined;
  /** Filter keys to count distinct values for. */
  readonly facetKeys: readonly string[] | undefined;
  /** The aggregates the query asks for, from {@link effectiveQueryAggregates}. */
  readonly aggregates: readonly QueryAggregate[] | undefined;
  /** The token that opens the page, in cursor mode. */
  readonly cursor: string | undefined;
}

/**
 * The query a server tier sends for its view, and its value key.
 *
 * @internal
 */
export function serverQuery(input: ServerQueryInput): {
  readonly query: TableQuery;
  readonly queryKey: string;
} {
  const { view } = input;
  const query = buildTableQuery({
    page: view.page,
    limit: view.limit,
    search: view.search,
    sortBy: view.sortBy,
    sortDir: view.sortDir,
    sortLevels: view.sortLevels,
    filters: view.extra,
    groupBy: queryGroupBy(view.groupBy),
    aggregates: input.aggregates,
    cursor: input.cursor,
    expandedIds: input.expandedIds,
    filterTree: settledFilterTree(view.filterTree),
    facets: input.facetKeys,
    supports: input.supports,
  });
  // Value-keyed, so an identical query is never sent twice.
  return { query, queryKey: stableKey(query) };
}

/**
 * Whether a request can carry aggregates at all: the host asked for some,
 * a column offers them, or — without columns to check them against — the
 * reader chose one. When it cannot, {@link effectiveQueryAggregates} is
 * `undefined` without resolving a single operation.
 *
 * @internal
 */
export function requestsAggregates<TRow>(
  aggregates: readonly QueryAggregate[] | undefined,
  overrides: GroupAggregateOverrides,
  columns: readonly ColumnMetadata<TRow>[] | undefined
): boolean {
  if (aggregates !== undefined && aggregates.length > 0) return true;
  if (columns) {
    return columns.some(
      (column) =>
        column.aggregatable !== undefined && column.aggregatable !== false
    );
  }
  return Object.values(overrides).some((choice) => choice !== undefined);
}

/* ── Loading ───────────────────────────────────────────────────────── */

/**
 * Whether a tier is on its first load.
 *
 * `isLoading` covers the FIRST load only — fetching with no data yet. Once
 * rows have ever been present or one load has completed (loading went true
 * then false), later refreshes never raise it again, even one that empties
 * the rows.
 *
 * @public
 */
export interface FirstLoadLatch {
  /** Record what the tier reports. Idempotent, so a replayed call is safe. */
  readonly observe: (loading: boolean, rowsPresent: boolean) => void;
  /** Whether this is still the first load. */
  readonly isLoading: (loading: boolean, rowsPresent: boolean) => boolean;
}

/**
 * Create a first-load latch.
 *
 * @public
 */
export function createFirstLoadLatch(): FirstLoadLatch {
  let sawLoading = false;
  let firstLoadDone = false;
  return {
    observe(loading, rowsPresent) {
      if (rowsPresent) firstLoadDone = true;
      if (loading) sawLoading = true;
      else if (sawLoading) firstLoadDone = true;
    },
    isLoading: (loading, rowsPresent) =>
      loading && !rowsPresent && !firstLoadDone,
  };
}

/* ── Paging ────────────────────────────────────────────────────────── */

/**
 * The last real page when `page` is past it, else `undefined`.
 *
 * A hand-edited or stale shared link (`?page=999`) self-heals to the last
 * page once the total is known, instead of showing an empty state the pager
 * disagrees with. A total of zero or less clamps nothing.
 *
 * @public
 */
export function clampedPage(
  page: number,
  limit: number,
  total: number
): number | undefined {
  if (total <= 0) return undefined;
  const lastPage = Math.max(1, Math.ceil(total / Math.max(limit, 1)));
  return page > lastPage ? lastPage : undefined;
}

/**
 * The cursor tokens a server has handed out, indexed by the page each opens:
 * entry 0 is always `undefined` (page 1 needs no token) and entry n opens
 * page n+1. Keeping the trail rather than only the latest token is what lets
 * a reader page back through what they have already seen.
 *
 * @public
 */
export type CursorTrail = readonly (string | undefined)[];

/**
 * A trail that knows only page 1.
 *
 * @public
 */
export const EMPTY_CURSOR_TRAIL: CursorTrail = [undefined];

/**
 * Record the token for the page after `page`. Returns the same trail when it
 * already holds that token.
 *
 * @public
 */
export function recordCursor(
  trail: CursorTrail,
  page: number,
  token: string
): CursorTrail {
  if (trail[page] === token) return trail;
  const next = trail.slice();
  next[page] = token;
  return next;
}

/**
 * Whether the server said there is a page after `page`, by handing out its
 * token.
 *
 * @public
 */
export function cursorHasMore(trail: CursorTrail, page: number): boolean {
  return trail[page] !== undefined;
}

/**
 * Whether a page can be requested at all: without its token it cannot, so
 * cursor navigation reaches pages already visited plus the next one.
 *
 * @public
 */
export function canRequestCursorPage(
  trail: CursorTrail,
  page: number
): boolean {
  return page <= trail.length;
}

/**
 * What a cursor token's position depends on: a change to any of it describes
 * a different result set, so every token already held is meaningless and the
 * trail starts again from page 1. Wider than {@link appendBaseKey} — grouping,
 * the reader's aggregate overrides and the filter tree reshape the result a
 * token points into as surely as a sort does.
 *
 * @public
 */
export function cursorTrailKey(query: {
  readonly limit: number;
  readonly search: string;
  readonly sortBy: string | undefined;
  readonly sortDir: SortDirection | undefined;
  readonly sortLevels: readonly SortLevel[];
  readonly groupBy: string | undefined;
  readonly groupAggregateOverrides: GroupAggregateOverrides;
  readonly filters: ExtraFilters;
  readonly filterTree: QueryFilterGroup | undefined;
}): string {
  return stableKey([
    appendBaseKey(query),
    query.groupBy ?? null,
    query.groupAggregateOverrides,
    query.filterTree ?? null,
  ]);
}

/* ── Infinite pages ────────────────────────────────────────────────── */

/**
 * What a query means apart from its page: a change to any of it invalidates
 * accumulated pages and every cursor token.
 *
 * @public
 */
export function appendBaseKey(query: {
  readonly limit: number;
  readonly search: string;
  readonly sortBy: string | undefined;
  readonly sortDir: SortDirection | undefined;
  readonly sortLevels: readonly SortLevel[];
  readonly filters: ExtraFilters;
}): string {
  return stableKey({
    limit: query.limit,
    search: query.search,
    sortBy: query.sortBy,
    sortDir: query.sortDir,
    sortLevels: query.sortLevels,
    filters: query.filters,
  });
}

/**
 * The rows already on screen when an infinite tier asked for the next page.
 *
 * @public
 */
export interface AppendStash<TRow> {
  /** The {@link appendBaseKey} the stash belongs to. */
  readonly key: string;
  /** The page being appended. */
  readonly page: number;
  /** The rows on screen when it was requested. */
  readonly rows: readonly TRow[];
  /** The tier's rows array at that moment, to tell when the answer lands. */
  readonly prevProp: readonly TRow[];
}

/**
 * What an infinite tier shows: the stash while the next page is on its way,
 * then the stash with the new page appended. Any other query, a direct page
 * jump, or no stash shows the tier's rows as they are.
 *
 * @public
 */
export function appendedRows<TRow>(
  stash: AppendStash<TRow> | null,
  baseKey: string,
  page: number,
  rows: readonly TRow[]
): {
  readonly rows: readonly TRow[];
  readonly appending: boolean;
  readonly pending: boolean;
} {
  if (stash?.key !== baseKey || stash.page !== page) {
    return { rows, appending: false, pending: false };
  }
  // The advanced page's answer has not landed while the tier still hands
  // back the identical array the append started from.
  if (rows === stash.prevProp) {
    return { rows: stash.rows, appending: true, pending: true };
  }
  return { rows: [...stash.rows, ...rows], appending: true, pending: false };
}

/**
 * Whether a stash can never apply again: its query was superseded, or the
 * append failed.
 *
 * @public
 */
export function staleAppendStash<TRow>(
  stash: AppendStash<TRow> | null,
  baseKey: string,
  failed: boolean
): boolean {
  return stash !== null && (stash.key !== baseKey || failed);
}

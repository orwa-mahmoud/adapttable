/**
 * The data tier: how a table turns its view state into requests and the
 * answers into what it shows.
 *
 * A table is on one of three tiers — rows in memory (`frontend`), rows a
 * host fetches when the query changes (`server`), or a prebuilt `source` —
 * and the rules around a request are the same whichever binding renders it:
 * one consolidated query per real change, the superseded request aborted,
 * `isLoading` for the first load only, an out-of-range page clamped, a
 * cursor trail that makes "back" possible, and infinite pages appended
 * rather than replaced. This module is those rules; a binding drives them
 * from the view-state store and keeps its own reactivity.
 */
import type { ColumnMetadata } from "../columnModel";
import type { FacetMap } from "../filters/facets";
import type { FilterDef } from "../filters/filterDefs";
import {
  type GroupAggregateOverrides,
  withQueryAggregateOverrides,
} from "../grouping/groupAggregateOverrides";
import { parseGroupBy } from "../grouping/groupKeys";
import type { SortLevel } from "../sort/compare";
import type { ExtraFilters, SortDirection } from "../types";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import {
  applyQuerySupport,
  type QueryAggregate,
  type QueryFilterGroup,
  type QuerySupport,
} from "./queryContract";
import type { TableQuery } from "./tableQuery";

/* ── Tier resolution ───────────────────────────────────────────────── */

/**
 * Which tier owns a table's rows.
 *
 * @public
 */
export type DataTier = "frontend" | "server" | "source";

/**
 * The tier a table is on: a prebuilt `source` wins, then an explicit
 * `mode`, then `server` when a query handler is wired.
 *
 * @public
 */
export function resolveDataTier(
  source: unknown,
  mode: "frontend" | "server" | undefined,
  onQueryChange: unknown
): DataTier {
  if (source) return "source";
  if (mode) return mode;
  return onQueryChange ? "server" : "frontend";
}

/**
 * Warn in development when a table is handed more than one tier, or none.
 *
 * @public
 */
export function warnDataTierMisuse(
  source: unknown,
  mode: "frontend" | "server" | undefined,
  data: unknown,
  onQueryChange: unknown
): void {
  if (source && mode) {
    devWarn(
      "`mode` is ignored when `source` is provided — the prebuilt source wins. Pass one data tier."
    );
  }
  if (source && (data || onQueryChange)) {
    devWarn(
      "both `source` and `data`/`onQueryChange` were provided — using `source`. Pass one data tier."
    );
  }
  if (!source && !data) {
    devWarn(
      "no data tier provided — pass `data` (frontend), `data` + `onQueryChange` (server) or `source`."
    );
  }
}

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
 * The handler a server tier calls with each query.
 *
 * @public
 */
export type TableQueryListener = (
  query: TableQuery,
  info: { signal: AbortSignal; key: string }
) => void | Promise<void>;

/**
 * Sends queries to a handler, aborting the request each one supersedes.
 *
 * @public
 */
export interface QueryEmitter {
  /**
   * Send a query. The previous request's signal is aborted; the returned
   * function aborts this one, for when the table goes away.
   */
  readonly emit: (
    listener: TableQueryListener,
    query: TableQuery,
    key: string
  ) => () => void;
  /**
   * Send a query only when its key differs from the last one seen, sent or
   * not. Returns the abort for a sent query, `undefined` otherwise.
   */
  readonly emitIfChanged: (
    listener: TableQueryListener | undefined,
    query: TableQuery,
    key: string
  ) => (() => void) | undefined;
}

/**
 * Create a query emitter.
 *
 * @param seenKey - A key already seen, so a query with it is not sent by
 * {@link QueryEmitter.emitIfChanged}.
 *
 * @public
 */
export function createQueryEmitter(seenKey?: string): QueryEmitter {
  let controller: AbortController | undefined;
  let lastKey = seenKey;
  const emit = (
    listener: TableQueryListener,
    query: TableQuery,
    key: string
  ): (() => void) => {
    lastKey = key;
    controller?.abort();
    const next = new AbortController();
    controller = next;
    void listener(query, { signal: next.signal, key });
    return () => next.abort();
  };
  return {
    emit,
    emitIfChanged(listener, query, key) {
      if (lastKey === key) return undefined;
      lastKey = key;
      return listener ? emit(listener, query, key) : undefined;
    },
  };
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

/* ── Async filter options ──────────────────────────────────────────── */

/**
 * One option a filter def loaded on its own.
 *
 * @public
 */
export interface LoadedFilterOption {
  /** The value the filter stores. */
  value: string;
  /** What the option reads as. */
  label: string;
}

/**
 * Loads each filter def's own option list once, for the life of a table.
 *
 * @public
 */
export interface FilterOptionsLoader {
  /**
   * Start every load `defs` needs that has not started. Returns the release:
   * a load that settles after it reports nothing.
   */
  readonly load: (
    defs: readonly FilterDef<never>[],
    onLoaded: (key: string, options: readonly LoadedFilterOption[]) => void
  ) => () => void;
}

/**
 * Create a filter-options loader.
 *
 * A def whose `options` is a function names a list the host fetches — a set
 * of assignees, the countries in use. Each is fetched once by key, so opening
 * the Filters form twice does not fetch twice, and a def that appears later
 * is picked up by the next `load`. A failed load reports nothing here; the
 * form's own options read surfaces the failure.
 *
 * @public
 */
export function createFilterOptionsLoader(): FilterOptionsLoader {
  const started = new Set<string>();
  return {
    load(defs, onLoaded) {
      let alive = true;
      for (const def of defs) {
        if (typeof def.options !== "function") continue;
        if (started.has(def.key)) continue;
        started.add(def.key);
        const key = def.key;
        def.options().then(
          (next) => {
            if (alive) onLoaded(key, next);
          },
          () => undefined
        );
      }
      return () => {
        alive = false;
      };
    },
  };
}

/* ── Query libraries ───────────────────────────────────────────────── */

/**
 * The minimal shape a query-library tier reads from an infinite query.
 * Declared structurally so no query library is a runtime dependency: a
 * binding hands over its library's own result — TanStack Query's
 * `useInfiniteQuery` in React — and nothing else.
 *
 * @typeParam TPage - The page type returned by each fetch.
 *
 * @public
 */
export interface InfiniteQueryLike<TPage> {
  /** The pages fetched so far, absent before the first one lands. */
  data: { pages: TPage[]; pageParams: unknown[] } | undefined;
  /** Whether the first page is still in flight. */
  isLoading: boolean;
  /** Whether any fetch is in flight, first page or not. */
  isFetching: boolean;
  /** Whether the next page in particular is in flight. */
  isFetchingNextPage: boolean;
  /** Whether another page exists to fetch. */
  hasNextPage: boolean;
  /** Fetches the next page. */
  fetchNextPage: () => Promise<unknown> | void;
  /** Re-fetches from the first page. */
  refetch: () => Promise<unknown> | void;
  /** The failure from the last fetch, or null. */
  error: Error | null;
  /**
   * When the last SUCCESSFUL response landed, as a monotonic timestamp —
   * TanStack's own `dataUpdatedAt`. Optional so a hand-rolled query object
   * still satisfies this shape; with it, a column formatting a group's
   * subtotal can be told which operation produced the rows on screen even
   * when a later request failed, was cancelled, or is still travelling.
   */
  dataUpdatedAt?: number;
}

/**
 * Project a fetched page to its rows (and optional total).
 *
 * @public
 */
export type PageSelector<TRow, TPage> = (page: TPage) => {
  /** The rows this page carries. */
  rows: readonly TRow[];
  /** Rows in the whole matching set, when the page reports it. */
  total?: number;
  /** Distinct-value counts, when the endpoint answered them. */
  facets?: FacetMap;
};

/**
 * The data tier: which tier serves a table's rows, and the pieces every tier
 * shares.
 *
 * A table is on one of three tiers — rows in memory (`frontend`), rows a
 * host fetches when the query changes (`server`), or a prebuilt `source`.
 * This module resolves the tier, sends a query to a handler with the request
 * it supersedes aborted, and loads each filter's own option list. What a
 * server tier asks for and how its answers accumulate lives in
 * `serverRequest`, which only a server table loads.
 */

import type { FacetMap, TableQuery } from "../contracts/query";
import type { FilterDef } from "../filters/filterDefs";
import { devWarn } from "../utils/devWarn";

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

/* ── Sending a query ──────────────────────────────────────────────── */

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

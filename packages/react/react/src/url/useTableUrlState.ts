import {
  createTableViewStore,
  type ExtraFilters,
  type GroupAggregateOverrides,
  type QueryFilterGroup,
  type SortDirection,
  type TableQueryParams,
  type TableStateMutators,
  type TableViewState,
  type TableViewStateConfig,
} from "@adapttable/core";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { type UrlStateAdapter, useResolvedAdapter } from "./adapter";

/**
 * Options for `useTableUrlState`.
 *
 * @public
 */
export interface UseTableUrlStateOptions {
  /**
   * URL-state backend. Defaults to the browser History API. Supply a
   * router-specific adapter (react-router / Next.js) to integrate with an
   * existing navigation stack.
   */
  urlAdapter?: UrlStateAdapter;
  /**
   * When `false`, state is kept in a component-local memory store instead
   * of the URL — the table still works fully, it just isn't shareable.
   * Defaults to `true`.
   */
  urlSync?: boolean;
  /** Initial values applied when the URL has no value for a key. */
  defaults?: Partial<TableQueryParams> & { extra?: ExtraFilters };
  /** Extra-filter keys whose values are parsed as numbers. */
  numberExtraKeys?: readonly string[];
  /** Extra-filter keys whose values are comma-separated arrays. */
  arrayExtraKeys?: readonly string[];
  /**
   * Namespace for this table's URL params, so multiple tables can share one
   * URL without colliding. With `urlKey="left"` the params become
   * `left.q`, `left.page`, `left.f_status`, … Omit for the bare keys.
   */
  urlKey?: string;
}

/**
 * State + setters returned by `useTableUrlState`.
 *
 * @public
 */
export interface UseTableUrlStateResult extends TableStateMutators {
  /** Current 1-based page. */
  page: number;
  /** Current page size. */
  limit: number;
  /**
   * Page size applied when the URL has no `limit` param (`defaults.limit`,
   * or 25). Stable across `setLimit` so the rows-per-page list can keep it.
   */
  defaultLimit: number;
  /** Current committed search term. */
  search: string;
  /** Active sort column key, if any. */
  sortBy: string | undefined;
  /** Active sort direction, if any. */
  sortDir: SortDirection | undefined;
  /** Active row-grouping keys, comma-separated, if any. */
  groupBy: string | undefined;
  /** Session-level group aggregation choices keyed by column. */
  groupAggregateOverrides: GroupAggregateOverrides;
  /** The extra-filter bag. */
  extra: ExtraFilters;
  /** Nested AND/OR filter tree, when one is in the URL. */
  filterTree: QueryFilterGroup | undefined;
}

/**
 * Headless URL-synced table state. Keeps page / limit / search / sort and
 * an arbitrary `extra` filter bag in the query string (or a local store
 * when disabled), so reloads, shared links, and back/forward all restore
 * the exact slice. Decoupled from any router via `UrlStateAdapter`.
 *
 * A subscription to `@adapttable/core`'s table view-state store, which owns
 * the reads, the defaults and the writes.
 *
 * `defaults` apply only while the URL is silent about a key. When the user
 * explicitly clears a defaulted value (clearing the search, removing a
 * filter chip, clear-all), the hook records the clearing as an EMPTY-valued
 * param (`q=`, `sortBy=`, `f_status=`) so the default does not instantly
 * resurrect. Without a default for the key the param is simply deleted, so
 * URLs stay clean in the common case.
 *
 * @param options - See {@link UseTableUrlStateOptions}.
 * @returns The current state and its setters.
 *
 * @public
 */
export function useTableUrlState(
  options: UseTableUrlStateOptions = {}
): UseTableUrlStateResult {
  const {
    urlAdapter,
    urlSync,
    defaults,
    numberExtraKeys,
    arrayExtraKeys,
    urlKey,
  } = options;
  const resolved = useResolvedAdapter(urlAdapter, urlSync ?? true);
  const config: TableViewStateConfig = {
    defaults,
    numberExtraKeys,
    arrayExtraKeys,
  };
  // The store is created once per backend; later configuration reaches it
  // through `configure`, which keeps every unchanged value's identity.
  const [initialConfig] = useState(config);
  const store = useMemo(
    () =>
      createTableViewStore(
        {
          adapter: resolved,
          urlKey,
          // Server snapshot: with the default (history) adapter the server
          // rendered from an empty memory store, so hydration must read ""
          // too — the real URL applies right after hydration. An EXPLICIT
          // adapter is assumed to be SSR-consistent (e.g. a router adapter
          // that knows the request URL).
          serverSearch: () => (urlAdapter ? urlAdapter.getSearch() : ""),
        },
        initialConfig
      ),
    [resolved, urlKey, urlAdapter, initialConfig]
  );
  store.configure(config);
  const state: TableViewState = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot
  );

  // Two tables on one adapter without distinct urlKeys silently clobber each
  // other's params — the store warns in development.
  useEffect(() => store.claimNamespace(), [store]);

  return {
    ...state,
    setPage: store.setPage,
    setLimit: store.setLimit,
    setSort: store.setSort,
    setGroupBy: store.setGroupBy,
    initializeGroupBy: store.initializeGroupBy,
    setGroupAggregateOverrides: store.setGroupAggregateOverrides,
    toggleSortLevel: store.toggleSortLevel,
    setSearch: store.setSearch,
    setExtra: store.setExtra,
    setExtras: store.setExtras,
    setFilterTree: store.setFilterTree,
    clearExtras: store.clearExtras,
    clearAll: store.clearAll,
  };
}

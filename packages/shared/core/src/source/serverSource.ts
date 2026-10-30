/**
 * The server tier: a table whose host fetches one page at a time, told what
 * to fetch by one consolidated query per real change.
 *
 * A binding holds one {@link ServerSource} per table and hands it the host's
 * last answer and the view state on every update. The source keeps the rules
 * every binding shares — building and keying the query, sending it once per
 * change and aborting the one it supersedes, `isLoading` for the first load
 * only, clamping a page past the end, the cursor trail that makes "back"
 * possible, appending infinite pages instead of replacing them, and which
 * aggregate operations the rows on screen were computed with — so a binding
 * adds only its own reactivity and the moment it commits.
 */
import type { ColumnMetadata } from "../columnModel";
import { settledFilterTree } from "../filters/filterTreeCodec";
import {
  type GroupAggregateOverrides,
  queryAggregateOps,
} from "../grouping/groupAggregateOverrides";
import type { GroupAggregateOps } from "../grouping/groupRowLayout";
import type { SortLevel } from "../sort/compare";
import type {
  ExtraFilters,
  ResolvedPaginationMode,
  SortDirection,
} from "../types";
import { devWarn } from "../utils/devWarn";
import { stableKey } from "../utils/stableKey";
import {
  appendBaseKey,
  appendedRows,
  type AppendStash,
  buildTableQuery,
  canRequestCursorPage,
  clampedPage,
  createFirstLoadLatch,
  createQueryEmitter,
  cursorHasMore,
  type CursorTrail,
  cursorTrailKey,
  effectiveQueryAggregates,
  EMPTY_CURSOR_TRAIL,
  queryGroupBy,
  recordCursor,
  staleAppendStash,
  type TableQueryListener,
} from "./dataTier";
import type {
  QueryAggregate,
  QueryFilterGroup,
  QuerySupport,
} from "./queryContract";
import { createResponseAggregateOps } from "./responseAggregateOps";
import { createSourceSignal } from "./sourceState";
import type { TableQuery } from "./tableQuery";

/**
 * The host's last answer and its request settings, as of one update.
 *
 * @public
 */
export interface ServerSourceConfig<TRow> {
  /** The current page of rows, exactly as the server returned them. */
  readonly rows: readonly TRow[];
  /** Total row count across all pages. */
  readonly total: number;
  /**
   * The token for the page after the one on screen, or `null` when that was
   * the last page. Read only when `supports.cursor` is declared.
   */
  readonly nextCursor?: string | null;
  /** Whether a request is in flight. */
  readonly loading?: boolean;
  /** The failure from the last request, if any. */
  readonly error?: unknown;
  /** `"paged"` shows one page; `"infinite"` appends each next page. */
  readonly paginationMode: ResolvedPaginationMode;
  /** What the endpoint can answer beyond the baseline query. */
  readonly supports?: QuerySupport;
  /** Aggregate requests to send when the endpoint supports them. */
  readonly aggregates?: readonly QueryAggregate[];
  /** Columns, to refuse a disallowed aggregate request before it is sent. */
  readonly columns?: readonly ColumnMetadata<TRow>[];
  /** The key of the query these rows answer, when the host echoes it. */
  readonly responseKey?: string;
  /** Tree nodes the reader has open, sent with `supports.tree`. */
  readonly expandedIds?: readonly string[];
  /** Filter keys to count distinct values for, sent with `supports.facets`. */
  readonly facetKeys?: readonly string[];
  /** Called with each new query; the one it supersedes is aborted. */
  readonly onQueryChange?: TableQueryListener;
}

/**
 * The view state a server source requests, as the view-state store holds it,
 * and the store's page setter the source clamps and pages through.
 *
 * @public
 */
export interface ServerSourceViewState {
  /** Requested 1-based page. */
  readonly page: number;
  /** Rows per page. */
  readonly limit: number;
  /** Committed search term. */
  readonly search: string;
  /** Active sort column key, if any. */
  readonly sortBy: string | undefined;
  /** Active sort direction, if any. */
  readonly sortDir: SortDirection | undefined;
  /** The multi-column sort chain. */
  readonly sortLevels: readonly SortLevel[];
  /** Active row-grouping keys, comma-separated, if any. */
  readonly groupBy: string | undefined;
  /** The reader's aggregate overrides per column. */
  readonly groupAggregateOverrides: GroupAggregateOverrides;
  /** The extra-filter bag. */
  readonly extra: ExtraFilters;
  /** Nested AND/OR filter tree, if any. */
  readonly filterTree: QueryFilterGroup | undefined;
  /** Move the view-state store to a page. */
  readonly setPage: (page: number) => void;
}

/**
 * What a server source shows for one update.
 *
 * @public
 */
export interface ServerSourceFrame<TRow> {
  /** The query this view asks for. */
  readonly query: TableQuery;
  /** The query's value key, as sent to `onQueryChange`. */
  readonly queryKey: string;
  /** The rows to show: the host's page, or every page so far when appending. */
  readonly rows: readonly TRow[];
  /** Whether this is the first load — fetching with nothing shown yet. */
  readonly isLoading: boolean;
  /** Whether an appended page is on its way. */
  readonly isFetchingNextPage: boolean;
  /** Whether an infinite list has a page after the one shown. */
  readonly hasNextPage: boolean;
  /** Which operation produced each column's aggregate on screen, if known. */
  readonly groupAggregations: GroupAggregateOps | undefined;
}

/**
 * One table's server tier.
 *
 * @public
 */
export interface ServerSource<TRow> {
  /**
   * Read what the table shows for the host's answer and the view. Pure apart
   * from remembering the inputs: nothing is sent until
   * {@link ServerSource.commit}.
   */
  readonly update: (
    config: ServerSourceConfig<TRow>,
    view: ServerSourceViewState
  ) => ServerSourceFrame<TRow>;
  /**
   * Act on the last update once it is on screen: send the query when it
   * changed, latch the first load, clamp a page past the end, record the
   * cursor the host returned, drop a stale append, and settle the aggregate
   * operations. Safe to call after every render.
   */
  readonly commit: () => void;
  /** Go to a page, ignoring one a cursor trail cannot reach. */
  readonly setPage: (page: number) => void;
  /** Append the next page in infinite mode. */
  readonly fetchNextPage: () => void;
  /** Send the current query again. */
  readonly refetch: () => void;
  /**
   * Be told when the source's own state moved — an append, the cursor trail,
   * a refetch, the aggregate operations — so the binding updates again.
   */
  readonly subscribe: (listener: () => void) => () => void;
  /** Moves each time subscribers are told, for a snapshot-based binding. */
  readonly revision: () => number;
  /**
   * Abort the request in flight and forget what was sent, so a later commit
   * sends it again. For when the table goes away.
   */
  readonly dispose: () => void;
}

/** What one update derived, kept for the commit and the event handlers. */
interface Latest<TRow> {
  readonly config: ServerSourceConfig<TRow>;
  readonly view: ServerSourceViewState;
  readonly frame: ServerSourceFrame<TRow>;
  readonly requested: GroupAggregateOps | undefined;
  readonly baseKey: string;
  readonly trailKey: string;
  readonly cursorMode: boolean;
  readonly loading: boolean;
}

/**
 * Create one table's server tier.
 *
 * @returns The source; call {@link ServerSource.update} before the rest.
 *
 * @public
 */
export function createServerSource<TRow>(): ServerSource<TRow> {
  const signal = createSourceSignal();
  const { notify } = signal;

  const emitter = createQueryEmitter();
  const firstLoad = createFirstLoadLatch();
  const aggregateOps = createResponseAggregateOps();

  let cursors: CursorTrail = EMPTY_CURSOR_TRAIL;
  let stash: AppendStash<TRow> | null = null;
  let generation = 0;
  let cursorBase: string | undefined;
  let latest: Latest<TRow> | undefined;

  // What the last commit acted on, so each rule runs when its inputs move.
  let sent: string | undefined;
  let abortSent: (() => void) | undefined;
  let recordedFor: string | undefined;

  function update(
    config: ServerSourceConfig<TRow>,
    view: ServerSourceViewState
  ): ServerSourceFrame<TRow> {
    const { rows, total, supports } = config;
    const loading = config.loading ?? false;
    const { page, limit, search, sortBy, sortDir, sortLevels, extra } = view;
    const paged = config.paginationMode === "paged";

    const aggregates = effectiveQueryAggregates(
      config.aggregates,
      view.groupAggregateOverrides,
      config.columns,
      supports
    );
    // Cursor mode keeps the trail of every token the server has handed out —
    // what lets the user page back through what they have already seen.
    const cursorMode = supports?.cursor === true;
    const query = buildTableQuery({
      page,
      limit,
      search,
      sortBy,
      sortDir,
      sortLevels,
      filters: extra,
      groupBy: queryGroupBy(view.groupBy),
      aggregates,
      cursor: cursorMode ? cursors[page - 1] : undefined,
      expandedIds: config.expandedIds,
      filterTree: settledFilterTree(view.filterTree),
      facets: config.facetKeys,
      supports,
    });
    // Value-keyed, so an identical query is never sent twice.
    const queryKey = stableKey(query);

    const requested = queryAggregateOps(aggregates);
    aggregateOps.remember(queryKey, requested);

    // Infinite-append accumulation: `fetchNextPage` stashes the rows already
    // on screen (plus the host's CURRENT rows array) and advances the page;
    // the stashed rows alone stay on screen until the host hands back a NEW
    // rows array for the advanced page, which is then appended. Any
    // base-query change, a direct page jump, or an error invalidates the
    // stash, falling back to replacement.
    const keyed = { ...view, filters: extra };
    const baseKey = appendBaseKey(keyed);
    const trailKey = cursorTrailKey(keyed);
    cursorBase ??= trailKey;
    const appended = appendedRows(stash, baseKey, page, rows);

    // Offset mode knows the end from the count; cursor mode only knows there
    // is more because the server said so by returning another token.
    const moreToLoad = cursorMode
      ? cursorHasMore(cursors, page)
      : page * limit < total;

    const frame: ServerSourceFrame<TRow> = {
      query,
      queryKey,
      rows: appended.rows,
      isLoading: firstLoad.isLoading(loading, rows.length > 0),
      isFetchingNextPage: appended.pending,
      hasNextPage: !paged && moreToLoad,
      groupAggregations: aggregateOps.current(),
    };
    latest = {
      config,
      view,
      frame,
      requested,
      baseKey,
      trailKey,
      cursorMode,
      loading,
    };
    return frame;
  }

  /** One request per real change; the one it supersedes is aborted. */
  function send({ config, frame }: Latest<TRow>): void {
    const key = `${frame.queryKey}#${String(generation)}`;
    if (sent === key) return;
    sent = key;
    abortSent?.();
    abortSent = config.onQueryChange
      ? emitter.emit(config.onQueryChange, frame.query, frame.queryKey)
      : undefined;
  }

  /**
   * Record the token for the page after the one on screen, so "next" has
   * something to send and a later "back" can retrace the trail. Returns
   * whether the trail moved.
   */
  function record({
    config,
    view,
    cursorMode,
    loading,
  }: Latest<TRow>): boolean {
    const nextCursor = config.nextCursor ?? null;
    const key = [cursorMode, loading, nextCursor, view.page].join();
    if (recordedFor === key) return false;
    recordedFor = key;
    if (!cursorMode || loading || nextCursor === null) return false;
    const next = recordCursor(cursors, view.page, nextCursor);
    if (next === cursors) return false;
    cursors = next;
    return true;
  }

  function commit(): void {
    if (!latest) return;
    const { config, view, frame, requested, baseKey, trailKey } = latest;
    const { cursorMode, loading } = latest;
    const failed = config.error != null;
    const rowsPresent = config.rows.length > 0;

    let changed = aggregateOps.settle({
      requestKey: frame.queryKey,
      requested,
      responseKey: config.responseKey,
      hasData: rowsPresent,
      fetching: loading,
      failed,
    });
    send(latest);
    firstLoad.observe(loading, rowsPresent);
    // Clamp an out-of-range page (a hand-edited or stale shared link) once
    // the total is known and nothing is in flight, so `?page=999` heals to
    // the last real page. Cursor mode has no offset arithmetic to clamp
    // against — the trail gates which pages are reachable.
    const lastPage =
      cursorMode || loading
        ? undefined
        : clampedPage(view.page, view.limit, config.total);
    if (lastPage !== undefined) view.setPage(lastPage);
    if (record(latest)) changed = true;
    // A stash for a superseded base query can never apply, and an errored
    // append stops accumulating.
    if (staleAppendStash(stash, baseKey, failed)) {
      stash = null;
      changed = true;
    }
    // A new sort, filter, search, grouping or page size makes every token the
    // server issued meaningless. Drop the trail and start again from page 1.
    if (cursorMode && cursorBase !== trailKey) {
      cursorBase = trailKey;
      cursors = EMPTY_CURSOR_TRAIL;
      changed = true;
      view.setPage(1);
    }
    if (changed) notify();
  }

  return {
    update,
    commit,
    setPage(next) {
      if (!latest) return;
      const { view, cursorMode } = latest;
      // Without a token a page cannot be requested at all, so a pager click
      // beyond the trail is ignored rather than silently re-serving page 1.
      if (cursorMode && !canRequestCursorPage(cursors, next)) return;
      view.setPage(next);
    },
    fetchNextPage() {
      if (!latest) return;
      const { config, view, frame, baseKey, loading } = latest;
      if (
        config.paginationMode === "paged" ||
        loading ||
        frame.isFetchingNextPage ||
        !frame.hasNextPage
      ) {
        return;
      }
      stash = {
        key: baseKey,
        page: view.page + 1,
        rows: frame.rows,
        prevProp: config.rows,
      };
      notify();
      view.setPage(view.page + 1);
    },
    refetch() {
      // Re-sending the query IS this tier's fetch mechanism — the host runs
      // the request. Without a handler there is nothing to re-run.
      if (!latest?.config.onQueryChange) {
        devWarn(
          "refetch() has nothing to re-run without an `onQueryChange` handler."
        );
        return;
      }
      generation += 1;
      notify();
    },
    subscribe: signal.subscribe,
    revision: signal.revision,
    dispose() {
      abortSent?.();
      abortSent = undefined;
      sent = undefined;
    },
  };
}

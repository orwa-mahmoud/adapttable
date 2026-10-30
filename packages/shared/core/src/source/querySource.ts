/**
 * The query-library tier: a table whose pages come from the host's own
 * paginated query — TanStack Query's `useInfiniteQuery` in React.
 *
 * The library owns fetching, caching and retries; the table owns what to ask
 * for. A binding holds one {@link QuerySource} per table, asks it for the
 * params before calling its library, and hands the library's result back.
 * The source keeps the rules every binding shares — merging the host's static
 * params under the live view, gating capabilities on what the endpoint
 * declared, projecting pages to rows (the last page when paged, every page so
 * far when infinite), the cursor trail, clamping a page past the end, and
 * which aggregate operations the rows on screen were computed with — so a
 * binding adds only its own reactivity and the moment it commits.
 */
import type { ColumnMetadata } from "../columnModel";
import type { FacetMap } from "../filters/facets";
import { settledFilterTree } from "../filters/filterTreeCodec";
import { queryAggregateOps } from "../grouping/groupAggregateOverrides";
import type { GroupAggregateOps } from "../grouping/groupRowLayout";
import type {
  PaginatedResponse,
  ResolvedPaginationMode,
  TableQueryParams,
} from "../types";
import { stableKey } from "../utils/stableKey";
import {
  clampedPage,
  type CursorTrail,
  cursorTrailKey,
  effectiveQueryAggregates,
  EMPTY_CURSOR_TRAIL,
  type InfiniteQueryLike,
  type PageSelector,
  queryGroupBy,
  recordCursor,
} from "./dataTier";
import {
  applyQuerySupport,
  type QueryAggregate,
  type QuerySupport,
} from "./queryContract";
import { createResponseAggregateOps } from "./responseAggregateOps";
import type { ServerSourceViewState } from "./serverSource";
import { createSourceSignal } from "./sourceState";

/**
 * The host's query settings, as of one update.
 *
 * @public
 */
export interface QuerySourceConfig<
  TRow,
  TParams extends TableQueryParams,
  TPage,
> {
  /** `"paged"` shows the last page; `"infinite"` shows every page so far. */
  readonly paginationMode: ResolvedPaginationMode;
  /**
   * Static params merged under every query. The live view always wins on a
   * collision.
   */
  readonly baseParams?: Partial<TParams>;
  /** Final scrubber on the merged params before they reach the query. */
  readonly sanitizeParams?: (params: Partial<TParams>) => Partial<TParams>;
  /** What the endpoint can answer beyond the baseline params. */
  readonly supports?: QuerySupport;
  /** Aggregate requests to send when the endpoint supports them. */
  readonly aggregates?: readonly QueryAggregate[];
  /** Columns, to refuse a disallowed aggregate request before it is sent. */
  readonly columns?: readonly ColumnMetadata<TRow>[];
  /** Tree nodes the reader has open, sent with `supports.tree`. */
  readonly expandedIds?: readonly string[];
  /** Filter keys to count distinct values for, sent with `supports.facets`. */
  readonly facetKeys?: readonly string[];
  /**
   * The token that opens the page after one the query returned. Read only
   * when `supports.cursor` is declared.
   */
  readonly nextCursor?: (page: TPage) => string | null | undefined;
}

/**
 * The library's answer and how to read it, as of one update.
 *
 * @public
 */
export interface QuerySourceAnswer<TRow, TPage> {
  /** What the library returned for the params. */
  readonly query: InfiniteQueryLike<TPage>;
  /** Page → rows, total and facets. Defaults to reading `PaginatedResponse`. */
  readonly selectPage?: PageSelector<TRow, TPage>;
  /**
   * Re-project when this changes, even with no new query data. The selector
   * itself is not compared, so an inline one does not re-project every update.
   */
  readonly selectorKey?: string | number;
}

/**
 * What a query source shows for one update.
 *
 * @public
 */
export interface QuerySourceFrame<TRow> {
  /** The rows to show. */
  readonly rows: readonly TRow[];
  /** Rows in the whole result: the reported total, else the rows held. */
  readonly total: number;
  /** Distinct-value counts from the last page that carried them. */
  readonly facets: FacetMap | undefined;
  /** Whether an appended page is on its way (never when paged). */
  readonly isFetchingNextPage: boolean;
  /** Whether there is a page to append (never when paged). */
  readonly hasNextPage: boolean;
  /** Which operation produced each column's aggregate on screen, if known. */
  readonly groupAggregations: GroupAggregateOps | undefined;
}

/**
 * One table's query-library tier.
 *
 * @public
 */
export interface QuerySource<TRow, TParams extends TableQueryParams, TPage> {
  /**
   * The params to hand the query library for this view. The same inputs give
   * the same object, so a library keyed on it does not refetch.
   */
  readonly params: (
    config: QuerySourceConfig<TRow, TParams, TPage>,
    view: ServerSourceViewState
  ) => Partial<TParams>;
  /** Read what the table shows from the library's answer. */
  readonly update: (
    answer: QuerySourceAnswer<TRow, TPage>
  ) => QuerySourceFrame<TRow>;
  /**
   * Act on the last update once it is on screen: record the cursor the page
   * returned, restart the trail when the query means something else, settle
   * the aggregate operations and clamp a page past the end.
   */
  readonly commit: () => void;
  /** Append the next page in infinite mode, unless one is on its way. */
  readonly fetchNextPage: () => void;
  /** Re-run the query from its first page. */
  readonly refetch: () => Promise<unknown> | void;
  /** Be told when the source's own state moved, so the binding updates. */
  readonly subscribe: (listener: () => void) => () => void;
  /** Moves each time subscribers are told, for a snapshot-based binding. */
  readonly revision: () => number;
}

const defaultSelectPage: PageSelector<unknown, PaginatedResponse<unknown>> = (
  page
) => ({ rows: page.rows ?? [], total: page.total, facets: page.facets });

interface Projection<TRow> {
  readonly rows: readonly TRow[];
  readonly total: number;
  readonly facets: FacetMap | undefined;
}

const EMPTY_PROJECTION: Projection<never> = {
  rows: [],
  total: 0,
  facets: undefined,
};

/** Pages → rows: the last page when paged, every page so far when infinite. */
function project<TRow, TPage>(
  pages: readonly TPage[] | undefined,
  paged: boolean,
  select: PageSelector<TRow, TPage>
): Projection<TRow> {
  const last = pages?.at(-1);
  if (!pages || last === undefined) return EMPTY_PROJECTION;
  if (paged) {
    const projected = select(last);
    return {
      rows: projected.rows,
      total: projected.total ?? projected.rows.length,
      facets: projected.facets,
    };
  }
  const rows: TRow[] = [];
  let total: number | undefined;
  let facets: FacetMap | undefined;
  for (const page of pages) {
    const projected = select(page);
    rows.push(...projected.rows);
    if (projected.total !== undefined) total = projected.total;
    if (projected.facets) facets = projected.facets;
  }
  // When the source reports no grand total, the rows held are the total.
  return { rows, total: total ?? rows.length, facets };
}

/**
 * Create one table's query-library tier.
 *
 * @returns The source; call {@link QuerySource.params} and
 * {@link QuerySource.update} before the rest.
 *
 * @public
 */
export function createQuerySource<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>(): QuerySource<TRow, TParams, TPage> {
  const signal = createSourceSignal();
  const { notify } = signal;

  const aggregateOps = createResponseAggregateOps();
  let cursors: CursorTrail = EMPTY_CURSOR_TRAIL;
  let trailBase: string | undefined;
  let recordedFor: string | undefined;

  let config: QuerySourceConfig<TRow, TParams, TPage> | undefined;
  let view: ServerSourceViewState | undefined;
  let request:
    | {
        readonly inputs: readonly unknown[];
        readonly params: Partial<TParams>;
        readonly opsKey: string;
        readonly requested: GroupAggregateOps | undefined;
        readonly trailKey: string;
      }
    | undefined;
  let answer: QuerySourceAnswer<TRow, TPage> | undefined;
  let projection:
    | {
        readonly data: InfiniteQueryLike<TPage>["data"];
        readonly paged: boolean;
        readonly selectorKey: string | number | undefined;
        readonly result: Projection<TRow>;
      }
    | undefined;

  function params(
    nextConfig: QuerySourceConfig<TRow, TParams, TPage>,
    nextView: ServerSourceViewState
  ): Partial<TParams> {
    config = nextConfig;
    view = nextView;
    const { supports } = nextConfig;
    // Cursor mode keeps every token the server has handed out, indexed by the
    // page it opens — what lets the user page BACK through what they have
    // already seen.
    const cursor =
      supports?.cursor === true ? cursors[nextView.page - 1] : undefined;
    const inputs = [
      nextConfig.baseParams,
      nextConfig.sanitizeParams,
      supports,
      nextConfig.aggregates,
      nextConfig.columns,
      nextConfig.expandedIds,
      nextConfig.facetKeys,
      nextView.page,
      nextView.limit,
      nextView.search,
      nextView.sortBy,
      nextView.sortDir,
      nextView.sortLevels,
      nextView.groupBy,
      nextView.groupAggregateOverrides,
      nextView.extra,
      nextView.filterTree,
      cursor,
    ];
    if (
      request?.inputs.every((input, index) => Object.is(input, inputs[index]))
    ) {
      return request.params;
    }

    const aggregates = effectiveQueryAggregates(
      nextConfig.aggregates,
      nextView.groupAggregateOverrides,
      nextConfig.columns,
      supports
    );
    const groupBy = queryGroupBy(nextView.groupBy);
    // baseParams are DEFAULTS: everything live is written after them, so a
    // static param can never beat the user's current state. Filter values
    // travel under their own `filters` key, so a filter named `sortBy` can
    // never collide with a state param.
    const merged: Record<string, unknown> = { ...nextConfig.baseParams };
    merged.page = nextView.page;
    merged.limit = nextView.limit;
    merged.search = nextView.search || undefined;
    merged.sortBy = nextView.sortBy;
    merged.sortDir = nextView.sortDir;
    merged.groupBy = nextView.groupBy;
    merged.filters = nextView.extra;
    // Everything past the baseline is gated on what the source declared. The
    // grouping keys travel as a LIST even when there is one.
    Object.assign(
      merged,
      applyQuerySupport(
        {
          cursor,
          groupBy,
          aggregates,
          expandedIds: nextConfig.expandedIds,
          filterTree: settledFilterTree(nextView.filterTree),
          facets: nextConfig.facetKeys,
        },
        supports
      )
    );
    const next = merged as Partial<TParams>;
    const opsKey = stableKey({ aggregates, groupBy });
    const requested =
      request?.opsKey === opsKey
        ? request.requested
        : queryAggregateOps(aggregates);
    request = {
      inputs,
      params: nextConfig.sanitizeParams
        ? nextConfig.sanitizeParams(next)
        : next,
      opsKey,
      requested,
      trailKey: cursorTrailKey({
        limit: nextView.limit,
        search: nextView.search,
        sortBy: nextView.sortBy,
        sortDir: nextView.sortDir,
        sortLevels: nextView.sortLevels,
        groupBy: nextView.groupBy,
        groupAggregateOverrides: nextView.groupAggregateOverrides,
        filters: nextView.extra,
        filterTree: settledFilterTree(nextView.filterTree),
      }),
    };
    trailBase ??= request.trailKey;
    return request.params;
  }

  const current = () => {
    if (!config || !view || !request || !answer) {
      throw new Error("createQuerySource: call params() and update() first");
    }
    return { config, view, request, answer };
  };

  function update(
    nextAnswer: QuerySourceAnswer<TRow, TPage>
  ): QuerySourceFrame<TRow> {
    answer = nextAnswer;
    const { config: settings, request: asked } = current();
    const { query, selectorKey } = nextAnswer;
    const paged = settings.paginationMode === "paged";
    aggregateOps.remember(asked.opsKey, asked.requested);

    // Re-projected only when the query's data, the mode or the host's
    // selector key moved — never for a fresh inline selector alone.
    let held = projection;
    if (
      !held ||
      held.data !== query.data ||
      held.paged !== paged ||
      held.selectorKey !== selectorKey
    ) {
      const select = (nextAnswer.selectPage ??
        defaultSelectPage) as PageSelector<TRow, TPage>;
      held = {
        data: query.data,
        paged,
        selectorKey,
        result: project(query.data?.pages, paged, select),
      };
      projection = held;
    }
    const { rows, total, facets } = held.result;

    // Append semantics exist only in infinite mode — paged navigation is
    // `setPage`, so the append flags read false rather than the library's.
    return {
      rows,
      total,
      facets,
      isFetchingNextPage: paged ? false : query.isFetchingNextPage,
      hasNextPage: paged ? false : query.hasNextPage,
      groupAggregations: aggregateOps.current(),
    };
  }

  /**
   * Record the token the CURRENT page handed back, read from the last page
   * the query holds — the one the table is showing. Returns whether the
   * trail moved.
   */
  function recordToken(
    query: InfiniteQueryLike<TPage>,
    settings: QuerySourceConfig<TRow, TParams, TPage>,
    page: number,
    cursorMode: boolean
  ): boolean {
    const lastPage = query.data?.pages.at(-1);
    const token =
      cursorMode && lastPage !== undefined
        ? settings.nextCursor?.(lastPage)
        : undefined;
    const key = `${String(cursorMode)}:${String(token)}:${String(page)}`;
    if (recordedFor === key) return false;
    recordedFor = key;
    if (token === undefined || token === null) return false;
    const next = recordCursor(cursors, page, token);
    if (next === cursors) return false;
    cursors = next;
    return true;
  }

  function commit(): void {
    if (!answer || !config || !view || !request) return;
    const { query } = answer;
    const { page, limit, setPage } = view;
    const cursorMode = config.supports?.cursor === true;
    const paged = config.paginationMode === "paged";
    let changed = false;

    if (recordToken(query, config, page, cursorMode)) changed = true;

    // A query that means something else must start over rather than page
    // into a position that no longer exists.
    if (cursorMode && trailBase !== request.trailKey) {
      trailBase = request.trailKey;
      cursors = EMPTY_CURSOR_TRAIL;
      changed = true;
      setPage(1);
    }

    // TanStack moves `dataUpdatedAt` only when a fetch actually answered, so
    // retained pages keep the operations they were computed with through a
    // failure, a cancellation and a late `loading` flag.
    if (
      aggregateOps.settle({
        requestKey: request.opsKey,
        requested: request.requested,
        respondedAt: query.dataUpdatedAt,
        hasData: query.data !== undefined,
        fetching: query.isFetching,
        failed: query.error !== null,
      })
    ) {
      changed = true;
    }

    // Clamp an out-of-range page once the total is known and nothing is in
    // flight.
    if (paged && !query.isLoading && !query.isFetching) {
      const last = clampedPage(page, limit, projection?.result.total ?? 0);
      if (last !== undefined) setPage(last);
    }

    if (changed) notify();
  }

  return {
    params,
    update,
    commit,
    fetchNextPage() {
      const { config: settings, answer: latest } = current();
      if (settings.paginationMode === "paged") return;
      const { query } = latest;
      if (query.hasNextPage && !query.isFetchingNextPage) {
        void query.fetchNextPage();
      }
    },
    refetch: () => current().answer.query.refetch(),
    subscribe: signal.subscribe,
    revision: signal.revision,
  };
}

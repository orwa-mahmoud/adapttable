import {
  type ColumnMetadata,
  createQuerySource,
  type InfiniteQueryLike,
  type PageSelector,
  type PaginatedResponse,
  type QueryAggregate,
  type QuerySupport,
  type TableQueryParams,
  type TableSource,
} from "@adapttable/core";
import { computed, type MaybeRefOrGetter, type ShallowRef, toValue } from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
  useExternalStore,
  useScopeActivity,
} from "../store";
import {
  useTableUrlState,
  type UseTableUrlStateOptions,
} from "../url/useTableUrlState";
import {
  type SourceViewportOptions,
  useSourceMode,
  useSourceSnapshot,
} from "./sourceLifecycle";

/** A query-library-neutral result with reactive values and ordinary methods. @public */
export interface InfiniteQueryState<TPage> {
  readonly data: MaybeRefOrGetter<InfiniteQueryLike<TPage>["data"]>;
  readonly isLoading: MaybeRefOrGetter<boolean>;
  readonly isFetching: MaybeRefOrGetter<boolean>;
  readonly isFetchingNextPage: MaybeRefOrGetter<boolean>;
  readonly hasNextPage: MaybeRefOrGetter<boolean>;
  readonly error: MaybeRefOrGetter<Error | null>;
  readonly dataUpdatedAt?: MaybeRefOrGetterOptional<number>;
  readonly fetchNextPage: () => Promise<unknown> | void;
  readonly refetch: () => Promise<unknown> | void;
}

/** Options for the query-library tier. @public */
export interface UseQuerySourceOptions<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>
  extends UseTableUrlStateOptions, SourceViewportOptions {
  /**
   * Called once in setup with the live params ref. The host query composable
   * owns fetching/cancellation, including its SSR and KeepAlive policy.
   */
  readonly query: (
    params: Readonly<ShallowRef<Partial<TParams>>>
  ) => InfiniteQueryState<TPage>;
  readonly selectPage?: PageSelector<TRow, TPage>;
  readonly selectorKey?: MaybeRefOrGetterOptional<string | number>;
  readonly baseParams?: MaybeRefOrGetterOptional<Partial<TParams>>;
  readonly sanitizeParams?: (params: Partial<TParams>) => Partial<TParams>;
  readonly supports?: MaybeRefOrGetterOptional<QuerySupport>;
  readonly aggregates?: MaybeRefOrGetterOptional<readonly QueryAggregate[]>;
  readonly columns?: MaybeRefOrGetterOptional<readonly ColumnMetadata<TRow>[]>;
  readonly expandedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly facetKeys?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly nextCursor?: (page: TPage) => string | null | undefined;
}

/** A shallow, readonly query-source snapshot. @public */
export type QuerySourceState<TRow> = Readonly<ShallowRef<TableSource<TRow>>>;

/** Adapt one setup-time query factory without importing a query library. @public */
export function useQuerySource<
  TRow,
  TParams extends TableQueryParams = TableQueryParams,
  TPage = PaginatedResponse<TRow>,
>(
  input: MaybeRefOrGetter<UseQuerySourceOptions<TRow, TParams, TPage>>
): QuerySourceState<TRow> {
  requireScope("useQuerySource");
  const options = computed(() => toValue(input));
  const { state, ...actions } = useTableUrlState(options);
  const mode = useSourceMode(options);
  const active = useScopeActivity();
  const source = createQuerySource<TRow, TParams, TPage>();
  const revision = useExternalStore({
    getSnapshot: source.revision,
    subscribe: source.subscribe,
  });
  const params = computed(() => {
    toValue(revision);
    const value = options.value;
    return source.params(
      {
        paginationMode: mode.value,
        baseParams: toValue(value.baseParams),
        sanitizeParams: value.sanitizeParams,
        supports: toValue(value.supports),
        aggregates: toValue(value.aggregates),
        columns: toValue(value.columns),
        expandedIds: toValue(value.expandedIds),
        facetKeys: toValue(value.facetKeys),
        nextCursor: value.nextCursor,
      },
      { ...state.value, setPage: actions.setPage }
    );
  });
  const fetchNextPage = (): void => {
    if (active.value) source.fetchNextPage();
  };
  const refetch = (): Promise<unknown> | void => {
    if (active.value) return source.refetch();
  };
  const query = options.value.query(params);
  return useSourceSnapshot((): TableSource<TRow> => {
    toValue(params);
    const value = options.value;
    const supports = toValue(value.supports);
    const answer: InfiniteQueryLike<TPage> = {
      data: toValue(query.data),
      isLoading: toValue(query.isLoading),
      isFetching: toValue(query.isFetching),
      isFetchingNextPage: toValue(query.isFetchingNextPage),
      hasNextPage: toValue(query.hasNextPage),
      error: toValue(query.error),
      dataUpdatedAt: toValue(query.dataUpdatedAt),
      fetchNextPage: query.fetchNextPage,
      refetch: query.refetch,
    };
    const frame = source.update({
      query: answer,
      selectPage: value.selectPage,
      selectorKey: toValue(value.selectorKey),
    });
    return {
      ...state.value,
      ...actions,
      rows: frame.rows,
      total: frame.total,
      facets: frame.facets,
      groupAggregations: frame.groupAggregations,
      queryAggregates: toValue(value.aggregates),
      aggregateOperations: supports?.aggregateOperations,
      honorsAggregates:
        Boolean(supports?.aggregates) || Boolean(supports?.aggregateOperations),
      isLoading: answer.isLoading,
      isFetching: answer.isFetching,
      isFetchingNextPage: frame.isFetchingNextPage,
      hasNextPage: frame.hasNextPage,
      error: answer.error,
      paginationMode: mode.value,
      fetchNextPage,
      refetch,
    };
  }, source.commit);
}

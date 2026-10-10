import {
  type ColumnMetadata,
  createServerSource,
  type FacetMap,
  type QueryAggregate,
  type QuerySupport,
  type TableQuery,
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

/** Request metadata supplied by the neutral server source. @public */
export interface TableQueryInfo {
  readonly signal: AbortSignal;
  readonly key: string;
}
/** The host performs the request and publishes its answer. @public */
export type TableQueryHandler = (
  query: TableQuery,
  info: TableQueryInfo
) => void | Promise<void>;

/** Inputs for the controlled server tier. @public */
export interface UseServerDataOptions<TRow>
  extends UseTableUrlStateOptions, SourceViewportOptions {
  readonly rows: MaybeRefOrGetter<readonly TRow[]>;
  readonly total: MaybeRefOrGetter<number>;
  readonly nextCursor?: MaybeRefOrGetterOptional<string | null>;
  readonly loading?: MaybeRefOrGetterOptional<boolean>;
  readonly error?: MaybeRefOrGetterOptional<Error | null>;
  readonly supports?: MaybeRefOrGetterOptional<QuerySupport>;
  readonly aggregates?: MaybeRefOrGetterOptional<readonly QueryAggregate[]>;
  readonly columns?: MaybeRefOrGetterOptional<readonly ColumnMetadata<TRow>[]>;
  /** Attributes aggregate metadata. The host must discard late aborted replies. */
  readonly responseKey?: MaybeRefOrGetterOptional<string>;
  readonly expandedIds?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly facetKeys?: MaybeRefOrGetterOptional<readonly string[]>;
  readonly facets?: MaybeRefOrGetterOptional<FacetMap>;
  readonly onQueryChange?: TableQueryHandler;
}

/** A shallow, readonly server-source snapshot. @public */
export type ServerDataState<TRow> = Readonly<ShallowRef<TableSource<TRow>>>;

/**
 * Adapt the neutral server tier, retaining its abort, cursor, append and
 * aggregate rules. Requests start after mount, stop on deactivation/unmount,
 * and resume against current inputs. The host always owns its returned rows.
 * @public
 */
export function useServerData<TRow>(
  input: MaybeRefOrGetter<UseServerDataOptions<TRow>>
): ServerDataState<TRow> {
  requireScope("useServerData");
  const options = computed(() => toValue(input));
  const { state, ...actions } = useTableUrlState(options);
  const mode = useSourceMode(options);
  const active = useScopeActivity();
  const source = createServerSource<TRow>();
  const revision = useExternalStore({
    getSnapshot: source.revision,
    subscribe: source.subscribe,
  });
  const fetchNextPage = (): void => {
    if (active.value) source.fetchNextPage();
  };
  const refetch = (): Promise<unknown> | void => {
    if (active.value) return source.refetch();
  };
  return useSourceSnapshot(
    (): TableSource<TRow> => {
      toValue(revision);
      const value = options.value;
      const view = state.value;
      const supports = toValue(value.supports);
      const aggregates = toValue(value.aggregates);
      const loading = toValue(value.loading) ?? false;
      const error = toValue(value.error) ?? null;
      const total = toValue(value.total);
      const frame = source.update(
        {
          rows: toValue(value.rows),
          total,
          nextCursor: toValue(value.nextCursor),
          loading,
          error,
          paginationMode: mode.value,
          supports,
          aggregates,
          columns: toValue(value.columns),
          responseKey: toValue(value.responseKey),
          expandedIds: toValue(value.expandedIds),
          facetKeys: toValue(value.facetKeys),
          onQueryChange: value.onQueryChange,
        },
        { ...view, setPage: actions.setPage }
      );
      return {
        ...view,
        ...actions,
        rows: frame.rows,
        total,
        groupAggregations: frame.groupAggregations,
        queryAggregates: aggregates,
        aggregateOperations: supports?.aggregateOperations,
        honorsAggregates:
          Boolean(supports?.aggregates) ||
          Boolean(supports?.aggregateOperations),
        facets: toValue(value.facets),
        isLoading: frame.isLoading,
        isFetching: loading,
        isFetchingNextPage: frame.isFetchingNextPage,
        hasNextPage: frame.hasNextPage,
        error,
        paginationMode: mode.value,
        setPage: source.setPage,
        fetchNextPage,
        refetch,
      };
    },
    source.commit,
    source.dispose
  );
}

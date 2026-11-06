import {
  type ColumnMetadata,
  createFrontendSourceWith,
  type ExtraFilters,
  type FrontendEngineFactory,
  type QueryFilterGroup,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
import { createBasicTableEngine } from "@adapttable/core/engine";
import { computed, type MaybeRefOrGetter, type ShallowRef, toValue } from "vue";

import {
  type MaybeRefOrGetterOptional,
  requireScope,
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
import {
  type CachedSnapshot,
  cachedSnapshot,
  sourceViewKey,
} from "./sourceRefresh";

/** Inputs for the frontend source. Callback functions are never getters. @public */
export interface UseFrontendDataOptions<TRow>
  extends UseTableUrlStateOptions, SourceViewportOptions {
  readonly data: MaybeRefOrGetter<readonly TRow[]>;
  readonly columns?: MaybeRefOrGetterOptional<readonly ColumnMetadata<TRow>[]>;
  readonly getRowId?: (row: TRow) => string;
  readonly getSearchText?: (row: TRow) => string;
  readonly getSortValue?: (row: TRow, columnKey: string) => SortableValue;
  readonly filterFn?: (row: TRow, extra: ExtraFilters) => boolean;
  readonly filterTreeFn?: (row: TRow, tree: QueryFilterGroup) => boolean;
  readonly filterKey?: MaybeRefOrGetterOptional<string | number>;
  readonly locale?: MaybeRefOrGetterOptional<string>;
  readonly error?: MaybeRefOrGetterOptional<Error | null>;
  readonly refetch?: () => Promise<unknown> | void;
  readonly isFetching?: MaybeRefOrGetterOptional<boolean>;
  readonly isLoading?: MaybeRefOrGetterOptional<boolean>;
  /**
   * Evaluator for this table's engine. Defaults to the basic one. Grouping
   * passes the full evaluator. This is a factory, not a getter: pass a new
   * options object when it changes.
   */
  readonly createEngine?: FrontendEngineFactory<TRow>;
}

/** A shallow, readonly source snapshot over the host-owned array. @public */
export type FrontendDataState<TRow> = Readonly<ShallowRef<TableSource<TRow>>>;

/**
 * Search, filter, sort and page through the neutral frontend engine.
 * Pass a whole-options getter to replace callbacks; callback fields themselves
 * are ordinary callbacks, including zero-argument refetch.
 *
 * The basic evaluator filters, sorts, and searches. A grouping feature
 * supplies the full evaluator, which is what the grouping projection reads.
 * Replacing that evaluator discards the pending candidate and replays the
 * view onto the new engine. The snapshot publishes only while this scope is
 * active.
 * @public
 */
export function useFrontendData<TRow>(
  input: MaybeRefOrGetter<UseFrontendDataOptions<TRow>>
): FrontendDataState<TRow> {
  requireScope("useFrontendData");
  const options = computed(() => toValue(input));
  const { state, ...actions } = useTableUrlState(options);
  const mode = useSourceMode(options);
  const active = useScopeActivity();
  const factoryOf = (): FrontendEngineFactory<TRow> =>
    options.value.createEngine ?? createBasicTableEngine;
  const source = createFrontendSourceWith(factoryOf());
  const fetchNextPage = (): void => {
    if (!active.value) return;
    const current = snapshot.value;
    if (current.hasNextPage) actions.setPage(current.page + 1);
  };
  const refetch = (): Promise<unknown> | void => {
    if (active.value) return options.value.refetch?.();
  };
  const held = { current: null as CachedSnapshot<TableSource<TRow>> | null };
  const snapshot = useSourceSnapshot(
    (): TableSource<TRow> => {
      const value = options.value;
      const view = state.value;
      const data = toValue(value.data);
      const columns = toValue(value.columns);
      const filterKey = toValue(value.filterKey);
      const locale = toValue(value.locale);
      const factory = factoryOf();
      const isLoading = toValue(value.isLoading) ?? false;
      const isFetching = toValue(value.isFetching) ?? false;
      const error = toValue(value.error) ?? null;
      const nextRefetch = value.refetch ? refetch : undefined;
      const frame = cachedSnapshot(
        held,
        [
          data,
          columns,
          value.getRowId,
          value.getSearchText,
          value.getSortValue,
          value.filterFn,
          value.filterTreeFn,
          filterKey,
          locale,
          mode.value,
          factory,
        ],
        sourceViewKey(view),
        () => {
          // Synchronous so grouping, which reads this snapshot, sees the
          // evaluator it asked for. The snapshot publishes only from the
          // live scope.
          if (source.engineFactory !== factory) source.replaceEngine(factory);
          const frame = source.update(
            {
              data,
              columns,
              getRowId: value.getRowId,
              getSearchText: value.getSearchText,
              getSortValue: value.getSortValue,
              filterFn: value.filterFn,
              filterTreeFn: value.filterTreeFn,
              filterKey,
              locale,
              paginationMode: mode.value,
            },
            view
          );
          return {
            ...view,
            ...actions,
            rows: frame.rows,
            allFilteredRows: frame.allFilteredRows,
            allSearchedRows: frame.allSearchedRows,
            total: frame.total,
            page: frame.page,
            hasNextPage: frame.hasNextPage,
            fetchNextPage,
            isLoading,
            isFetching,
            isFetchingNextPage: false,
            error,
            refetch: nextRefetch,
            paginationMode: mode.value,
            tableEngine: source.engine,
          };
        }
      );
      if (
        frame.isLoading === isLoading &&
        frame.isFetching === isFetching &&
        frame.error === error &&
        frame.refetch === nextRefetch
      ) {
        return frame;
      }
      const published = {
        ...frame,
        isLoading,
        isFetching,
        error,
        refetch: nextRefetch,
      };
      if (held.current) held.current = { ...held.current, snapshot: published };
      return published;
    },
    () => {
      if (active.value && source.engineFactory === factoryOf()) source.commit();
    }
  );
  return snapshot;
}

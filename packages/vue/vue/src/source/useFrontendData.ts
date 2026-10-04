import {
  type ColumnMetadata,
  createFrontendSource,
  type ExtraFilters,
  type QueryFilterGroup,
  type SortableValue,
  type TableSource,
} from "@adapttable/core";
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
}

/** A shallow, readonly source snapshot over the host-owned array. @public */
export type FrontendDataState<TRow> = Readonly<ShallowRef<TableSource<TRow>>>;

/**
 * Search, filter, sort and page through the neutral frontend engine.
 * Pass a whole-options getter to replace callbacks; callback fields themselves
 * are ordinary callbacks, including zero-argument refetch.
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
  const source = createFrontendSource<TRow>();
  const fetchNextPage = (): void => {
    if (!active.value) return;
    const current = snapshot.value;
    if (current.hasNextPage) actions.setPage(current.page + 1);
  };
  const refetch = (): Promise<unknown> | void => {
    if (active.value) return options.value.refetch?.();
  };
  const snapshot = useSourceSnapshot((): TableSource<TRow> => {
    const value = options.value;
    const view = state.value;
    const frame = source.update(
      {
        data: toValue(value.data),
        columns: toValue(value.columns),
        getRowId: value.getRowId,
        getSearchText: value.getSearchText,
        getSortValue: value.getSortValue,
        filterFn: value.filterFn,
        filterTreeFn: value.filterTreeFn,
        filterKey: toValue(value.filterKey),
        locale: toValue(value.locale),
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
      isLoading: toValue(value.isLoading) ?? false,
      isFetching: toValue(value.isFetching) ?? false,
      isFetchingNextPage: false,
      error: toValue(value.error) ?? null,
      refetch: value.refetch ? refetch : undefined,
      paginationMode: mode.value,
      tableEngine: source.engine,
    };
  }, source.commit);
  return snapshot;
}

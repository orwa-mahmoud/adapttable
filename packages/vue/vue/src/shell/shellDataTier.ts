/**
 * The table's data tier: the declarative-filter runtime, then a supplied
 * source, the host's server page, or the table's own rows, with facets
 * counted over what the active tier searched.
 */
import {
  type ExtraFilters,
  type FrontendEngineFactory,
  type QueryFilterGroup,
  type TableSource,
  type UrlStateAdapter,
} from "@adapttable/core";
import {
  createTableData,
  type FeatureHostState,
  INACTIVE_TIER_ROWS,
  type TableStore,
  tierRows,
} from "@adapttable/core/binding";
import {
  computed,
  type ComputedRef,
  onScopeDispose,
  type ShallowRef,
  toValue,
  watch,
} from "vue";

import { flattenColumns } from "../columnDef";
import { type ComposedFeature } from "../features/tableFeature";
import { createFilterOptionCache } from "../layout/filterOptionCache";
import { frontendRowModelOf } from "../source/rowModel";
import { useFrontendData } from "../source/useFrontendData";
import type { ResolvedTableOptions } from "./shellContract";

/**
 * Resolve the active data tier and the filter runtime it filters with. The
 * active tier owns the URL; an inactive one keeps private state.
 *
 * @param resolved - The resolved table options.
 * @param declarations - The composed features.
 * @param registered - The table's feature host.
 * @param supplied - A source the host supplied, if any.
 * @param urlAdapter - The table's URL backend.
 * @param isMobile - Whether the viewport is a phone's.
 * @returns The filter runtime and the table's source.
 */
export function useShellDataTier<TRow>(
  resolved: ComputedRef<ResolvedTableOptions<TRow>>,
  declarations: ComputedRef<readonly ComposedFeature<TRow>[]>,
  registered: ShallowRef<FeatureHostState<TRow>>,
  supplied: ComputedRef<TableSource<TRow> | undefined>,
  urlAdapter: ComputedRef<UrlStateAdapter>,
  isMobile: Readonly<ShallowRef<boolean>>,
  tableStore: TableStore
) {
  const filterOptionCache = createFilterOptionCache<TRow>();
  const filterRuntime = computed(() => {
    const engine = resolved.value.filterEngine;
    if (!engine) {
      filterOptionCache.clear();
      return undefined;
    }
    const columns = flattenColumns(toValue(resolved.value.columns)).leaves;
    const definitions = resolved.value.filters ?? [];
    return engine.buildRuntime({
      columns,
      declaredFilters: definitions,
      locale: toValue(resolved.value.locale),
      data:
        supplied.value?.allFilteredRows ?? toValue(resolved.value.data) ?? [],
      loadedOptions: {},
      filterTypes: resolved.value.filterTypes,
      featureHost: registered.value,
      optionCache: filterOptionCache.reconcile(columns, definitions),
    });
  });
  const filterRows = (row: TRow, extra: ExtraFilters): boolean =>
    (filterRuntime.value?.filterFn(row, extra) ?? true) &&
    (resolved.value.filterFn?.(row, extra) ?? true);
  const filterTree = (row: TRow, tree: QueryFilterGroup): boolean => {
    const filters = filterRuntime.value;
    const keep = filters
      ? (resolved.value.filterEngine?.evaluateTree(
          tree,
          row,
          filters.defs,
          filters.registry
        ) ?? true)
      : true;
    return keep && (resolved.value.filterTreeFn?.(row, tree) ?? true);
  };
  // The data tier: a supplied source (a server source among them), else the
  // table's own rows. While a source serves the table the frontend tier
  // keeps private state.
  const dataController = createTableData<TRow>();
  onScopeDispose(dataController.dispose);
  const tier = computed(
    () =>
      dataController.plan({
        engine: undefined,
        source: supplied.value,
        data: toValue(resolved.value.data),
        onViewChange: resolved.value.onViewChange,
        columns: [],
      }).tier
  );
  const onFrontend = computed(() => tier.value === "frontend");
  let columnSource: unknown;
  let columnLeaves: ReturnType<typeof flattenColumns<TRow>>["leaves"] = [];
  const tierColumns = (live: boolean) => {
    if (!live) return INACTIVE_TIER_ROWS;
    const input = toValue(resolved.value.columns);
    if (input === columnSource) return columnLeaves;
    columnSource = input;
    columnLeaves = input ? flattenColumns(input).leaves : [];
    return columnLeaves;
  };
  const frontend = useFrontendData(() => ({
    ...resolved.value,
    store: tableStore,
    forceMobile: isMobile,
    data: tierRows(onFrontend.value, toValue(resolved.value.data)),
    columns: tierColumns(onFrontend.value),
    getRowId: resolved.value.rowKey,
    urlAdapter: onFrontend.value ? urlAdapter : undefined,
    urlSync: onFrontend.value,
    filterFn: filterRuntime.value ? filterRows : resolved.value.filterFn,
    filterTreeFn: filterRuntime.value
      ? filterTree
      : resolved.value.filterTreeFn,
    filterKey: filterRuntime.value
      ? `${String(filterRuntime.value.filterKey)}:${String(toValue(resolved.value.filterKey) ?? "")}`
      : resolved.value.filterKey,
    arrayExtraKeys: [
      ...(toValue(resolved.value.arrayExtraKeys) ?? []),
      ...(filterRuntime.value?.arrayExtraKeys ?? []),
    ],
    numberExtraKeys: [
      ...(toValue(resolved.value.numberExtraKeys) ?? []),
      ...(filterRuntime.value?.numberExtraKeys ?? []),
    ],
    createEngine: frontendRowModelOf(declarations.value) as
      FrontendEngineFactory<TRow> | undefined,
  }));
  // Once the frame is on screen, a frontend table's onViewChange hears
  // about a change; the mount is not one.
  const tierSource = computed(() =>
    dataController.finish({
      resolved: supplied.value ?? frontend.value,
      frontend: frontend.value,
    })
  );
  watch(tierSource, dataController.commit, { flush: "post" });
  const source = computed(() => {
    const raw = tierSource.value;
    const filters = filterRuntime.value;
    const engine = resolved.value.filterEngine;
    if (!filters || !engine || supplied.value || !raw.allSearchedRows)
      return raw;
    return {
      ...raw,
      facets: engine.computeFacets(
        filters.defs,
        raw.allSearchedRows,
        raw.extra,
        filterRows,
        filters.registry
      ),
    };
  });
  return { filterRuntime, source };
}

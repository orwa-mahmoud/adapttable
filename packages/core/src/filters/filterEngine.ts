/**
 * The filter-tree / facet / registry engine.
 *
 * Lives on `@adapttable/<kit>/filters`. The DataTable root never imports
 * this module — only the filters feature's provider does.
 */
import type { ColumnMetadata } from "../columnModel";
import {
  applyFilterExtends,
  type FeatureHostState,
} from "../features/currentHost";
import type { QueryFilterGroup } from "../source/queryContract";
import type { ExtraFilters } from "../types";
import { computeFilterFacets, type FacetMap } from "./facets";
import { resolveFilterRegistry } from "./filterBuiltins";
import {
  buildFilterRuntime,
  type FilterDef,
  type FilterRuntime,
  materializeAutoOptions,
  resolveFilterDefs,
} from "./filterDefs";
import type { FilterTypeRegistry, FilterTypeSpec } from "./filterRegistry";
import { evaluateFilterTree } from "./filterTree";

/**
 * Functions the lean data hook calls only when filters are composed.
 *
 * @public
 */
export interface FilterEngine {
  buildRuntime<TRow>(input: {
    columns: readonly ColumnMetadata<TRow>[];
    declaredFilters: readonly FilterDef<TRow>[] | undefined;
    locale: string | undefined;
    data: readonly TRow[];
    loadedOptions: Record<string, readonly { value: string; label: string }[]>;
    filterTypes: readonly FilterTypeSpec[] | undefined;
    featureHost: FeatureHostState | undefined;
    optionCache: Map<
      string,
      () => Promise<readonly { value: string; label: string }[]>
    >;
  }): FilterRuntime<TRow>;
  evaluateTree<TRow>(
    tree: QueryFilterGroup,
    row: TRow,
    defs: readonly FilterDef<TRow>[],
    registry: FilterTypeRegistry
  ): boolean;
  computeFacets<TRow>(
    defs: readonly FilterDef<TRow>[],
    rows: readonly TRow[],
    extra: ExtraFilters,
    keep: (row: TRow, extra: ExtraFilters) => boolean,
    registry: FilterTypeRegistry
  ): FacetMap;
}

/**
 * The real engine. Imported only from the filters feature.
 *
 * @public
 */
export const FILTER_ENGINE_IMPL: FilterEngine = {
  buildRuntime({
    columns,
    declaredFilters,
    locale,
    data,
    loadedOptions,
    filterTypes,
    featureHost,
    optionCache,
  }) {
    const materialized = materializeAutoOptions(
      resolveFilterDefs(columns, declaredFilters, locale),
      data
    );
    const withAsync = materialized.map((def) => {
      if (typeof def.options !== "function") return def;
      const loaded = loadedOptions[def.key];
      if (loaded) return { ...def, options: loaded };
      let cached = optionCache.get(def.key);
      if (!cached) {
        const original = def.options;
        let inFlight: Promise<
          readonly { value: string; label: string }[]
        > | null = null;
        cached = () => (inFlight ??= original());
        optionCache.set(def.key, cached);
      }
      return { ...def, options: cached };
    });
    return buildFilterRuntime(
      withAsync,
      applyFilterExtends(resolveFilterRegistry(filterTypes), featureHost)
    );
  },
  evaluateTree: evaluateFilterTree,
  computeFacets: computeFilterFacets,
};
